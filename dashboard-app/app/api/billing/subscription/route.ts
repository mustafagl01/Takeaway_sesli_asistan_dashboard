import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getActiveSubscription } from '@/lib/db';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await getActiveSubscription(session.user.id);

        if (!subscription) {
            return NextResponse.json({ success: true, data: null });
        }

        // Calculate used minutes in the current active period
        // We sum the duration of calls made after the subscription start date
        const { rows } = await sql<{ sum: number }>`
      SELECT COALESCE(SUM(duration), 0)::int as sum 
      FROM calls 
      WHERE user_id = ${session.user.id} 
      AND call_date >= ${subscription.start_date}
    `;

        // duration is in milliseconds, convert to minutes (seconds-precision, no rounding up)
        const usedMinutes = parseFloat(((rows[0]?.sum || 0) / 60000).toFixed(2));

        return NextResponse.json({
            success: true,
            data: {
                ...subscription,
                used_minutes: usedMinutes
            }
        });

    } catch (error: any) {
        console.error('Subscription API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Abonelik bilgileri alınamadı.' },
            { status: 500 }
        );
    }
}
