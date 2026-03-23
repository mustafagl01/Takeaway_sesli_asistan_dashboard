import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { createSubscription, createUser, deleteUser, getUserByEmail, getUserById } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { sendCustomerInviteEmail } from '@/lib/mailer';
import {
  buildPresetPlanName,
  derivePaygRatePence,
  describePresetRange,
  isPresetMinutesValid,
  PAYG_RATE_PENCE,
  PRESET_PACKAGE_DEFINITIONS,
  type PresetPackageKey,
} from '@/lib/pricing';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

type AdminAction = 'add_minutes' | 'assign_package' | 'create_customer' | 'cancel_package' | 'delete_customer';
type PackageMode = 'preset' | 'custom';

interface AdminPackageInput {
  planName: string;
  totalMinutes: number;
  ratePence: number;
  paygRatePence: number;
  status: 'active' | 'pay_as_you_go';
  summary: string;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function generatePassword(): string {
  const special = '!@#$%^&*()_+-=';

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const raw = crypto.randomBytes(18).toString('base64url');
    const candidate = `Aa1!${raw}${special[attempt % special.length]}`;
    const validation = validatePasswordStrength(candidate);
    if (validation.valid) {
      return candidate.slice(0, 28);
    }
  }

  return `Temp${Date.now()}!Aa1`;
}

function makeFarFutureIsoDate() {
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 10);
  return endDate.toISOString();
}

