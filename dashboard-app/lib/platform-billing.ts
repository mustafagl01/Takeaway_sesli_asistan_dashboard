import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export interface PlatformBillingState {
  subscriptionId: string | null;
  status: Stripe.Subscription.Status | 'inactive';
  currentPeriodEnd: string | null;
}

const CLOSED_STATUSES = new Set<Stripe.Subscription.Status>(['canceled', 'incomplete_expired']);

export function isPlatformSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function isPlatformSubscriptionOpen(status: string | null | undefined): boolean {
  return !!status && status !== 'inactive' && !CLOSED_STATUSES.has(status as Stripe.Subscription.Status);
}

function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isFinite(value));
  return periodEnds.length ? new Date(Math.max(...periodEnds) * 1000).toISOString() : null;
}

export async function getPlatformBillingState(customerId: string | null): Promise<PlatformBillingState> {
  if (!customerId) {
    return { subscriptionId: null, status: 'inactive', currentPeriodEnd: null };
  }

  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });

  const platformSubscriptions = subscriptions.data
    .filter((subscription) => subscription.metadata?.type === 'platform_subscription')
    .sort((a, b) => b.created - a.created);
  const subscription = platformSubscriptions.find((item) => !CLOSED_STATUSES.has(item.status))
    || platformSubscriptions[0];

  if (!subscription) {
    return { subscriptionId: null, status: 'inactive', currentPeriodEnd: null };
  }

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: getPeriodEnd(subscription),
  };
}
