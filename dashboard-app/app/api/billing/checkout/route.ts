import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Lazy Stripe initialization – avoids build-time crash when env vars are absent
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
        _stripe = new Stripe(key);
    }
    return _stripe;
}

/**
 * Calculates the price based on input minutes and tiers.
 * Tiers (Matching PricingSlider.tsx):
 * - 200-400: 18p/min (Small)
 * - 401-800: 16p/min (Medium)
 * - 801+:    14p/min (Pro)
 *
 * @param minutes - Number of minutes selected
 * @returns Total price in pennies (integer)
 */
function calculatePriceInPennies(minutes: number): number {
    let rate = 0.18;
    if (minutes > 800) {
        rate = 0.14;
    } else if (minutes > 400) {
        rate = 0.16;
    } else {
        rate = 0.18;
    }

    // Calculate total, convert to pennies and handle rounding
    return Math.round(minutes * rate * 100);
}

/**
 * Determines the tier name based on minute count
 */
function getTierName(minutes: number): string {
    if (minutes > 800) return 'Pro';
    if (minutes > 400) return 'Medium';
    return 'Small';
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        // 1. Authentication Check
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse and Validate Body
        const body = await req.json();
        const { minutes } = body;

        if (!minutes || typeof minutes !== 'number' || minutes < 200) {
            return NextResponse.json({ error: 'Geçersiz dakika miktarı. En az 200 dakika seçilmelidir.' }, { status: 400 });
        }

        // 3. Check Stripe Configuration
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Missing STRIPE_SECRET_KEY in environment');
            return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
        }

        // 4. Calculate Total Price
        const totalPennies = calculatePriceInPennies(minutes);
        const tierName = getTierName(minutes);
        const rateP = minutes > 800 ? 14 : minutes > 400 ? 16 : 18;

        // 5. Create Stripe Checkout Session (one-time payment for prepaid minutes)
        const checkoutSession = await getStripe().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Sesli Asistan Paketi (${minutes} Dakika)`,
                            description: `Bitene kadar geçerli ${minutes} dakika telefon görüşme kullanım hakkı.`,
                        },
                        unit_amount: totalPennies,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/dashboard/billing?canceled=true`,
            metadata: {
                userId: session.user.id,
                minutes: minutes.toString(),
                tier: tierName,
                type: 'prepaid_minutes',
            },
            customer_email: session.user.email || undefined,
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json(
            { error: error.message || 'Üzgünüz, ödeme oturumu oluşturulurken bir hata oluştu.' },
            { status: 500 }
        );
    }
}
