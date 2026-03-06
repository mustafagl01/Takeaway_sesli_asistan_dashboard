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
import { getCallMetrics, getRecentCalls, getBusinessesForUser, type Call } from '@/lib/db';
import ActiveSubscriptionWidget from '@/components/ActiveSubscriptionWidget';
import { sql } from '@vercel/postgres';

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
  total_cost_cents: number;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  const isAdmin = session.user.email === 'mustafagl01@gmail.com';

  if (isAdmin) {
    return <AdminDashboardView />;
  }

  // Fetch data globally for the user
  const metricsResult = await getCallMetrics(session.user.id);
  const recentCallsResult = await getRecentCalls(session.user.id, 10);

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
      total_cost_cents: 0,
    };

  // Extract recent calls with fallback
  const recentCalls: Call[] = recentCallsResult.success && recentCallsResult.data
    ? recentCallsResult.data
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Overview of your phone call metrics and recent activity
          </p>
        </div>

        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Calls Card */}
          <MetricCard
            title="Total Calls"
            value={metrics.total_calls.toString()}
            subtitle="All time"
            icon={
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            }
            color="blue"
          />

          {/* Average Duration Card */}
          <MetricCard
            title="Avg Duration"
            value={`${Math.round(metrics.avg_duration)}s`}
            subtitle="Per call"
            icon={
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="green"
          />

          {/* Completion Rate Card */}
          <MetricCard
            title="Completion Rate"
            value={`${metrics.completion_rate.toFixed(1)}%`}
            subtitle="Successful calls"
            icon={
              <svg
                className="w-8 h-8 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="purple"
          />

          {/* Total Cost Card */}
          <MetricCard
            title="Total Cost"
            value={`$${(metrics.total_cost_cents / 100).toFixed(2)}`}
            subtitle="All time"
            icon={
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="amber"
          />

        </div>

        {/* Active Subscription Widget */}
        <div className="mb-8">
          <ActiveSubscriptionWidget />
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 glass-morphism border border-white/20 dark:border-white/5 shadow-blue-500/5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>

          {recentCalls.length === 0 ? (
            <EmptyState message="No calls recorded yet. Your recent activity will appear here." />
          ) : (
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <CallListItem key={call.id} call={call} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
      // Fallback
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

  // Fetch some general metrics
  const { rows: generalMetrics } = await sql<any>`
      SELECT
        COUNT(*)::int as total_calls,
        COALESCE(SUM(duration), 0)::int as total_duration
      FROM calls
  `;
  const totalCalls = generalMetrics[0]?.total_calls || 0;
  const totalDurationMin = Math.ceil((generalMetrics[0]?.total_duration || 0) / 60000);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Tüm müşterilerin genel durumu ve kalan dakikaları.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="Toplam Müşteri (İşletme)"
            value={users.length.toString()}
            subtitle="Sisteme kayıtlı kullanıcılar"
            icon={
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            }
            color="blue"
          />
          <MetricCard
            title="Toplam Çağrı Süresi"
            value={`${totalDurationMin} dk`}
            subtitle={`Toplam ${totalCalls} arama`}
            icon={
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
            color="green"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Müşteri Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktif Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dakika Kullanımı</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {summaries.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs uppercase">
                          {user.name?.substring(0, 2) || 'UK'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.plan_name ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {user.plan_name} ({user.total_minutes} dk)
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Paket Yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{user.usedMinutes}</span>
                        <span>/</span>
                        <span>{user.total_minutes || 0} dk</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.plan_name ? (
                        user.remainingMinutes > 0 ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            {user.remainingMinutes} dk kaldı
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
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
  color: 'blue' | 'green' | 'purple' | 'amber' | 'indigo';
}

/**
 * Metric Card Component
 *
 * Displays a single metric with icon, value, and subtitle.
 * Used in the metrics grid on the dashboard home.
 *
 * @param props - Metric card props
 * @returns Metric card JSX
 */
function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30 shadow-blue-500/5',
    green: 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/30 shadow-green-500/5',
    purple: 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/50 dark:border-purple-800/30 shadow-purple-500/5',
    amber: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30 shadow-amber-500/5',
    indigo: 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-800/30 shadow-indigo-500/5',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6 hover-lift glass-morphism backdrop-blur-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
}

/**
 * Call List Item Props
 */
interface CallListItemProps {
  call: Call;
}

/**
 * Call List Item Component
 *
 * Displays a single call in the recent activity list.
 * Shows date, phone number, status, and outcome.
 *
 * @param props - Call list item props
 * @returns Call list item JSX
 */
function CallListItem({ call }: CallListItemProps) {
  // Format call date
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

  // Status badge color
  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    missed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const statusBadgeClass =
    statusColors[call.status] || statusColors.cancelled;

  return (
    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-white/10 hover-lift transition-all duration-300 border border-transparent hover:border-blue-500/20 shadow-sm hover:shadow-md">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {call.phone_number}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {call.outcome && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {call.outcome.replace('_', ' ')}
          </span>
        )}
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClass}`}>
          {call.status.replace('_', ' ')}
        </span>
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
 *
 * Displays a message when no data is available.
 *
 * @param props - Empty state props
 * @returns Empty state JSX
 */
function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
