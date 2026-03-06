/**
 * Calls List Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays a paginated list of phone calls with filtering and search capabilities.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /components/CallList.tsx - Client component with filters and pagination
 */

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { getCallsByUserId, getTotalCostCents, type Call } from '@/lib/db';
import CallList from '@/components/CallList';
import SyncRetellButton from '@/components/SyncRetellButton';

// ============================================================================
// Server Component - Calls List Page
// ============================================================================

/**
 * Calls List Page Component
 *
 * Server component that fetches initial call data and renders the CallList client component.
 * Requires authenticated session via NextAuth.js.
 *
 * Features:
 * - Server-side data fetching for optimal performance
 * - Authentication check with redirect to login
 * - Initial data hydration for CallList component
 * - Client-side filtering and pagination
 * - Dark mode support
 * - Responsive design
 *
 * @returns Calls list page JSX or redirects to login
 *
 * @example
 * // Access at http://localhost:3000/dashboard/calls
 * // Requires valid authentication session
 */
export default async function CallsListPage() {
  // Get current session (authentication check)
  const session = await auth();

  // Redirect unauthenticated users to login
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  // Fetch initial calls (first page, 25 per page)
  const initialLimit = 25;
  const initialOffset = 0;
  const callsResult = await getCallsByUserId(
    session.user.id,
    initialLimit,
    initialOffset
  );

  // Extract initial calls with fallback
  const initialCalls: Call[] = callsResult.success && callsResult.data
    ? callsResult.data
    : [];

  // Get total count for pagination
  // Note: In production, you might want to optimize this with a separate count query
  const totalResult = await getCallsByUserId(session.user.id, 1000, 0);
  const initialTotal = totalResult.success && totalResult.data
    ? totalResult.data.length
    : initialCalls.length;

  const costResult = await getTotalCostCents(session.user.id);
  const initialTotalCostCents = costResult.success ? costResult.data : 0;

  return (
    <>
      {/* Aurora Background */}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 border border-cyan-200/50 dark:border-cyan-700/50 mb-6">
                <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                  Call History
                </span>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold">
                    <span className="gradient-text">Phone Calls</span>
                  </h1>
                  <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                    View and search your phone call history
                  </p>
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <SyncRetellButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call List Component */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <CallList
            initialCalls={initialCalls}
            initialTotal={initialTotal}
            initialTotalCostCents={initialTotalCostCents}
            userId={session.user.id}
          />
        </div>
      </div>
    </>
  );
}
