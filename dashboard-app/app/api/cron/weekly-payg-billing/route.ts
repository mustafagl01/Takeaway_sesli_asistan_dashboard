import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

/**
 * GET /api/cron/weekly-payg-billing
 *
 * Runs every Sunday and records weekly PAYG invoices.
 * The actual Stripe invoice creation is still a TODO.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();
    const nowISO = now.toISOString();

    const { rows: paygUsers } = await sql`
      SELECT s.*, u.email, u.name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pay_as_you_go'
    `;

    const results = [];

    for (const sub of paygUsers) {
      const { rows: usageRows } = await sql<{ total_ms: number; call_count: number }>`
        SELECT
          COALESCE(SUM(duration), 0)::bigint as total_ms,
          COUNT(*)::int as call_count
        FROM calls
        WHERE user_id = ${sub.user_id}
          AND call_date >= ${weekAgoISO}
          AND call_date <= ${nowISO}
      `;

      const totalMs = usageRows[0]?.total_ms || 0;
      const callCount = usageRows[0]?.call_count || 0;

      if (totalMs === 0) {
        results.push({ user: sub.email, status: 'no_usage', calls: 0 });
        continue;
      }

      const totalMinutes = parseFloat((totalMs / 60000).toFixed(3));
      const ratePence = sub.payg_rate_pence || sub.rate_pence || 20;
      const totalPence = Math.round(totalMinutes * ratePence);
      const totalPounds = (totalPence / 100).toFixed(2);

      await sql`
        INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
        VALUES (
          ${'be_payg_' + sub.user_id + '_' + Date.now()},
          ${sub.user_id},
          'payg_weekly_invoice',
          ${totalPence},
          ${`Haftalik PAYG faturasi: ${totalMinutes.toFixed(2)} dk x ${ratePence}p = GBP ${totalPounds} (${callCount} arama)`},
          ${nowISO}
        )
      `;

      results.push({
        user: sub.email,
        status: 'invoiced',
        minutes: totalMinutes,
        amount_pence: totalPence,
        calls: callCount,
      });

      console.log(`PAYG weekly invoice for ${sub.email}: GBP ${totalPounds} (${totalMinutes.toFixed(2)} dk, ${callCount} arama)`);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      period: { from: weekAgoISO, to: nowISO },
    });
  } catch (error: any) {
    console.error('Weekly PAYG billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
