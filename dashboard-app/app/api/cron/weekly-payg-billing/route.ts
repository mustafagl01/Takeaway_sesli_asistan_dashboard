import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';
import { PAYG_RATE_PENCE } from '@/lib/pricing';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

type PaygUserRow = {
  id: string;
  user_id: string;
  payg_rate_pence: number | null;
  rate_pence: number | null;
  start_date: string;
  payg_billed_until: string | null;
  email: string;
  name: string;
  stripe_customer_id: string | null;
  stripe_default_payment_method_id: string | null;
  auto_payg_enabled: boolean;
};

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const nowISO = now.toISOString();

    const { rows: paygUsers } = await sql<PaygUserRow>`
      SELECT
        s.*,
        u.email,
        u.name,
        u.stripe_customer_id,
        u.stripe_default_payment_method_id,
        u.auto_payg_enabled
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pay_as_you_go'
    `;

    const results = [];

    for (const sub of paygUsers) {
      const chargeFrom = sub.payg_billed_until || sub.start_date;

      const { rows: usageRows } = await sql<{ total_ms: number; call_count: number }>`
        SELECT
          COALESCE(SUM(duration), 0)::bigint as total_ms,
          COUNT(*)::int as call_count
        FROM calls
        WHERE user_id = ${sub.user_id}
          AND call_date > ${chargeFrom}
          AND call_date <= ${nowISO}
      `;

      const totalMs = usageRows[0]?.total_ms || 0;
      const callCount = usageRows[0]?.call_count || 0;

      if (totalMs === 0) {
        results.push({ user: sub.email, status: 'no_usage', calls: 0 });
        continue;
      }

      const totalMinutes = parseFloat((totalMs / 60000).toFixed(3));
      const ratePence = sub.payg_rate_pence || sub.rate_pence || PAYG_RATE_PENCE;
      const totalPence = Math.round(totalMinutes * ratePence);
      const totalPounds = (totalPence / 100).toFixed(2);

      if (totalPence < 30) {
        results.push({
          user: sub.email,
          status: 'carried_forward',
          minutes: totalMinutes,
          amount_pence: totalPence,
          calls: callCount,
        });
        continue;
      }

      const canAutoCharge = !!(
        sub.auto_payg_enabled &&
        sub.stripe_customer_id &&
        sub.stripe_default_payment_method_id
      );

      if (canAutoCharge) {
        try {
          const idempotencyKey = crypto
            .createHash('sha256')
            .update(`${sub.id}|${chargeFrom}|${sub.stripe_default_payment_method_id}|${nowISO.slice(0, 10)}`)
            .digest('hex');
          const paymentIntent = await getStripe().paymentIntents.create(
            {
              amount: totalPence,
              currency: 'gbp',
              customer: sub.stripe_customer_id!,
              payment_method: sub.stripe_default_payment_method_id!,
              confirm: true,
              off_session: true,
              description: `Weekly PAYG usage for ${sub.email}: ${totalMinutes.toFixed(2)} dk`,
              metadata: {
                userId: sub.user_id,
                periodStart: chargeFrom,
                periodEnd: nowISO,
                type: 'weekly_payg',
              },
            },
            { idempotencyKey }
          );

          await sql`
            INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
            VALUES (
              ${'be_payg_charge_' + sub.user_id + '_' + Date.now()},
              ${sub.user_id},
              'payg_weekly_charge_succeeded',
              ${totalPence},
              ${`Haftalik PAYG otomatik tahsilat basarili: ${totalMinutes.toFixed(2)} dk x ${ratePence}p = GBP ${totalPounds} (${callCount} arama). PaymentIntent: ${paymentIntent.id}`},
              ${nowISO}
            )
          `;

          await sql`
            UPDATE subscriptions
            SET payg_billed_until = ${nowISO}
            WHERE id = ${sub.id}
          `;

          results.push({
            user: sub.email,
            status: 'charged',
            minutes: totalMinutes,
            amount_pence: totalPence,
            calls: callCount,
          });
          continue;
        } catch (error: any) {
          await sql`
            INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
            VALUES (
              ${'be_payg_charge_failed_' + sub.user_id + '_' + Date.now()},
              ${sub.user_id},
              'payg_weekly_charge_failed',
              ${totalPence},
              ${`Haftalik PAYG tahsilati basarisiz: ${totalMinutes.toFixed(2)} dk x ${ratePence}p = GBP ${totalPounds}. Hata: ${error.message || 'Unknown error'}`},
              ${nowISO}
            )
          `;

          results.push({
            user: sub.email,
            status: 'charge_failed',
            amount_pence: totalPence,
            calls: callCount,
          });
          continue;
        }
      }

      await sql`
        INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
        VALUES (
          ${'be_payg_invoice_' + sub.user_id + '_' + Date.now()},
          ${sub.user_id},
          'payg_payment_method_required',
          ${totalPence},
          ${`PAYG tahsilati bekliyor; gecerli odeme yontemi gerekli: ${totalMinutes.toFixed(2)} dk x ${ratePence}p = GBP ${totalPounds} (${callCount} arama)`},
          ${nowISO}
        )
      `;

      results.push({
        user: sub.email,
        status: 'payment_method_required',
        minutes: totalMinutes,
        amount_pence: totalPence,
        calls: callCount,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      periodEnd: nowISO,
    });
  } catch (error: any) {
    console.error('Weekly PAYG billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
