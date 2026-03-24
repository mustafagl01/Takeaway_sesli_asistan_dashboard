/**
 * Analytics Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays interactive charts and analytics for phone call data.
 * Includes call volume trends, outcome distribution, peak hours, and date range filtering.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /components/AnalyticsChart.tsx - Chart visualization component
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnalyticsChart from '@/components/AnalyticsChart'
import type { Call } from '@/lib/db'
import { formatDurationFromMilliseconds, formatDurationFromSeconds, millisecondsToSeconds } from '@/lib/duration'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Date range filter state
 */
interface DateRange {
  startDate: string
  endDate: string
}

interface AnalyticsApiResponse {
  success: boolean
  data?: {
    calls?: Call[]
    total?: number
    hasActivePackage?: boolean
  }
  error?: string
}

// ============================================================================
// Client Component - Analytics Page
// ============================================================================

/**
 * Analytics Page Component
 *
 * Client component that displays interactive charts and analytics for phone call data.
 * Requires authenticated session via NextAuth.js.
 *
 * Features:
 * - Call volume trends over time (line chart)
 * - Call outcome distribution (pie chart)
 * - Peak hours heatmap
 * - Date range filtering
 * - Responsive design
 * - Dark mode support
 * - Real-time data updates
 *
 * @returns Analytics page JSX or redirects to login
 *
 * @example
 * // Access at http://localhost:3000/dashboard/analytics
 * // Requires valid authentication session
 */
