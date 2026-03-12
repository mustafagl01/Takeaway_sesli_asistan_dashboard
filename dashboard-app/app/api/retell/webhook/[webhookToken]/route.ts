import { handleRetellWebhook } from '@/lib/retell-webhook';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ webhookToken: string }> }
) {
  const { webhookToken } = await params;
  return handleRetellWebhook(req, { webhookToken });
}
