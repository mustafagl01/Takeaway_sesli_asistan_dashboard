import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

/**
 * POST /api/retell/webhook
 * 
 * Retell AI calls this endpoint when a call ends (call.ended event).
 * This handler:
 * 1. Records the call in the database
 * 2. Checks the caller's subscription minute balance
 * 3. Sends SMS alerts at 20% and 10% remaining
 * 4. Auto-switches to pay-as-you-go when minutes are depleted
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { event, call } = payload;

    // Only process call.ended events
    if (event !== 'call_ended' && event !== 'call.ended') {
      return NextResponse.json({ received: true });
    }

    if (!call?.call_id) {
      return NextResponse.json({ error: 'Missing call data' }, { status: 400 });
    }

    const durationMs = call.duration_ms || call.end_timestamp - call.start_timestamp || 0;
    const durationSeconds = Math.round(durationMs / 1000);
    // Seconds-precision billing: 2m1s = 2.017 dk, not 3 dk
    const durationMinutes = parseFloat((durationSeconds / 60).toFixed(3));

    // Find the user by their Retell API key or agent
    // Since Retell sends to our webhook, we need to identify the user
    // We'll match by looking up who owns this agent or use a header
    const retellApiKey = req.headers.get('x-retell-api-key') || '';
    
    // Find user by retell_api_key
    const { rows: userRows } = await sql`
      SELECT id FROM users WHERE retell_api_key = ${retellApiKey} LIMIT 1
    `;

    if (userRows.length === 0) {
      // If we can't identify the user, still acknowledge the webhook
      console.warn(`⚠️ Retell webhook: No user found for API key`);
      return NextResponse.json({ received: true, warning: 'User not found' });
    }

    const userId = userRows[0].id;

    // Get active subscription
    const { rows: subRows } = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} AND status IN ('active', 'pay_as_you_go')
      ORDER BY created_at DESC LIMIT 1
    `;

    const subscription = subRows[0] || null;
    let ratePence = 20; // Default PAYG rate
    let customerCostCents = 0;

    if (subscription) {
      ratePence = subscription.rate_pence || 20;
      customerCostCents = durationMinutes * ratePence;
    }

    // Cache the call
    const now = new Date().toISOString();
    const costCents = call.call_cost?.combined_cost != null 
      ? Math.round(call.call_cost.combined_cost) 
      : null;

    await sql`
      INSERT INTO calls (id, user_id, business_id, phone_number, duration, status, outcome, transcript, recording_url, call_cost_cents, customer_cost_cents, call_date, created_at)
      VALUES (
        ${call.call_id},
        ${userId},
        ${''},
        ${call.from_number || call.to_number || ''},
        ${durationMs},
        ${call.call_status || call.status || 'completed'},
        ${call.disconnection_reason || null},
        ${call.transcript || null},
        ${call.recording_url || null},
        ${costCents},
        ${customerCostCents},
        ${call.start_timestamp ? new Date(call.start_timestamp).toISOString() : now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        duration = EXCLUDED.duration,
        status = EXCLUDED.status,
        outcome = EXCLUDED.outcome,
        transcript = EXCLUDED.transcript,
        recording_url = EXCLUDED.recording_url,
        call_cost_cents = COALESCE(EXCLUDED.call_cost_cents, calls.call_cost_cents),
        customer_cost_cents = COALESCE(EXCLUDED.customer_cost_cents, calls.customer_cost_cents)
    `;

    // === MINUTE TRACKING & ALERTS ===
    if (subscription && subscription.status === 'active') {
      // Calculate total used minutes
      const { rows: usageRows } = await sql<{ sum: number }>`
        SELECT COALESCE(SUM(duration), 0)::bigint as sum 
        FROM calls 
        WHERE user_id = ${userId} 
        AND call_date >= ${subscription.start_date}
      `;

      const totalUsedMs = usageRows[0]?.sum || 0;
      // Seconds-precision: no rounding up
      const totalUsedMinutes = parseFloat((totalUsedMs / 60000).toFixed(3));
      const totalMinutes = subscription.total_minutes;
      const remainingMinutes = parseFloat(Math.max(0, totalMinutes - totalUsedMinutes).toFixed(3));
      const percentRemaining = (remainingMinutes / totalMinutes) * 100;

      // Check alert thresholds
      const lastAlertAt = subscription.alert_sent_at;
      const alertCooldownHours = 12; // Don't send more than 1 alert per 12 hours
      const canSendAlert = !lastAlertAt || 
        (Date.now() - new Date(lastAlertAt).getTime()) > alertCooldownHours * 60 * 60 * 1000;

      if (remainingMinutes <= 0) {
        // === MINUTES DEPLETED - SWITCH TO PAYG ===
        const paygRate = Math.round(ratePence * 1.3); // 30% premium for PAYG

        await sql`
          UPDATE subscriptions 
          SET status = 'pay_as_you_go', 
              rate_pence = ${paygRate}
          WHERE id = ${subscription.id}
        `;

        // Log billing event
        await sql`
          INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
          VALUES (
            ${'be_depleted_' + Date.now()},
            ${userId},
            'minutes_depleted',
            ${0},
            ${`${totalMinutes} dakikalık paket tükendi. Pay-as-you-go (${paygRate}p/dk) aktif.`},
            ${now}
          )
        `;

        // Send depletion alert SMS
        await sendAlert(
          userId,
          `🔴 Paketiniz tükendi! ${totalMinutes} dakikalık paketiniz bitti. Artık pay-as-you-go (${paygRate}p/dk) ile ücretlendirileceksiniz. Yeni paket almak için: https://www.mglsystems.uk/dashboard/billing`
        );

        await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;

      } else if (percentRemaining <= 10 && canSendAlert) {
        // === 10% REMAINING ALERT ===
        await sendAlert(
          userId,
          `⚠️ Son ${remainingMinutes} dakikanız kaldı! (${totalMinutes} dk paketinizin %${Math.round(percentRemaining)}'i). Paket bitince otomatik ücretlendirme başlar. Yeni paket: https://www.mglsystems.uk/dashboard/billing`
        );
        await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;

      } else if (percentRemaining <= 20 && percentRemaining > 10 && canSendAlert) {
        // === 20% REMAINING ALERT ===
        await sendAlert(
          userId,
          `📢 Paketinizin %${Math.round(percentRemaining)}'i kaldı (${remainingMinutes}/${totalMinutes} dk). Yeni paket almak için: https://www.mglsystems.uk/dashboard/billing`
        );
        await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;
      }
    }

    return NextResponse.json({ received: true, minutes_charged: durationMinutes });

  } catch (error: any) {
    console.error('Retell webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Send an alert to a user via SMS (using Twilio)
 * Falls back to logging if Twilio is not configured
 */
async function sendAlert(userId: string, message: string) {
  try {
    // Get user's phone/email for alert delivery
    const { rows } = await sql`SELECT email, name FROM users WHERE id = ${userId} LIMIT 1`;
    const user = rows[0];

    if (!user) {
      console.warn(`Cannot send alert: user ${userId} not found`);
      return;
    }

    // Log the alert as a billing event
    await sql`
      INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
      VALUES (
        ${'be_alert_' + Date.now()},
        ${userId},
        'alert_sent',
        ${0},
        ${message},
        ${new Date().toISOString()}
      )
    `;

    // TODO: Integrate Twilio SMS here when phone numbers are available
    // For now, the alert is logged in billing_events and visible in admin panel
    console.log(`📨 Alert for user ${userId} (${user.email}): ${message}`);

  } catch (err) {
    console.error('Failed to send alert:', err);
  }
}
