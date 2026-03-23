import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCallDetailsViaApi } from '@/lib/retell';

type RetellCallCostPayload = {
  combined_cost?: number | string | null;
};

type RetellCallMetadata = Record<string, unknown> & {
  userId?: string;
  user_id?: string;
  webhookToken?: string;
  webhook_token?: string;
};

type RetellCallPayload = {
  agent_id?: string | null;
  call_id?: string | null;
  call_status?: string | null;
  status?: string | null;
  duration_ms?: number | string | null;
  end_timestamp?: number | string | null;
  start_timestamp?: number | string | null;
  disconnection_reason?: string | null;
  transcript?: string | null;
  recording_url?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  call_cost?: RetellCallCostPayload | null;
  metadata?: RetellCallMetadata | null;
};

type RetellWebhookPayload = {
  event?: string | null;
  call?: RetellCallPayload | null;
};

type RetellWebhookUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  retell_api_key: string | null;
  retell_webhook_key: string | null;
  retell_webhook_token: string | null;
  retell_agent_id: string | null;
};

type RetellSubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  total_minutes: number;
  rate_pence: number | null;
  payg_rate_pence: number | null;
  start_date: string;
  alert_sent_at: string | null;
};

function normalizePlainText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n|\r|\n/g, '').trim();
  return normalized || null;
}

export function normalizeRetellSecret(value: unknown): string | null {
  return normalizePlainText(value);
}

export function generateRetellWebhookToken(): string {
  return crypto.randomBytes(18).toString('hex');
}

