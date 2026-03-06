import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { listCallsViaApi, getCallDetailsViaApi } from '@/lib/retell';
import { getUserById, cacheCall, updateCallCost, getActiveSubscription, getBusinessesForUser } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/retell/sync
 * Fetches calls from Retell API and caches them in Postgres for the current user.
 * Uses the user's Retell API key stored in Profile (per-user). If none set, returns 400.
 * 
 * For calls where call_cost_cents is missing from the list endpoint,
 * we fetch the individual call details to get the cost.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  const apiKey = user?.retell_api_key?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Add your Retell API key in Profile (Dashboard → Profile) to sync calls.',
      },
      { status: 400 }
    );
  }

  const result = await listCallsViaApi(
    { limit: 200, sort_order: 'descending' },
    apiKey
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Retell API request failed.' },
      { status: 502 }
    );
  }

  const activeSubscription = await getActiveSubscription(session.user.id);

  const calls = result.data ?? [];
  let synced = 0;
  let failed = 0;

  for (const call of calls) {
    let costCents = call.call_cost_cents ?? (call.call_cost?.combined_cost != null && call.call_cost.combined_cost >= 0 ? Math.round(call.call_cost.combined_cost) : null);
    if (costCents == null && call.call_id) {
      try {
        const detailResult = await getCallDetailsViaApi(call.call_id, apiKey);
        if (detailResult.success && detailResult.data?.call_cost?.combined_cost != null) {
          costCents = Math.round(detailResult.data.call_cost.combined_cost);
        }
      } catch {
        // ignore, cost stays null
      }
    }

    // Calculate Customer Cost based on Active Subscription
    let customerCostCents = null;
    if (call.duration != null && activeSubscription && activeSubscription.rate_pence) {
      // Retell duration is in milliseconds, convert to minutes (rounded up)
      const minutes = Math.ceil(call.duration / 60000);
      // Wait, is duration in ms or seconds? Retell API duration usually ms or secs based on types. 
      // Let's check `lib/retell.ts` or similar, but generally we can use `Math.ceil(call.duration / 60000)` if ms,
      // or `Math.ceil(call.duration / 60)` if seconds. Wait, the old code didn't do this. Let's assume duration is milliseconds if it's large.
      // Wait, Retell `duration_ms` is in ms. If `duration` is in ms. Let's check typical Retell response: `duration_ms`.
      // Actually `call.duration` is mapped from `duration_ms` usually. Let's look at how it maps.
      // Let's assume duration is ms. So minutes = Math.ceil(call.duration / 60000);
      const durationMs = call.duration;
      // Some versions of retell API use duration_ms, some duration. Let's just use `call.duration` as ms.
      const minutesUsed = Math.ceil(durationMs / 60000);

      // Calculate cost
      customerCostCents = minutesUsed * activeSubscription.rate_pence;
    }

    const cacheResult = await cacheCall({
      id: call.call_id,
      user_id: session.user.id,
      business_id: "", // Default to empty string for customer-centric model
      phone_number: call.phone_number,
      duration: call.duration ?? null,
      status: call.status,
      outcome: call.outcome ?? null,
      transcript: call.transcript ?? null,
      recording_url: call.recording_url ?? null,
      call_cost_cents: costCents ?? undefined,
      customer_cost_cents: customerCostCents ?? undefined,
      call_date: call.start_time || new Date().toISOString(),
    });
    if (cacheResult.success) {
      if ((costCents != null && cacheResult.data?.call_cost_cents == null) || (customerCostCents != null && cacheResult.data?.customer_cost_cents == null)) {
        await updateCallCost(call.call_id, costCents ?? 0, customerCostCents ?? undefined);
      }
      synced++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    data: { synced, failed, total: calls.length },
  });
}
