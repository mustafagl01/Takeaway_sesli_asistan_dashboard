/**
 * Dashboard Home Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays high-level metrics and recent activity for phone call data.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 */

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getActiveSubscription, getCallMetrics, getRecentCalls, getBusinessesForUser, type Call } from '@/lib/db';
import ActiveSubscriptionWidget from '@/components/ActiveSubscriptionWidget';
import AutoRefreshOnVisible from '@/components/AutoRefreshOnVisible';
import { sql } from '@vercel/postgres';
import { formatDurationFromMilliseconds } from '@/lib/duration';
import { isAdminEmail } from '@/lib/admin';

/**
 * Dashboard metrics data
 */
interface DashboardMetrics {
  total_calls: number;
  completed_calls: number;
  missed_calls: number;
  failed_calls: number;
  avg_duration: number;
  completion_rate: number;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  const isAdmin = isAdminEmail(session.user.email);

  if (isAdmin) {
    return <AdminDashboardView />;
  }

  // Fetch data globally for the user
  const metricsResult = await getCallMetrics(session.user.id);
  const recentCallsResult = await getRecentCalls(session.user.id, 10);
  const subscription = await getActiveSubscription(session.user.id);

  let remainingMinutes = 0;
  if (subscription?.status === 'active' && subscription.total_minutes) {
    const { rows } = await sql<{ sum: number }>`
      SELECT COALESCE(SUM(duration), 0)::int as sum
      FROM calls
      WHERE user_id = ${session.user.id}
        AND call_date >= ${subscription.start_date}
    `;

    const usedMinutes = Math.ceil((rows[0]?.sum || 0) / 60000);
    remainingMinutes = Math.max(0, Number(subscription.total_minutes) - usedMinutes);
  }

  // Extract metrics with fallback values
  const metrics: DashboardMetrics = metricsResult.success && metricsResult.data
    ? metricsResult.data
    : {
      total_calls: 0,
      completed_calls: 0,
      missed_calls: 0,
      failed_calls: 0,
      avg_duration: 0,
      completion_rate: 0,
    };

  // Extract recent calls with fallback
  const recentCalls: Call[] = recentCallsResult.success && recentCallsResult.data
    ? recentCallsResult.data
    : [];