export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State for call data and filters
  const [calls, setCalls] = useState<Call[]>([])
  const [hasActivePackage, setHasActivePackage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range filter state (default: last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getLast30DaysDate(),
    endDate: new Date().toISOString().split('T')[0],
  })

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch call data when date range or session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchCalls()
    }
  }, [dateRange, session])

  /**
   * Fetch calls from API with date range filter
   */
  async function fetchCalls() {
    if (!session?.user?.id) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      })

      const response = await fetch(`/api/analytics/calls?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data = await response.json() as AnalyticsApiResponse

      if (data.success && data.data) {
        setCalls(data.data.calls || [])
        setHasActivePackage(!!data.data.hasActivePackage)
      } else {
        throw new Error(data.error || 'Failed to fetch analytics data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle date range form submission
   */
  function handleDateRangeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    fetchCalls()
  }

  /**
   * Handle preset date range buttons
   */
  function setPresetRange(days: number) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  // Calculate additional analytics metrics
  const metrics = calculateAnalyticsMetrics(calls)

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <>
        <div className="aurora-bg">
          <div className="aurora-layer aurora-layer-1" />
          <div className="aurora-layer aurora-layer-2" />
          <div className="aurora-layer aurora-layer-3" />
          <div className="noise-overlay" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </>
    )
  }

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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-200/50 dark:border-violet-700/50 mb-6">
                <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Data Analytics
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold">
                <span className="gradient-text">Analytics</span>
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Visualize your phone call trends and patterns
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Date Range Filter */}
          <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range Filter
            </h2>

            <form onSubmit={handleDateRangeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Start Date */}
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none"
                  >
                    {loading ? 'Loading...' : 'Apply Filter'}
                  </button>
                </div>
              </div>

              {/* Preset Range Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Quick select:</span>
                {[
                  { days: 7, label: 'Last 7 days' },
                  { days: 30, label: 'Last 30 days' },
                  { days: 90, label: 'Last 90 days' },
                ].map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPresetRange(days)}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-indigo-100 hover:to-purple-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 text-gray-700 dark:text-gray-300 rounded-lg transition-all border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Error State */}
          {error && (
            <div className="glass-card rounded-2xl p-6 mb-8 border border-red-200/50 dark:border-red-700/50 bg-red-50/50 dark:bg-red-900/20 animate-fade-in">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle date range form submission
   */
  function handleDateRangeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    fetchCalls()
  }

  /**
   * Handle preset date range buttons
   */
  function setPresetRange(days: number) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  // Calculate additional analytics metrics
  const metrics = calculateAnalyticsMetrics(calls)

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <>
        <div className="aurora-bg">
          <div className="aurora-layer aurora-layer-1" />
          <div className="aurora-layer aurora-layer-2" />
          <div className="aurora-layer aurora-layer-3" />
          <div className="noise-overlay" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </>
    )
  }

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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-200/50 dark:border-violet-700/50 mb-6">
                <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Data Analytics
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold">
                <span className="gradient-text">Analytics</span>
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Visualize your phone call trends and patterns
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Date Range Filter */}
          <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range Filter
            </h2>

            <form onSubmit={handleDateRangeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Start Date */}
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none"
                  >
                    {loading ? 'Loading...' : 'Apply Filter'}
                  </button>
                </div>
              </div>

              {/* Preset Range Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Quick select:</span>
                {[
                  { days: 7, label: 'Last 7 days' },
                  { days: 30, label: 'Last 30 days' },
                  { days: 90, label: 'Last 90 days' },
                ].map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPresetRange(days)}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-indigo-100 hover:to-purple-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 text-gray-700 dark:text-gray-300 rounded-lg transition-all border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Error State */}
          {error && (
            <div className="glass-card rounded-2xl p-6 mb-8 border border-red-200/50 dark:border-red-700/50 bg-red-50/50 dark:bg-red-900/20 animate-fade-in">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Metrics */}
          {calls.length > 0 && (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-8`}>
              <MetricCard
                title="Kazandırılan Mesai"
                value={metrics.timeSavedString}
                subtitle="Personelinizin cebinde kalan vakit"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                color="indigo"
                delay={0}
              />
              <MetricCard
                title="Yanıtlanan Çağrı"
                value={metrics.totalCalls}
                subtitle="Sizin yerinize bakılan telefon"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                color="emerald"
                delay={100}
              />
              <MetricCard
                title="Alınan Sipariş"
                value={metrics.ordersPlaced}
                subtitle="Otomatik tamamlanan sipariş"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                color="violet"
                delay={200}
              />
              <MetricCard
                title="Yanıtlanan Adres/Menü Sorusu"
                value={metrics.inquiries}
                subtitle="Personeli meşgul etmeden çözülen soru"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                color="cyan"
                delay={300}
              />
            </div>
          )}

          {/* Charts */}
          {loading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading charts...</p>
            </div>
          ) : calls.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No data available</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting the date range filter to see analytics data.
              </p>
            </div>
          ) : (
            <>
              <AnalyticsChart calls={calls} hasActivePackage={hasActivePackage} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date 30 days ago in YYYY-MM-DD format
 */
function getLast30DaysDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate analytics metrics from call data
 */
function calculateAnalyticsMetrics(calls: Call[]) {
  const totalCalls = calls.length
  
  const timeSavedSeconds = calls.reduce((acc, call) => {
    const durationSec = millisecondsToSeconds(call.duration) || 0
    return acc + durationSec
  }, 0)
  
  const timeSavedHours = Math.floor(timeSavedSeconds / 3600)
  const timeSavedMinutes = Math.floor((timeSavedSeconds % 3600) / 60)
  const timeSavedString = timeSavedHours > 0 
    ? `${timeSavedHours} Saat ${timeSavedMinutes} Dk` 
    : `${timeSavedMinutes} Dakika`
    
  const ordersPlaced = calls.filter(c => c.outcome === 'order_placed').length
  const inquiries = calls.filter(c => c.outcome === 'inquiry').length

  const hourCounts: Record<number, number> = {}
  calls.forEach(call => {
    const hour = new Date(call.call_date).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  let peakHour = 'N/A'
  let peakHourCount = 0
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > peakHourCount) {
      peakHourCount = count
      peakHour = `${hour}:00`
    }
  })

  return {
    totalCalls,
    timeSavedString,
    ordersPlaced,
    inquiries,
    peakHour,
    peakHourCount,
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber'
  delay: number
}

function MetricCard({ title, value, subtitle, icon, color, delay }: MetricCardProps) {
  const gradients = {
    indigo: 'from-indigo-500/20 via-indigo-500/5 to-purple-500/20 border-indigo-200/50 dark:border-indigo-700/50',
    emerald: 'from-emerald-500/20 via-emerald-500/5 to-teal-500/20 border-emerald-200/50 dark:border-emerald-700/50',
    violet: 'from-violet-500/20 via-violet-500/5 to-purple-500/20 border-violet-200/50 dark:border-violet-700/50',
    cyan: 'from-cyan-500/20 via-cyan-500/5 to-blue-500/20 border-cyan-200/50 dark:border-cyan-700/50',
    amber: 'from-amber-500/20 via-amber-500/5 to-orange-500/20 border-amber-200/50 dark:border-amber-700/50',
  }

  return (
    <div
      className={`gradient-border-card p-4 hover-lift opacity-0 animate-fade-in-up bg-gradient-to-br ${gradients[color]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-1">
            {value}
          </p>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-500">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 ml-4 p-3 rounded-2xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 ring-1 ring-${color}-500/30`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
