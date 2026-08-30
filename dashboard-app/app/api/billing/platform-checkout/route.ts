import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, updateUser } from '@/lib/db';
import { getPlatformBillingState, isPlatformSubscriptionOpen } from '@/lib/platform-billing';
import {
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const platformState = await getPlatformBillingState(user.stripe_customer_id);
    if (isPlatformSubscriptionOpen(platformState.status)) {
      return NextResponse.json(
        { error: 'Aylik sistem aboneliginiz zaten mevcut. Fatura portalindan yonetebilirsiniz.' },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({})) as { includePrinter?: unknown };
    const includePrinter = body?.includePrinter !== false;

    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: session.user.email || undefined,
        name: user.name || undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;
      await updateUser(session.user.id, { stripe_customer_id: customer.id });
    }

    const monthlyPriceId = process.env.STRIPE_PLATFORM_MONTHLY_PRICE_ID;
    const printerPriceId = process.env.STRIPE_PRINTER_PRICE_ID;
    const monthlyLineItem: Stripe.Checkout.SessionCreateParams.LineItem = monthlyPriceId
      ? { price: monthlyPriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'gbp',
            unit_amount: PLATFORM_MONTHLY_FEE_PENCE,
            recurring: { interval: 'month' },
            product_data: {
              name: 'AloSiparis sistem aboneligi',
              description: 'Sesli siparis asistani, yonetim paneli ve sistem bakimi.',
            },
          },
          quantity: 1,
        };
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [monthlyLineItem];

    if (includePrinter) {
      lineItems.push(
        printerPriceId
          ? { price: printerPriceId, quantity: 1 }
          : {
              price_data: {
                currency: 'gbp',
                unit_amount: PRINTER_ONE_TIME_FEE_PENCE,
                product_data: {
                  name: 'Termal siparis yazicisi',
                  description: 'Kuruluma hazir termal yazici. Tek seferlik ucret.',
                },
              },
              quantity: 1,
            }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://www.mglsystems.uk';
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: lineItems,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/billing?platform_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?platform_canceled=true`,
      metadata: {
        type: 'platform_subscription',
        userId: session.user.id,
        includesPrinter: includePrinter ? 'true' : 'false',
      },
      subscription_data: {
        description: 'AloSiparis aylik sistem aboneligi',
        metadata: {
          type: 'platform_subscription',
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Platform checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Odeme oturumu olusturulamadi.' },
      { status: 500 }
    );
  }
}
