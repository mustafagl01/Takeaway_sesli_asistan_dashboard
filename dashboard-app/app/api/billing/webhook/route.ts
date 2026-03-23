import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSubscription, getActiveSubscription, updateUser } from '@/lib/db';
import { sql } from '@vercel/postgres';
import {
  buildPresetPlanName,
  calculatePackageRatePence,
  derivePaygRatePence,
  getBillingTierName,
} from '@/lib/pricing';

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

async function getPaymentMethodId(session: Stripe.Checkout.Session): Promise<string | null> {
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  if (!paymentIntentId) {
    return null;
  }

  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    if (typeof paymentIntent.payment_method === 'string') {
      return paymentIntent.payment_method;
    }
    return paymentIntent.payment_method?.id || null;
  } catch (error) {
    console.warn('Failed to retrieve Stripe payment method:', error);
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    console.error('Stripe webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata?.type === 'prepaid_minutes' && metadata.userId && metadata.minutes) {
      const minutes = Number.parseInt(metadata.minutes, 10);
      const tier = (metadata.tier as 'Small' | 'Medium' | 'Pro' | undefined) || getBillingTierName(minutes);
      const activationMode = metadata.activationMode === 'queued' ? 'queued' : 'immediate';
      const ratePence = calculatePackageRatePence(minutes);
      const paygRatePence = derivePaygRatePence(ratePence);
      const now = new Date().toISOString();
      const subscriptionId = `sub_${session.id}`;
      const billingEventId = `be_checkout_${session.id}`;

      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10);

      try {
        const { rows: existingSubscriptions } = await sql<{ id: string }>`
          SELECT id
          FROM subscriptions
          WHERE id = ${subscriptionId}
          LIMIT 1
        `;

        if (existingSubscriptions[0]) {
          console.log(`Stripe webhook duplicate ignored for session ${session.id}`);
          return NextResponse.json({ received: true, duplicate: true });
        }

        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
        const stripePaymentMethodId = await getPaymentMethodId(session);

        await updateUser(metadata.userId, {
          stripe_customer_id: stripeCustomerId,
          stripe_default_payment_method_id: stripePaymentMethodId,
          auto_payg_enabled: !!stripeCustomerId && !!stripePaymentMethodId,
        });

        const currentSubscription = await getActiveSubscription(metadata.userId);
        const shouldQueue =
          activationMode === 'queued' && currentSubscription?.status === 'active';

        const createResult = await createSubscription({
          id: subscriptionId,
          user_id: metadata.userId,
          plan_name: buildPresetPlanName(tier.toLowerCase() as 'small' | 'medium' | 'pro', minutes),
          total_minutes: minutes,
          rate_pence: ratePence,
          payg_rate_pence: paygRatePence,
          start_date: shouldQueue ? endDate.toISOString() : now,
          end_date: endDate.toISOString(),
          status: shouldQueue ? 'queued' : 'active',
          replaceCurrent: !shouldQueue,
        });

        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create subscription');
        }

        await sql`
          INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
          VALUES (
            ${billingEventId},
            ${metadata.userId},
            ${shouldQueue ? 'next_package_purchased' : 'package_purchased'},
            ${session.amount_total || 0},
            ${
              shouldQueue
                ? `${minutes} dakika ${tier} paket satin alindi ve siradaki paket olarak kuyruga alindi. Paket biterse kart kayitliysa otomatik 20p/dk PAYG acilabilir.`
                : `${minutes} dakika ${tier} paket satin alindi. Paket biterse kart kayitliysa otomatik 20p/dk PAYG acilabilir.`
            },
            ${now}
          )
          ON CONFLICT (id) DO NOTHING
        `;

        console.log(
          `Subscription created for user ${metadata.userId}: ${minutes} minutes (${shouldQueue ? 'queued' : 'active'})`
        );
      } catch (error) {
        console.error('Failed to create subscription after payment:', error);
        return NextResponse.json({ error: 'Failed to process checkout session' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
