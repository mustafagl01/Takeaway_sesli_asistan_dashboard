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
} from '@/lib/pricing';

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

    const body = await req.json();
    const minutes = body?.minutes;

    if (!minutes || typeof minutes !== 'number' || minutes < 200) {
      return NextResponse.json(
        { error: 'Gecersiz dakika miktari. En az 200 dakika secilmelidir.' },
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
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      customer_email: session.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name:
                activationMode === 'queued'
                  ? `Siradaki Paket (${minutes} Dakika)`
                  : `Sesli Asistan Paketi (${minutes} Dakika)`,
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
