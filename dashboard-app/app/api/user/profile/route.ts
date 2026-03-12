import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, updateUser } from '@/lib/db';
import { buildRetellWebhookUrl, generateRetellWebhookToken, normalizeRetellSecret } from '@/lib/retell-webhook';

export const runtime = 'nodejs';

const MAX_RETELL_KEY_LENGTH = 2048;
const MAX_RETELL_WEBHOOK_KEY_LENGTH = 2048;
const MAX_RETELL_AGENT_ID_LENGTH = 256;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const webhookUrl = user.retell_webhook_token
      ? buildRetellWebhookUrl(origin, user.retell_webhook_token)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        hasRetellKey: !!user.retell_api_key?.trim(),
        hasRetellWebhookKey: !!user.retell_webhook_key?.trim(),
        retellAgentId: user.retell_agent_id || '',
        webhookUrl,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Send valid JSON.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const name = body.name.trim();
    if (name.length > 100) {
      return NextResponse.json({ success: false, error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const updates: {
      name: string;
      retell_api_key?: string | null;
      retell_webhook_key?: string | null;
      retell_agent_id?: string | null;
      retell_webhook_token?: string | null;
    } = { name };

    if (body.retell_api_key !== undefined) {
      if (body.retell_api_key === null || body.retell_api_key === '') {
        updates.retell_api_key = null;
      } else if (typeof body.retell_api_key === 'string') {
        const raw = body.retell_api_key.replace(/\r\n|\r|\n/g, '').trim();
        if (raw.length > MAX_RETELL_KEY_LENGTH) {
          return NextResponse.json(
            { success: false, error: `Retell API key must be ${MAX_RETELL_KEY_LENGTH} characters or less` },
            { status: 400 }
          );
        }
        updates.retell_api_key = raw || null;
      } else {
        updates.retell_api_key = null;
      }
    }

    if (body.retell_webhook_key !== undefined) {
      if (body.retell_webhook_key === null || body.retell_webhook_key === '') {
        updates.retell_webhook_key = null;
      } else if (typeof body.retell_webhook_key === 'string') {
        const raw = normalizeRetellSecret(body.retell_webhook_key);
        if (raw && raw.length > MAX_RETELL_WEBHOOK_KEY_LENGTH) {
          return NextResponse.json(
            { success: false, error: `Retell webhook key must be ${MAX_RETELL_WEBHOOK_KEY_LENGTH} characters or less` },
            { status: 400 }
          );
        }
        updates.retell_webhook_key = raw || null;
      } else {
        updates.retell_webhook_key = null;
      }
    }

    if (body.retell_agent_id !== undefined) {
      if (body.retell_agent_id === null || body.retell_agent_id === '') {
        updates.retell_agent_id = null;
      } else if (typeof body.retell_agent_id === 'string') {
        const raw = body.retell_agent_id.replace(/\r\n|\r|\n/g, '').trim();
        if (raw.length > MAX_RETELL_AGENT_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: `Retell agent ID must be ${MAX_RETELL_AGENT_ID_LENGTH} characters or less` },
            { status: 400 }
          );
        }
        updates.retell_agent_id = raw || null;
      } else {
        updates.retell_agent_id = null;
      }
    }

    if (!user.retell_webhook_token) {
      updates.retell_webhook_token = generateRetellWebhookToken();
    }

    const updateResult = await updateUser(session.user.id, updates);
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update profile' },
        { status: 500 }
      );
    }

    const nextUser = updateResult.data;
    const webhookUrl = nextUser?.retell_webhook_token
      ? buildRetellWebhookUrl(request.nextUrl.origin, nextUser.retell_webhook_token)
      : null;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        hasRetellKey: !!nextUser?.retell_api_key,
        hasRetellWebhookKey: !!nextUser?.retell_webhook_key,
        retellAgentId: nextUser?.retell_agent_id || '',
        webhookUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
