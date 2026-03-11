import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSubscription } from '@/lib/db';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

// Stripe webhook handler - processes successful payments and activates subscriptions
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata?.type === 'prepaid_minutes' && metadata.userId && metadata.minutes) {
      const minutes = parseInt(metadata.minutes);
      const tier = metadata.tier || 'Custom';
      const ratePence = minutes > 800 ? 14 : minutes > 400 ? 16 : 18;
      const now = new Date().toISOString();

      // Set end_date far in the future (no expiry for prepaid minutes)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10);

      try {
        await createSubscription({
          id: `sub_${session.id}`,
          user_id: metadata.userId,
          plan_name: `${tier} Paket (${minutes} dk)`,
          total_minutes: minutes,
          rate_pence: ratePence,
          start_date: now,
          end_date: endDate.toISOString(),
        });

        // Log billing event
        await sql`
          INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
          VALUES (
            ${'be_' + Date.now()},
            ${metadata.userId},
            'package_purchased',
            ${session.amount_total || 0},
            ${`${minutes} dakika ${tier} paket satın alındı`},
            ${now}
          )
        `;

        console.log(`✅ Subscription created for user ${metadata.userId}: ${minutes} minutes`);
      } catch (err) {
        console.error('Failed to create subscription after payment:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
