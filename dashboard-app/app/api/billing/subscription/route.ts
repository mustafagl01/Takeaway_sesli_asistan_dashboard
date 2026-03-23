import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getActiveSubscription, getQueuedSubscription, getUserById } from '@/lib/db';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

async function getUsedMinutes(userId: string, startDate: string) {
  const { rows } = await sql<{ sum: number }>`
    SELECT COALESCE(SUM(duration), 0)::int as sum
    FROM calls
    WHERE user_id = ${userId}
      AND call_date >= ${startDate}
  `;

  return parseFloat(((rows[0]?.sum || 0) / 60000).toFixed(2));
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [subscription, queuedSubscription, user] = await Promise.all([
      getActiveSubscription(session.user.id),
      getQueuedSubscription(session.user.id),
      getUserById(session.user.id),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        queuedPackage: queuedSubscription,
        cardOnFile: !!(user.stripe_customer_id && user.stripe_default_payment_method_id),
        autoPaygEnabled: !!user.auto_payg_enabled,
      });
    }

    const usedMinutes = subscription.status === 'active'
      ? await getUsedMinutes(session.user.id, subscription.start_date)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...subscription,
        used_minutes: usedMinutes,
      },
      queuedPackage: queuedSubscription,
      cardOnFile: !!(user.stripe_customer_id && user.stripe_default_payment_method_id),
      autoPaygEnabled: !!user.auto_payg_enabled,
    });
  } catch (error: any) {
    console.error('Subscription API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Abonelik bilgileri alinamadi.' },
      { status: 500 }
    );
  }
}
