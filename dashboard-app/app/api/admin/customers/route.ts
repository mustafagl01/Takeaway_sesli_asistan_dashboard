import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

const ADMIN_EMAILS = ['mustafagl01@gmail.com', 'mgldigitalmedia2024@gmail.com'];

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { rows } = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at as user_created_at,
        s.id as subscription_id,
        s.plan_name,
        s.total_minutes,
        s.rate_pence,
        s.payg_rate_pence,
        s.status as sub_status,
        s.start_date,
        s.alert_sent_at,
        COALESCE(
          (
            SELECT ROUND(SUM(c.duration)::numeric / 60000, 3)
            FROM calls c
            WHERE c.user_id = u.id
              AND c.call_date >= COALESCE(s.start_date, '2000-01-01')
          ), 0
        )::numeric as used_minutes,
        COALESCE(
          (SELECT COUNT(*) FROM calls c WHERE c.user_id = u.id), 0
        )::int as total_calls
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions
        WHERE user_id = u.id
          AND status IN ('active', 'pay_as_you_go')
        ORDER BY created_at DESC LIMIT 1
      ) s ON true
      ORDER BY u.created_at DESC
    `;

    const customers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.user_created_at,
      subscription: row.subscription_id ? {
        id: row.subscription_id,
        plan_name: row.plan_name,
        total_minutes: Number(row.total_minutes || 0),
        used_minutes: Number(row.used_minutes || 0),
        remaining_minutes: Math.max(0, Number(row.total_minutes || 0) - Number(row.used_minutes || 0)),
        rate_pence: Number(row.rate_pence || 0),
        payg_rate_pence: row.payg_rate_pence != null ? Number(row.payg_rate_pence) : null,
        status: row.sub_status,
        start_date: row.start_date,
        percent_used: Number(row.total_minutes || 0) > 0
          ? Math.min(100, Math.round((Number(row.used_minutes || 0) / Number(row.total_minutes || 0)) * 100))
          : 0,
      } : null,
      total_calls: row.total_calls,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error('Admin customers API error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, minutes, action } = body;

    if (action === 'add_minutes' && userId && minutes > 0) {
      const { rows } = await sql`
        SELECT * FROM subscriptions
        WHERE user_id = ${userId} AND status IN ('active', 'pay_as_you_go')
        ORDER BY created_at DESC LIMIT 1
      `;

      if (rows.length > 0) {
        await sql`
          UPDATE subscriptions
          SET total_minutes = total_minutes + ${minutes},
              status = 'active'
          WHERE id = ${rows[0].id}
        `;
      } else {
        const now = new Date().toISOString();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 10);
        const packageRate = 20;
        const paygRate = Math.max(20, Math.round(packageRate * 1.3));

        await sql`
          INSERT INTO subscriptions (
            id,
            user_id,
            plan_name,
            total_minutes,
            rate_pence,
            payg_rate_pence,
            start_date,
            end_date,
            status,
            created_at
          )
          VALUES (
            ${'sub_manual_' + Date.now()},
            ${userId},
            ${'Manuel Ekleme'},
            ${minutes},
            ${packageRate},
            ${paygRate},
            ${now},
            ${endDate.toISOString()},
            'active',
            ${now}
          )
        `;
      }

      await sql`
        INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
        VALUES (
          ${'be_manual_' + Date.now()},
          ${userId},
          'manual_add',
          ${0},
          ${`Admin tarafindan ${minutes} dakika eklendi`},
          ${new Date().toISOString()}
        )
      `;

      return NextResponse.json({ success: true, message: `${minutes} dakika eklendi.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
