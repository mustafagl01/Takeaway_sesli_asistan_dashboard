import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById } from '@/lib/db';

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
    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'Stripe musteri kaydi bulunamadi.' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://www.mglsystems.uk';
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fatura portali acilamadi.' },
      { status: 500 }
    );
  }
}