  return (
    <>
      <AutoRefreshOnVisible />

      {/* Aurora Animated Background */}
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
        <div className="noise-overlay" />
      </div>

      <div className="relative min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-50" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
            {/* Animated gradient orbs */}
            <div className="absolute top-8 left-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-float" />
            <div className="absolute top-16 right-16 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-8 left-1/2 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />

            <div className="relative animate-fade-in-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/50 dark:border-indigo-700/50 mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Voice Analytics Dashboard
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4">
                <span className="gradient-text">Dashboard</span>
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                Overview of your phone call metrics and recent activity
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <MetricCard
              title="Total Calls"
              value={metrics.total_calls.toString()}
              subtitle="All time"
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
              color="indigo"
              delay={0}
            />

            <MetricCard
              title="Avg Duration"
              value={formatDurationFromMilliseconds(metrics.avg_duration)}
              subtitle="Per call"
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="emerald"
              delay={100}
            />

            <MetricCard
              title="Completion Rate"
              value={`${metrics.completion_rate.toFixed(1)}%`}
              subtitle="Successful calls"
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="violet"
              delay={200}
            />

            <MetricCard
              title="Kalan Dakika"
              value={`${remainingMinutes} dk`}
              subtitle="Aktif paketten"
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="cyan"
              delay={300}
            />
          </div>

          {/* Active Subscription Widget */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <ActiveSubscriptionWidget />
          </div>

          {/* Recent Activity Section */}
          <div className="glass-card rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your latest call history
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {recentCalls.length === 0 ? (
              <EmptyState message="No calls recorded yet. Your recent activity will appear here." />
            ) : (
              <div className="relative">
                <div className="timeline-line" />
                <div className="space-y-6">
                  {recentCalls.map((call, index) => (
                    <CallListItem key={call.id} call={call} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Admin Dashboard Subcomponent
// ============================================================================

async function AdminDashboardView() {
  const { rows: users } = await sql<any>`
      SELECT
          u.id as user_id,
          u.name,
          u.email,
          s.plan_name,
          s.total_minutes,
          s.start_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
      ORDER BY u.created_at DESC
  `;

  const summaries = await Promise.all(users.map(async (u) => {
    let usedMinutes = 0;
    if (u.start_date) {
      const { rows } = await sql<{ sum: number }>`
              SELECT COALESCE(SUM(duration), 0)::int as sum
              FROM calls
              WHERE user_id = ${u.user_id}
              AND call_date >= ${u.start_date}
          `;
      usedMinutes = Math.ceil((rows[0]?.sum || 0) / 60000);
    } else {
      const { rows } = await sql<{ sum: number }>`
              SELECT COALESCE(SUM(duration), 0)::int as sum
              FROM calls
              WHERE user_id = ${u.user_id}
          `;
      usedMinutes = Math.ceil((rows[0]?.sum || 0) / 60000);
    }

    const remainingMinutes = u.total_minutes ? Math.max(0, u.total_minutes - usedMinutes) : 0;

    return {
      ...u,
      usedMinutes,
      remainingMinutes
    };
  }));

  const { rows: generalMetrics } = await sql<any>`
      SELECT
        COUNT(*)::int as total_calls,
        COALESCE(SUM(duration), 0)::int as total_duration
      FROM calls
  `;
  const totalCalls = generalMetrics[0]?.total_calls || 0;
  const totalDurationMin = Math.ceil((generalMetrics[0]?.total_duration || 0) / 60000);

  return (
    <>
      {/* Aurora Background for Admin */}
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
        <div className="noise-overlay" />
      </div>

      <div className="relative min-h-screen">
        {/* Admin Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-700/50 mb-6">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Admin Dashboard
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold">
                <span className="gradient-text">Admin Panel</span>
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Tüm müşterilerin genel durumu ve kalan dakikaları
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Admin Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <MetricCard
              title="Toplam Müşteri"
              value={users.length.toString()}
              subtitle="Sisteme kayıtlı işletmeler"
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              color="indigo"
              delay={0}
            />
            <MetricCard
              title="Toplam Çağrı"
              value={`${totalDurationMin} dk`}
              subtitle={`${totalCalls} arama`}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
              color="emerald"
              delay={100}
            />
          </div>

          {/* Users Table */}
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="px-8 py-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Müşteri Detayları</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Müşteri</th>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktif Plan</th>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanım</th>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {summaries.map((user) => (
                    <tr key={user.user_id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
                            {user.name?.substring(0, 2).toUpperCase() || 'UK'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        {user.plan_name ? (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                            {user.plan_name} ({user.total_minutes} dk)
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Paket Yok</span>
                        )}
                      </td>
                      <td className="px-8 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{user.usedMinutes}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500 dark:text-gray-400">{user.total_minutes || 0} dk</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        {user.plan_name ? (
                          user.remainingMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {user.remainingMinutes} dk kaldı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-700/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Tükendi
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Metric Card Props
 */
interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber';
  delay: number;
}

/**
 * Metric Card Component
 */
function MetricCard({ title, value, subtitle, icon, color, delay }: MetricCardProps) {
  const gradients = {
    indigo: 'from-indigo-500/20 via-indigo-500/5 to-purple-500/20 border-indigo-200/50 dark:border-indigo-700/50',
    emerald: 'from-emerald-500/20 via-emerald-500/5 to-teal-500/20 border-emerald-200/50 dark:border-emerald-700/50',
    violet: 'from-violet-500/20 via-violet-500/5 to-purple-500/20 border-violet-200/50 dark:border-violet-700/50',
    cyan: 'from-cyan-500/20 via-cyan-500/5 to-blue-500/20 border-cyan-200/50 dark:border-cyan-700/50',
    amber: 'from-amber-500/20 via-amber-500/5 to-orange-500/20 border-amber-200/50 dark:border-amber-700/50',
  };

  const iconBg = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    violet: 'bg-gradient-to-br from-violet-500 to-violet-600',
    cyan: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
  };

  return (
    <div
      className={`gradient-border-card p-6 hover-lift aurora-glow opacity-0 animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <p className="metric-card-value text-4xl mb-1">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        </div>
        <div className={`flex-shrink-0 p-3 rounded-xl ${iconBg[color]} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Call List Item Props
 */
interface CallListItemProps {
  call: Call;
  index: number;
}

/**
 * Call List Item Component
 */
function CallListItem({ call, index }: CallListItemProps) {
  const callDate = new Date(call.call_date);
  const formattedDate = callDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = callDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    completed: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    missed: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    failed: {
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
    },
    in_progress: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-700 dark:text-indigo-400',
      dot: 'bg-indigo-500',
    },
    cancelled: {
      bg: 'bg-gray-500/10 dark:bg-gray-500/20',
      text: 'text-gray-700 dark:text-gray-400',
      dot: 'bg-gray-500',
    },
  };

  const config = statusConfig[call.status] || statusConfig.cancelled;

  return (
    <div
      className="relative pl-12 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${600 + index * 100}ms` }}
    >
      <div className="timeline-dot" />

      <div className="glass-card rounded-xl p-5 hover-lift group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${config.bg} ${config.text} group-hover:scale-110 transition-transform`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {call.phone_number}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formattedDate} • {formattedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {call.outcome && (
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                {call.outcome.replace('_', ' ')}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${config.bg} ${config.text} border border-current/20`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
              {call.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Props
 */
interface EmptyStateProps {
  message: string;
}

/**
 * Empty State Component
 */
function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
