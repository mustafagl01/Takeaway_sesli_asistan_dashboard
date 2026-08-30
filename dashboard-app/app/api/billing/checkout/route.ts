import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import Stripe from 'stripe';
import {
  getActiveSubscription,
  getQueuedSubscription,
  getUserById,
  updateUser,
} from '@/lib/db';
import {
  calculatePackagePriceInPennies,
  calculatePackageRatePence,
  getBillingTierName,
  isCreditPackageMinutes,
} from '@/lib/pricing';
import {
  getPlatformBillingState,
  isPlatformSubscriptionActive,
} from '@/lib/platform-billing';

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

function getCreditPriceId(minutes: number): string | undefined {
  if (minutes === 500) return process.env.STRIPE_CREDIT_500_PRICE_ID;
  if (minutes === 1_000) return process.env.STRIPE_CREDIT_1000_PRICE_ID;
  if (minutes === 2_000) return process.env.STRIPE_CREDIT_2000_PRICE_ID;
  return undefined;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { minutes?: unknown };
    const minutes = body?.minutes;

    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || !isCreditPackageMinutes(minutes)) {
      return NextResponse.json(
        { error: 'Gecersiz kontor paketi. 500, 1.000 veya 2.000 dakika secin.' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const platformState = await getPlatformBillingState(user.stripe_customer_id);
    if (!isPlatformSubscriptionActive(platformState.status)) {
      return NextResponse.json(
        { error: 'Kontor satin almadan once aylik £9.90 sistem aboneligini aktif edin.' },
        { status: 403 }
      );
    }

    const [activeSubscription, queuedSubscription] = await Promise.all([
      getActiveSubscription(session.user.id),
      getQueuedSubscription(session.user.id),
    ]);

    if (queuedSubscription) {
      return NextResponse.json(
        { error: 'Sirada zaten bir sonraki paketiniz var. Once onu kullanin veya admin ile degistirin.' },
        { status: 400 }
      );
    }

    const totalPennies = calculatePackagePriceInPennies(minutes);
    const tierName = getBillingTierName(minutes);
    const ratePence = calculatePackageRatePence(minutes);
    const activationMode = activeSubscription?.status === 'active' ? 'queued' : 'immediate';

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

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://www.mglsystems.uk';
    const stablePriceId = getCreditPriceId(minutes);
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        stablePriceId ? {
          price: stablePriceId,
          quantity: 1,
        } : {
          price_data: {
            currency: 'gbp',
            product_data: {
              name:
                activationMode === 'queued'
                  ? `Siradaki Kontor (${minutes.toLocaleString('tr-TR')} Dakika)`
                  : `Sesli Asistan Kontoru (${minutes.toLocaleString('tr-TR')} Dakika)`,
              description:
                activationMode === 'queued'
                  ? `${minutes} dakikalik bu paket, aktif paketiniz bitince otomatik devreye girer.`
                  : `Bitene kadar gecerli ${minutes} dakika telefon gorusme kullanim hakki.`,
            },
            unit_amount: totalPennies,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      success_url: `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        minutes: minutes.toString(),
        tier: tierName,
        type: 'prepaid_minutes',
        activationMode,
        ratePence: ratePence.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Odeme oturumu olusturulurken bir hata olustu.' },
      { status: 500 }
    );
  }
}