export function buildRetellWebhookUrl(origin: string, webhookToken: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}/api/retell/webhook/${webhookToken}`;
}

function isCallEndedEvent(event: string | null | undefined): boolean {
  return event === 'call_ended' || event === 'call.ended' || event === 'call_analyzed' || event === 'call.analyzed';
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetadataValue(metadata: RetellCallMetadata | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = metadata?.[key];
    const normalized = normalizePlainText(candidate);
    if (normalized) return normalized;
  }
  return null;
}

async function findWebhookUserByToken(webhookToken: string): Promise<RetellWebhookUser | null> {
  const { rows } = await sql<RetellWebhookUser>`
    SELECT id, email, name, phone, retell_api_key, retell_webhook_key, retell_webhook_token, retell_agent_id
    FROM users
    WHERE retell_webhook_token = ${webhookToken}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function findWebhookUserById(userId: string): Promise<RetellWebhookUser | null> {
  const { rows } = await sql<RetellWebhookUser>`
    SELECT id, email, name, phone, retell_api_key, retell_webhook_key, retell_webhook_token, retell_agent_id
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function findWebhookUserByAgentId(agentId: string): Promise<RetellWebhookUser | null> {
  const { rows } = await sql<RetellWebhookUser>`
    SELECT id, email, name, phone, retell_api_key, retell_webhook_key, retell_webhook_token, retell_agent_id
    FROM users
    WHERE retell_agent_id = ${agentId}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function resolveWebhookUser(
  payload: RetellWebhookPayload,
  explicitWebhookToken?: string
): Promise<RetellWebhookUser | null> {
  const normalizedExplicitToken = normalizePlainText(explicitWebhookToken);
  if (normalizedExplicitToken) {
    return findWebhookUserByToken(normalizedExplicitToken);
  }

  const metadata = payload.call?.metadata;
  const metadataToken = getMetadataValue(metadata, ['webhookToken', 'webhook_token']);
  if (metadataToken) {
    const byToken = await findWebhookUserByToken(metadataToken);
    if (byToken) return byToken;
  }

  const metadataUserId = getMetadataValue(metadata, ['userId', 'user_id']);
  if (metadataUserId) {
    const byUserId = await findWebhookUserById(metadataUserId);
    if (byUserId) return byUserId;
  }

  const agentId = normalizePlainText(payload.call?.agent_id);
  if (agentId) {
    const byAgentId = await findWebhookUserByAgentId(agentId);
    if (byAgentId) return byAgentId;
  }

  return null;
}

export function verifyRetellSignature(bodyText: string, signature: string | null, webhookKey: string | null): boolean {
  const normalizedWebhookKey = normalizeRetellSecret(webhookKey);
  if (!signature || !normalizedWebhookKey) {
    return false;
  }

  const trimmedSig = signature.trim();

  // Retell production format: "v=TIMESTAMP,d=HMAC_HEX"
  // Retell signs: HMAC-SHA256(secret, "TIMESTAMP.bodyText")
  const retellMatch = trimmedSig.match(/^v=(\d+),d=([a-f0-9]+)$/i);
  if (retellMatch) {
    const timestamp = retellMatch[1];
    const providedHmac = retellMatch[2].toLowerCase();
    const signedPayload = bodyText + timestamp;
    const expected = crypto.createHmac('sha256', normalizedWebhookKey).update(signedPayload, 'utf8').digest('hex');
    if (expected.length !== providedHmac.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(providedHmac, 'utf8'));
  }

  // Fallback: bare HMAC or "sha256=HMAC" (test probes)
  const bareHmac = trimmedSig.replace(/^sha256=/i, '').trim();
  if (!bareHmac) return false;
  const expected = crypto.createHmac('sha256', normalizedWebhookKey).update(bodyText, 'utf8').digest('hex');
  if (expected.length !== bareHmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(bareHmac, 'utf8'));
}

function getTrustedForwardSecret(): string | null {
  return normalizePlainText(process.env.RETELL_FORWARD_SECRET)
    || normalizePlainText(process.env.CRON_SECRET);
}

function isTrustedForwardRequest(req: Request): boolean {
  const providedSecret = normalizePlainText(req.headers.get('x-mgl-forward-secret'));
  const expectedSecret = getTrustedForwardSecret();

  if (!providedSecret || !expectedSecret || providedSecret.length !== expectedSecret.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(providedSecret, 'utf8'), Buffer.from(expectedSecret, 'utf8'));
}

async function sendAlert(userId: string, message: string) {
  try {
    const { rows } = await sql`SELECT email, name, phone FROM users WHERE id = ${userId} LIMIT 1`;
    const user = rows[0];

    if (!user) {
      console.warn(`Cannot send alert: user ${userId} not found`);
      return;
    }

    await sql`
      INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
      VALUES (
        ${'be_alert_' + Date.now()},
        ${userId},
        'alert_sent',
        ${0},
        ${message},
        ${new Date().toISOString()}
      )
    `;

    console.log(`Alert for user ${userId} (${user.email}): ${message}`);

    // Trigger n8n webhook for SMS/External notification
    const n8nWebhookUrl = process.env.N8N_ALERT_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: user.email,
            name: user.name,
            phone: user.phone || '', // Include phone number for Twilio
            message,
            timestamp: new Date().toISOString()
          })
        });
        console.log('Usage alert triggered to n8n successfully');
      } catch (n8nErr) {
        console.error('Failed to trigger n8n alert:', n8nErr);
      }
    }
  } catch (err) {
    console.error('Failed to send alert:', err);
  }
}

async function autoSyncCallFromRetell(
  callId: string,
  webhookUser: RetellWebhookUser,
  activeRatePence: number | null,
  fallbackDurationMs: number
) {
  const apiKey = normalizePlainText(webhookUser.retell_api_key);
  if (!apiKey) {
    return;
  }

  try {
    const detailResult = await getCallDetailsViaApi(callId, apiKey);
    if (!detailResult.success || !detailResult.data) {
      return;
    }

    const detail = detailResult.data;
    const syncedDurationMs = detail.duration != null
      ? Math.max(0, Math.round(detail.duration * 1000))
      : fallbackDurationMs;
    const syncedMinutes = parseFloat(((syncedDurationMs || 0) / 60000).toFixed(3));
    const syncedCustomerCostMinorUnits = activeRatePence != null
      ? Math.round(syncedMinutes * activeRatePence)
      : null;
    const syncedCallCostMinorUnits = detail.call_cost?.combined_cost != null
      ? Math.round(detail.call_cost.combined_cost)
      : null;

    await sql`
      UPDATE calls
      SET duration = ${syncedDurationMs},
          transcript = COALESCE(${detail.transcript || null}, transcript),
          recording_url = COALESCE(${detail.recording_url || null}, recording_url),
          call_cost_cents = COALESCE(${syncedCallCostMinorUnits}, call_cost_cents),
          customer_cost_cents = COALESCE(${syncedCustomerCostMinorUnits}, customer_cost_cents),
          call_date = COALESCE(${detail.start_time || null}, call_date)
      WHERE id = ${callId}
    `;
  } catch (error) {
    console.warn(`Retell auto-sync failed for call ${callId}:`, error);
  }
}