async function recordBillingEvent(userId: string, eventType: string, description: string, amountPence = 0) {
  await sql`
    INSERT INTO billing_events (id, business_id, event_type, amount_pence, description, created_at)
    VALUES (
      ${`be_${eventType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
      ${userId},
      ${eventType},
      ${amountPence},
      ${description},
      ${new Date().toISOString()}
    )
  `;
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parsePackageConfig(input: unknown): { data?: AdminPackageInput; error?: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Package configuration is required' };
  }

  const packageConfig = input as Record<string, unknown>;
  const mode = packageConfig.mode;
  if (mode !== 'preset' && mode !== 'custom') {
    return { error: 'Package mode must be preset or custom' };
  }

  if (mode === 'preset') {
    const presetKey = packageConfig.presetKey;
    if (typeof presetKey !== 'string' || !(presetKey in PRESET_PACKAGE_DEFINITIONS)) {
      return { error: 'Invalid preset package selected' };
    }

    const typedPresetKey = presetKey as PresetPackageKey;
    const preset = PRESET_PACKAGE_DEFINITIONS[typedPresetKey];

    if (preset.isPayg) {
      return {
        data: {
          planName: preset.planName,
          totalMinutes: 0,
          ratePence: preset.ratePence,
          paygRatePence: preset.ratePence,
          status: 'pay_as_you_go',
          summary: `${preset.label} - ${preset.ratePence}p/dk`,
        },
      };
    }

    const minutes = parsePositiveInteger(packageConfig.minutes);
    if (minutes == null || !isPresetMinutesValid(typedPresetKey, minutes)) {
      return {
        error: `${preset.label} paketi icin dakika araligi ${describePresetRange(typedPresetKey)} olmali`,
      };
    }

    return {
      data: {
        planName: buildPresetPlanName(typedPresetKey, minutes),
        totalMinutes: minutes,
        ratePence: preset.ratePence,
        paygRatePence: derivePaygRatePence(preset.ratePence),
        status: 'active',
        summary: `${preset.label} - ${minutes} dk - ${preset.ratePence}p/dk`,
      },
    };
  }

  const planName = typeof packageConfig.planName === 'string' ? packageConfig.planName.trim() : '';
  if (!planName) {
    return { error: 'Custom package name is required' };
  }

  const totalMinutes = parsePositiveInteger(packageConfig.totalMinutes);
  if (totalMinutes == null) {
    return { error: 'Custom package minutes must be a positive whole number' };
  }

  const ratePence = parsePositiveInteger(packageConfig.ratePence);
  if (ratePence == null) {
    return { error: 'Custom package rate must be a positive whole number' };
  }

  const paygRatePence = derivePaygRatePence(ratePence);
  return {
    data: {
      planName,
      totalMinutes,
      ratePence,
      paygRatePence,
      status: 'active',
      summary: `${planName} - ${totalMinutes} dk - ${ratePence}p/dk (PAYG ${paygRatePence}p/dk)`,
    },
  };
}

async function assignPackageToUser(userId: string, packageConfig: unknown) {
  const parsed = parsePackageConfig(packageConfig);
  if (!parsed.data) {
    return { success: false, error: parsed.error || 'Invalid package configuration' };
  }

  const now = new Date().toISOString();
  const subscriptionId = `sub_manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const createResult = await createSubscription({
    id: subscriptionId,
    user_id: userId,
    plan_name: parsed.data.planName,
    total_minutes: parsed.data.totalMinutes,
    rate_pence: parsed.data.ratePence,
    payg_rate_pence: parsed.data.paygRatePence,
    start_date: now,
    end_date: makeFarFutureIsoDate(),
    status: parsed.data.status,
  });

  if (!createResult.success) {
    return { success: false, error: createResult.error || 'Failed to assign package' };
  }

  await recordBillingEvent(
    userId,
    'admin_package_assigned',
    `Admin tarafindan manuel paket atandi: ${parsed.data.summary}`
  );

  return {
    success: true,
    data: createResult.data,
    packageSummary: parsed.data.summary,
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return unauthorizedResponse();
  }

  try {
    const { rows } = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at as user_created_at,
        s.id as subscription_id,
        s.plan_name,
        s.total_minutes,
        s.rate_pence,
        s.payg_rate_pence,
        s.status as sub_status,
        s.start_date,
        s.alert_sent_at,
        COALESCE(
          (
            SELECT ROUND(SUM(c.duration)::numeric / 60000, 3)
            FROM calls c
            WHERE c.user_id = u.id
              AND c.call_date >= COALESCE(s.start_date, '2000-01-01')
          ), 0
        )::numeric as used_minutes,
        COALESCE(
          (SELECT COUNT(*) FROM calls c WHERE c.user_id = u.id), 0
        )::int as total_calls
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions
        WHERE user_id = u.id
          AND status IN ('active', 'pay_as_you_go')
        ORDER BY created_at DESC LIMIT 1
      ) s ON true
      ORDER BY u.created_at DESC
    `;

    const customers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.user_created_at,
      subscription: row.subscription_id ? {
        id: row.subscription_id,
        plan_name: row.plan_name,
        total_minutes: Number(row.total_minutes || 0),
        used_minutes: Number(row.used_minutes || 0),
        remaining_minutes: Math.max(0, Number(row.total_minutes || 0) - Number(row.used_minutes || 0)),
        rate_pence: Number(row.rate_pence || 0),
        payg_rate_pence: row.payg_rate_pence != null ? Number(row.payg_rate_pence) : null,
        status: row.sub_status,
        start_date: row.start_date,
        percent_used: Number(row.total_minutes || 0) > 0
          ? Math.min(100, Math.round((Number(row.used_minutes || 0) / Number(row.total_minutes || 0)) * 100))
          : 0,
      } : null,
      total_calls: row.total_calls,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error('Admin customers API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as AdminAction | undefined;

    if (action === 'add_minutes') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      const minutes = parsePositiveInteger(body.minutes);

      if (!userId || minutes == null) {
        return NextResponse.json({ error: 'userId and minutes are required' }, { status: 400 });
      }

      const { rows } = await sql`
        SELECT * FROM subscriptions
        WHERE user_id = ${userId} AND status IN ('active', 'pay_as_you_go')
        ORDER BY created_at DESC LIMIT 1
      `;

      if (rows.length > 0) {
        await sql`
          UPDATE subscriptions
          SET total_minutes = total_minutes + ${minutes},
              status = 'active'
          WHERE id = ${rows[0].id}
        `;
      } else {
        const now = new Date().toISOString();
        const packageRate = PAYG_RATE_PENCE;
        const paygRate = derivePaygRatePence(packageRate);

        await createSubscription({
          id: `sub_manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: userId,
          plan_name: 'Manuel Ekleme',
          total_minutes: minutes,
          rate_pence: packageRate,
          payg_rate_pence: paygRate,
          start_date: now,
          end_date: makeFarFutureIsoDate(),
        });
      }

      await recordBillingEvent(userId, 'admin_minutes_added', `Admin tarafindan ${minutes} dakika eklendi`);
      return NextResponse.json({ success: true, message: `${minutes} dakika eklendi.` });
    }

    if (action === 'cancel_package') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const { rowCount } = await sql`
        UPDATE subscriptions
        SET status = 'expired'
        WHERE user_id = ${userId}
          AND status IN ('active', 'pay_as_you_go')
      `;

      if (!rowCount) {
        return NextResponse.json({ error: 'Active package not found' }, { status: 404 });
      }

      await recordBillingEvent(userId, 'admin_package_cancelled', 'Admin tarafindan aktif paket/PAYG iptal edildi');
      return NextResponse.json({ success: true, message: `${user.name} icin aktif paket iptal edildi.` });
    }

    if (action === 'assign_package') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const result = await assignPackageToUser(userId, body.packageConfig);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${user.name} icin paket atandi.`,
        data: { packageSummary: result.packageSummary },
      });
    }

    if (action === 'delete_customer') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.email === session.user.email) {
        return NextResponse.json({ error: 'Kendi admin hesabini silemezsin' }, { status: 400 });
      }

      await recordBillingEvent(userId, 'admin_customer_deleted', `Admin tarafindan musteri hesabi silindi: ${user.email}`);

      const deleteResult = await deleteUser(userId);
      if (!deleteResult.success) {
        return NextResponse.json({ error: deleteResult.error || 'Failed to delete customer' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `${user.email} silindi.` });
    }

    if (action === 'create_customer') {
      const email = normalizeEmail(body.email);
      const name = typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : (email.split('@')[0] || 'User');

      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      const password = generatePassword();
      const hashResult = await hashPassword(password);
      if (!hashResult.success || !hashResult.hash) {
        return NextResponse.json({ error: hashResult.error || 'Failed to hash password' }, { status: 500 });
      }

      const userId = crypto.randomUUID();
      const createResult = await createUser({
        id: userId,
        email,
        password_hash: hashResult.hash,
        name,
      });

      if (!createResult.success || !createResult.data) {
        return NextResponse.json({ error: createResult.error || 'Failed to create customer' }, { status: 500 });
      }

      let packageSummary: string | null = null;
      const shouldAssignPackage = !!body.packageConfig;

      if (shouldAssignPackage) {
        const packageResult = await assignPackageToUser(userId, body.packageConfig);
        if (!packageResult.success) {
          await deleteUser(userId);
          return NextResponse.json({ error: packageResult.error || 'Failed to assign initial package' }, { status: 400 });
        }

        packageSummary = packageResult.packageSummary || null;
      }

      await recordBillingEvent(
        userId,
        'admin_customer_created',
        `Admin tarafindan musteri hesabi acildi${packageSummary ? ` ve ${packageSummary} tanimlandi` : ''}`
      );

      const delivery = await sendCustomerInviteEmail({
        email,
        name,
        password,
        loginUrl: `${req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://www.mglsystems.uk'}/login`,
        packageSummary,
      });

      await recordBillingEvent(
        userId,
        delivery.sent ? 'admin_invite_email_sent' : 'admin_invite_email_failed',
        delivery.sent
          ? 'Admin olusturdugu giris bilgileri SMTP ile gonderildi'
          : `SMTP gonderimi basarisiz oldu: ${delivery.error || 'Unknown error'}`
      );

      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        data: {
          customer: {
            id: userId,
            email,
            name,
          },
          credentials: {
            email,
            password,
          },
          emailDelivery: delivery,
          packageSummary,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
