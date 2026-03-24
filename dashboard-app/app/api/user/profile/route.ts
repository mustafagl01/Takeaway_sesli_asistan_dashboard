import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, updateUser } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_PHONE_LENGTH = 32;

function normalizePhoneInput(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s().-]/g, '').trim();
  return normalized || null;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
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
      phone?: string | null;
    } = { name };

    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === '') {
        updates.phone = null;
      } else {
        const normalized = normalizePhoneInput(body.phone);
        if (!normalized) {
          updates.phone = null;
        } else if (normalized.length > MAX_PHONE_LENGTH) {
          return NextResponse.json(
            { success: false, error: `Phone number must be ${MAX_PHONE_LENGTH} characters or less` },
            { status: 400 }
          );
        } else if (!/^\+[1-9]\d{7,15}$/.test(normalized)) {
          return NextResponse.json(
            { success: false, error: 'Phone number must use international format, for example +447700900123' },
            { status: 400 }
          );
        } else {
          updates.phone = normalized;
        }
      }
    }

    const updateResult = await updateUser(session.user.id, updates);
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update profile' },
        { status: 500 }
      );
    }

    const nextUser = updateResult.data;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        phone: nextUser?.phone || '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
