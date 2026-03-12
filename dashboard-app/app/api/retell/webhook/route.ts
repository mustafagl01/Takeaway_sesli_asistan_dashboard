import { handleRetellWebhook } from '@/lib/retell-webhook';

export const runtime = 'nodejs';

/**
 * Legacy Retell webhook endpoint.
 * Prefer /api/retell/webhook/[webhookToken] for customer-specific workspace routing.
 */
export async function POST(req: Request) {
  return handleRetellWebhook(req);
}