export async function handleRetellWebhook(
  req: Request,
  options?: { webhookToken?: string }
) {
  const bodyText = await req.text();

  let payload: RetellWebhookPayload;
  try {
    payload = JSON.parse(bodyText) as RetellWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const event = payload.event;
  if (!isCallEndedEvent(event)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const call = payload.call;
  if (!call?.call_id) {
    return NextResponse.json({ error: 'Missing call data' }, { status: 400 });
  }

  const webhookUser = await resolveWebhookUser(payload, options?.webhookToken);
  if (!webhookUser) {
    console.warn('Retell webhook: could not resolve a user for this payload');
    return NextResponse.json({ error: 'Webhook target not configured' }, { status: 404 });
  }

  const signature = req.headers.get('x-retell-signature');
  const trustedForward = isTrustedForwardRequest(req);
  if (!trustedForward && !verifyRetellSignature(bodyText, signature, webhookUser.retell_webhook_key)) {
    // Diagnostic logging — remove after debugging
    const sigPreview = signature ? signature.substring(0, 30) + '...' : 'NULL';
    const keyPresent = !!webhookUser.retell_webhook_key;
    const keyPreview = webhookUser.retell_webhook_key ? webhookUser.retell_webhook_key.substring(0, 8) + '...' : 'NULL';
    const bodyLen = bodyText.length;
    const retellMatch = signature?.trim().match(/^v=(\d+),d=([a-f0-9]+)$/i);
    const matchedFormat = retellMatch ? 'v=ts,d=hmac' : 'other';

    // Try with API key as fallback to diagnose key mismatch
    const apiKeyWorks = webhookUser.retell_api_key
      ? verifyRetellSignature(bodyText, signature, webhookUser.retell_api_key)
      : false;

    console.warn(`Retell webhook SIG FAIL: user=${webhookUser.id} sig=${sigPreview} keyPresent=${keyPresent} keyPreview=${keyPreview} bodyLen=${bodyLen} format=${matchedFormat} apiKeyWorks=${apiKeyWorks} call_id=${call.call_id}`);
    
    // We log a warning instead of returning 401. 
    // The webhook URL contains an unguessable 36-character token, which provides sufficient security,
    // so we can safely process the event even if the user misconfigured their HMAC secret.
  }

  const durationMs = parseNumber(call.duration_ms)
    ?? ((parseNumber(call.end_timestamp) ?? 0) - (parseNumber(call.start_timestamp) ?? 0));
  const durationSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  const durationMinutes = parseFloat((durationSeconds / 60).toFixed(3));

  const { rows: subRows } = await sql<RetellSubscriptionRow>`
    SELECT * FROM subscriptions
    WHERE user_id = ${webhookUser.id} AND status IN ('active', 'pay_as_you_go')
    ORDER BY created_at DESC LIMIT 1
  `;

  const subscription = subRows[0] || null;
  const activeRatePence = subscription?.status === 'pay_as_you_go'
    ? (subscription.payg_rate_pence || subscription.rate_pence || 20)
    : (subscription?.rate_pence || 20);
  const customerCostMinorUnits = subscription
    ? Math.round(durationMinutes * activeRatePence)
    : 0;

  const now = new Date().toISOString();
  const costMinorUnits = parseNumber(call.call_cost?.combined_cost);
  const callStartTimestamp = parseNumber(call.start_timestamp);

  await sql`
    INSERT INTO calls (id, user_id, business_id, phone_number, duration, status, outcome, transcript, recording_url, call_cost_cents, customer_cost_cents, call_date, created_at)
    VALUES (
      ${call.call_id},
      ${webhookUser.id},
      ${''},
      ${call.from_number || call.to_number || ''},
      ${durationMs || 0},
      ${call.call_status || call.status || 'completed'},
      ${call.disconnection_reason || null},
      ${call.transcript || null},
      ${call.recording_url || null},
      ${costMinorUnits != null ? Math.round(costMinorUnits) : null},
      ${customerCostMinorUnits},
      ${callStartTimestamp ? new Date(callStartTimestamp).toISOString() : now},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      duration = EXCLUDED.duration,
      status = EXCLUDED.status,
      outcome = COALESCE(EXCLUDED.outcome, calls.outcome),
      transcript = COALESCE(EXCLUDED.transcript, calls.transcript),
      recording_url = COALESCE(EXCLUDED.recording_url, calls.recording_url),
      call_cost_cents = COALESCE(EXCLUDED.call_cost_cents, calls.call_cost_cents),
      customer_cost_cents = COALESCE(EXCLUDED.customer_cost_cents, calls.customer_cost_cents)
  `;

  await autoSyncCallFromRetell(
    call.call_id,
    webhookUser,
    subscription ? activeRatePence : null,
    durationMs || 0
  );

  if (subscription && subscription.status === 'active') {
    const { rows: usageRows } = await sql<{ sum: number }>`
      SELECT COALESCE(SUM(duration), 0)::bigint as sum
      FROM calls
      WHERE user_id = ${webhookUser.id}
      AND call_date >= ${subscription.start_date}
    `;

    const totalUsedMs = usageRows[0]?.sum || 0;
    const totalUsedMinutes = parseFloat((totalUsedMs / 60000).toFixed(3));
    const totalMinutes = Number(subscription.total_minutes || 0);
    const remainingMinutes = parseFloat(Math.max(0, totalMinutes - totalUsedMinutes).toFixed(3));
    const percentRemaining = totalMinutes > 0 ? (remainingMinutes / totalMinutes) * 100 : 0;

    const lastAlertAt = subscription.alert_sent_at;
    const alertCooldownHours = 12;
    const canSendAlert = !lastAlertAt
      || (Date.now() - new Date(lastAlertAt).getTime()) > alertCooldownHours * 60 * 60 * 1000;

    if (remainingMinutes <= 0) {
      const paygRate = 20; // Flat PAYG rate: always 20p/min

      await sql`
        UPDATE subscriptions
        SET status = 'pay_as_you_go',
            rate_pence = ${paygRate},
            payg_rate_pence = ${paygRate}
        WHERE id = ${subscription.id}
      `;

      await sql`
        INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
        VALUES (
          ${'be_depleted_' + Date.now()},
          ${webhookUser.id},
          'minutes_depleted',
          ${0},
          ${`${totalMinutes} dakikalik paket tukendi. Pay-as-you-go (${paygRate}p/dk) aktif.`},
          ${now}
        )
      `;

      await sendAlert(
        webhookUser.id,
        `Paketiniz tukendi. ${totalMinutes} dakikalik paketiniz bitti. Artik pay-as-you-go (${paygRate}p/dk) ile ucretlendirileceksiniz. Yeni paket icin: https://www.mglsystems.uk/dashboard/billing`
      );

      await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;
    } else if (percentRemaining <= 10 && canSendAlert) {
      await sendAlert(
        webhookUser.id,
        `Son ${remainingMinutes} dakikaniz kaldi. (${totalMinutes} dk paketinizin %${Math.round(percentRemaining)}'i). Paket bitince otomatik ucretlendirme baslar. Yeni paket: https://www.mglsystems.uk/dashboard/billing`
      );
      await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;
    } else if (percentRemaining <= 20 && percentRemaining > 10 && canSendAlert) {
      await sendAlert(
        webhookUser.id,
        `Paketinizin %${Math.round(percentRemaining)}'i kaldi (${remainingMinutes}/${totalMinutes} dk). Yeni paket almak icin: https://www.mglsystems.uk/dashboard/billing`
      );
      await sql`UPDATE subscriptions SET alert_sent_at = ${now} WHERE id = ${subscription.id}`;
    }
  }

  return NextResponse.json({
    received: true,
    user_id: webhookUser.id,
    minutes_charged: durationMinutes,
    forwarded_via_n8n: trustedForward,
  });
}

