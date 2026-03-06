/**
 * Vercel Postgres (Neon) Database Access Layer
 * UK Takeaway Phone Order Assistant Dashboard
 */

import { sql } from '@vercel/postgres';

// ============================================================================
// Type Definitions
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  image: string | null;
  google_id: string | null;
  apple_id: string | null;
  /** Per-user Retell API key for syncing that user's calls. Stored in DB, not env. */
  retell_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  retell_api_key: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  business_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  data: string;
  created_at: string;
}

export interface Call {
  id: string;
  user_id: string;
  business_id: string | null; // Linked to business
  phone_number: string;
  duration: number | null;
  status: string;
  outcome: string | null;
  transcript: string | null;
  recording_url: string | null;
  /** Cost in cents (from Retell), stored when user views call detail */
  call_cost_cents: number | null;
  /** Cost in cents charged to the customer based on their active plan */
  customer_cost_cents: number | null;
  call_date: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  total_minutes: number;
  rate_pence: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// User Queries
// ============================================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByEmail error:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByGoogleId error:', error);
    return null;
  }
}

export async function getUserByAppleId(appleId: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE apple_id = ${appleId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByAppleId error:', error);
    return null;
  }
}

export async function createUser(userData: {
  id: string;
  email: string;
  password_hash?: string | null;
  name: string;
  image?: string | null;
  google_id?: string | null;
  apple_id?: string | null;
}): Promise<DbResult<User>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<User>`
      INSERT INTO users (id, email, password_hash, name, image, google_id, apple_id, created_at, updated_at)
      VALUES (
        ${userData.id},
        ${userData.email},
        ${userData.password_hash || null},
        ${userData.name},
        ${userData.image || null},
        ${userData.google_id || null},
        ${userData.apple_id || null},
        ${now},
        ${now}
      )
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'image' | 'password_hash' | 'google_id' | 'apple_id' | 'retell_api_key'>>
): Promise<DbResult<User>> {
  try {
    const now = new Date().toISOString();
    const retellKeyValue = updates.retell_api_key !== undefined ? (updates.retell_api_key ?? null) : null;
    const { rows } = await sql<User>`
      UPDATE users SET
        name = COALESCE(${updates.name ?? null}, name),
        image = COALESCE(${updates.image ?? null}, image),
        password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
        google_id = COALESCE(${updates.google_id ?? null}, google_id),
        apple_id = COALESCE(${updates.apple_id ?? null}, apple_id),
        retell_api_key = COALESCE(${retellKeyValue}, (SELECT u.retell_api_key FROM users u WHERE u.id = ${id})),
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteUser(id: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Business Queries
// ============================================================================

export async function getBusinessById(id: string): Promise<Business | null> {
  try {
    const { rows } = await sql<Business>`SELECT * FROM businesses WHERE id = ${id} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getBusinessById error:', error);
    return null;
  }
}

export async function getBusinessesForUser(userId: string): Promise<DbResult<Business[]>> {
  try {
    const { rows } = await sql<Business>`
      SELECT b.* FROM businesses b
      JOIN business_members bm ON b.id = bm.business_id
      WHERE bm.user_id = ${userId}
      ORDER BY b.name ASC
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createBusiness(businessData: {
  id: string;
  name: string;
  retell_api_key?: string | null;
  logo_url?: string | null;
  owner_id: string;
}): Promise<DbResult<Business>> {
  try {
    const now = new Date().toISOString();
    // 1. Create the business
    const { rows } = await sql<Business>`
      INSERT INTO businesses (id, name, retell_api_key, logo_url, created_at, updated_at)
      VALUES (${businessData.id}, ${businessData.name}, ${businessData.retell_api_key || null}, ${businessData.logo_url || null}, ${now}, ${now})
      RETURNING *
    `;
    const business = rows[0];

    // 2. Add the owner to business_members
    await sql`
      INSERT INTO business_members (business_id, user_id, role, created_at)
      VALUES (${business.id}, ${businessData.owner_id}, 'admin', ${now})
    `;

    return { success: true, data: business };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateBusiness(
  id: string,
  updates: Partial<Pick<Business, 'name' | 'logo_url' | 'retell_api_key'>>
): Promise<DbResult<Business>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<Business>`
      UPDATE businesses SET
        name = COALESCE(${updates.name ?? null}, name),
        logo_url = COALESCE(${updates.logo_url ?? null}, logo_url),
        retell_api_key = COALESCE(${updates.retell_api_key ?? null}, retell_api_key),
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Session Queries
// ============================================================================

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const { rows } = await sql<Session>`SELECT * FROM sessions WHERE id = ${sessionId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function createSession(sessionData: {
  id: string;
  user_id: string;
  expires_at: string;
  data: string;
}): Promise<DbResult<Session>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<Session>`
      INSERT INTO sessions (id, user_id, expires_at, data, created_at)
      VALUES (${sessionData.id}, ${sessionData.user_id}, ${sessionData.expires_at}, ${sessionData.data}, ${now})
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteSession(sessionId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteUserSessions(userId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteExpiredSessions(): Promise<DbResult<number>> {
  try {
    const result = await sql`DELETE FROM sessions WHERE expires_at < ${new Date().toISOString()}`;
    return { success: true, data: result.rowCount || 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Call Queries
// ============================================================================

export async function getCallById(callId: string): Promise<Call | null> {
  try {
    const { rows } = await sql<Call>`SELECT * FROM calls WHERE id = ${callId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getCallById error:', error);
    return null;
  }
}

export async function getCallsByUserId(
  userId: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE user_id = ${userId}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByStatus(
  userId: string,
  status: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE user_id = ${userId} AND status = ${status}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByPhoneNumber(
  userId: string,
  phoneNumber: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE user_id = ${userId} AND phone_number LIKE ${'%' + phoneNumber + '%'}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByBusinessId(
  businessId: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE business_id = ${businessId}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByDateRange(
  businessId: string,
  startDate: string,
  endDate: string,
  limit = 100,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls
      WHERE business_id = ${businessId}
        AND call_date >= ${startDate}
        AND call_date <= ${endDate}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getRecentCalls(businessId?: string, count = 10): Promise<DbResult<Call[]>> {
  try {
    const { rows } = businessId
      ? await sql<Call>`SELECT * FROM calls WHERE business_id = ${businessId} ORDER BY call_date DESC LIMIT ${count}`
      : await sql<Call>`SELECT * FROM calls ORDER BY call_date DESC LIMIT ${count}`;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function cacheCall(callData: {
  id: string;
  user_id: string;
  business_id: string;
  phone_number: string;
  duration?: number | null;
  status: string;
  outcome?: string | null;
  transcript?: string | null;
  recording_url?: string | null;
  call_cost_cents?: number | null;
  customer_cost_cents?: number | null;
  call_date: string;
}): Promise<DbResult<Call>> {
  try {
    const now = new Date().toISOString();
    const cost = callData.call_cost_cents ?? null;
    const customerCost = callData.customer_cost_cents ?? null;
    const { rows } = await sql<Call>`
      INSERT INTO calls (id, user_id, business_id, phone_number, duration, status, outcome, transcript, recording_url, call_cost_cents, customer_cost_cents, call_date, created_at)
      VALUES (
        ${callData.id},
        ${callData.user_id},
        ${callData.business_id},
        ${callData.phone_number},
        ${callData.duration || null},
        ${callData.status},
        ${callData.outcome || null},
        ${callData.transcript || null},
        ${callData.recording_url || null},
        ${cost},
        ${customerCost},
        ${callData.call_date},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        duration = EXCLUDED.duration,
        status = EXCLUDED.status,
        outcome = EXCLUDED.outcome,
        transcript = EXCLUDED.transcript,
        recording_url = EXCLUDED.recording_url,
        call_cost_cents = COALESCE(EXCLUDED.call_cost_cents, calls.call_cost_cents),
        customer_cost_cents = COALESCE(EXCLUDED.customer_cost_cents, calls.customer_cost_cents),
        call_date = EXCLUDED.call_date,
        business_id = EXCLUDED.business_id
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** Update call cost (e.g. after loading from Retell get-call). */
export async function updateCallCost(callId: string, callCostCents: number, customerCostCents?: number): Promise<DbResult<Call>> {
  try {
    const { rows } = await sql<Call>`
      UPDATE calls SET 
        call_cost_cents = ${callCostCents},
        customer_cost_cents = COALESCE(${customerCostCents ?? null}, customer_cost_cents)
      WHERE id = ${callId} RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallMetrics(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<DbResult<{
  total_calls: number;
  completed_calls: number;
  missed_calls: number;
  failed_calls: number;
  avg_duration: number;
  completion_rate: number;
  total_cost_cents: number;
}>> {
  try {
    const { rows } = await sql`
      SELECT
        COUNT(*)::int as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed_calls,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END)::int as missed_calls,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed_calls,
        COALESCE(AVG(duration), 0)::float as avg_duration,
        COALESCE(SUM(customer_cost_cents), 0)::int as total_cost_cents
      FROM calls
      WHERE (${businessId ?? null}::text IS NULL OR business_id = ${businessId ?? null})
        AND (${startDate ?? null}::text IS NULL OR call_date >= ${startDate ?? null})
        AND (${endDate ?? null}::text IS NULL OR call_date <= ${endDate ?? null})
    `;
    const row = rows[0];
    const total = row.total_calls || 0;
    const completionRate = total > 0 ? ((row.completed_calls || 0) / total) * 100 : 0;
    return {
      success: true,
      data: {
        total_calls: total,
        completed_calls: row.completed_calls || 0,
        missed_calls: row.missed_calls || 0,
        failed_calls: row.failed_calls || 0,
        avg_duration: row.avg_duration || 0,
        completion_rate: completionRate,
        total_cost_cents: row.total_cost_cents || 0,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** Sum of call_cost_cents for the business, optionally filtered by date/status/phone. */
export async function getTotalCostCents(
  businessId: string,
  filters?: { startDate?: string; endDate?: string; status?: string; phoneNumber?: string }
): Promise<DbResult<number>> {
  try {
    const startDate = filters?.startDate ?? null;
    const endDate = filters?.endDate ?? null;
    const status = filters?.status ?? null;
    const phoneNumber = filters?.phoneNumber ?? null;
    const { rows } = await sql<{ sum: number }>`
      SELECT COALESCE(SUM(customer_cost_cents), 0)::int as sum FROM calls
      WHERE business_id = ${businessId}
        AND (${startDate}::text IS NULL OR call_date >= ${startDate})
        AND (${endDate}::text IS NULL OR call_date <= ${endDate})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${phoneNumber}::text IS NULL OR phone_number LIKE ${'%' + (phoneNumber || '') + '%'})
    `;
    return { success: true, data: rows[0]?.sum ?? 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Subscription Queries
// ============================================================================

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<Subscription>`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `;
    // We can allow active subscriptions past their end date conceptually if they want, 
    // or filter by `end_date > now`. Let's just return the latest active one.
    return rows[0] || null;
  } catch (error) {
    console.error('getActiveSubscription error:', error);
    return null;
  }
}

export async function createSubscription(data: {
  id: string;
  user_id: string;
  plan_name: string;
  total_minutes: number;
  rate_pence: number;
  start_date: string;
  end_date: string;
}): Promise<DbResult<Subscription>> {
  try {
    const now = new Date().toISOString();
    // Invalidate previous active subscriptions for the user
    await sql`UPDATE subscriptions SET status = 'expired' WHERE user_id = ${data.user_id} AND status = 'active'`;

    const { rows } = await sql<Subscription>`
      INSERT INTO subscriptions (id, user_id, plan_name, total_minutes, rate_pence, start_date, end_date, status, created_at)
      VALUES (
        ${data.id}, ${data.user_id}, ${data.plan_name}, ${data.total_minutes}, 
        ${data.rate_pence}, ${data.start_date}, ${data.end_date}, 'active', ${now}
      )
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


export async function deleteCall(callId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM calls WHERE id = ${callId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Audit Log Queries
// ============================================================================

export async function logAuditEvent(auditData: {
  user_id: string;
  event_type: string;
  ip_address?: string | null;
  user_agent?: string | null;
}): Promise<DbResult<AuditLog>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<AuditLog>`
      INSERT INTO audit_log (user_id, event_type, ip_address, user_agent, created_at)
      VALUES (${auditData.user_id}, ${auditData.event_type}, ${auditData.ip_address || null}, ${auditData.user_agent || null}, ${now})
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserAuditLog(
  userId: string,
  eventType?: string,
  limit = 50,
  offset = 0
): Promise<DbResult<AuditLog[]>> {
  try {
    const { rows } = await sql<AuditLog>`
      SELECT * FROM audit_log
      WHERE user_id = ${userId}
        AND (${eventType ?? null}::text IS NULL OR event_type = ${eventType ?? null})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
