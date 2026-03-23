'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Call } from '@/lib/db'
import { formatDurationFromMilliseconds } from '@/lib/duration'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Call filter options
 */
export interface CallFilters {
  startDate?: string
  endDate?: string
  status?: string
  phoneNumber?: string
}

/**
 * Pagination state
 */
interface PaginationState {
  page: number
  limit: number
  total: number
}

interface CallsApiResponse {
  calls: Call[]
  total: number
  totalCostCents: number
}

/**
 * Call List Props
 *
 * @param initialCalls - Initial array of calls to display
 * @param initialTotal - Total number of calls (for pagination)
 * @param userId - User ID for fetching filtered calls
 */
export interface CallListProps {
  initialCalls: Call[]
  initialTotal: number
  /** Total cost in cents (all or filtered); shown above table */
  initialTotalCostCents?: number
  userId: string
}

async function fetchCallsFromApi(
  userId: string,
  page: number,
  limit: number,
  filters: CallFilters,
  signal?: AbortSignal
): Promise<CallsApiResponse> {
  const params = new URLSearchParams({
    userId,
    limit: limit.toString(),
    offset: ((page - 1) * limit).toString(),
  })

  if (filters.startDate) {
    params.append('startDate', filters.startDate)
  }

  if (filters.endDate) {
    params.append('endDate', filters.endDate)
  }

  if (filters.status) {
    params.append('status', filters.status)
  }

  if (filters.phoneNumber) {
    params.append('phoneNumber', filters.phoneNumber)
  }

  const response = await fetch(`/api/calls?${params.toString()}`, {
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch calls')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch calls')
  }

  return {
    calls: data.data.calls,
    total: data.data.total,
    totalCostCents: typeof data.data.totalCostCents === 'number' ? data.data.totalCostCents : 0,
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Call List Component
 *
 * Displays a paginated list of phone calls with filtering and search capabilities.
 * Features include date range filtering, status filtering, phone number search,
 * and pagination controls.
 *
 * Features:
 * - Pagination (25 calls per page)
 * - Date range filter
 * - Status filter (completed, missed, failed, in_progress, cancelled)
 * - Phone number search
 * - Responsive table layout
 * - Dark mode support
 * - Loading states
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <CallList
 *   initialCalls={calls}
 *   initialTotal={totalCalls}
 *   userId={session.user.id}
 * />
 * ```
 */
export default function CallList({ initialCalls, initialTotal, initialTotalCostCents = 0, userId }: CallListProps) {
  // State management
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: initialTotal,
  })
  const [filters, setFilters] = useState<CallFilters>({})
  const [totalCostCents, setTotalCostCents] = useState<number>(initialTotalCostCents)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestInFlightRef = useRef(false)

  // Form state for filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  /**
   * Apply filters and reset to first page
   */
  const handleApplyFilters = () => {
    const newFilters: CallFilters = {}

    if (startDate) {
      newFilters.startDate = startDate
    }

    if (endDate) {
      newFilters.endDate = endDate
    }

    if (status) {
      newFilters.status = status
    }

    if (phoneNumber) {
      newFilters.phoneNumber = phoneNumber
    }

    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatus('')
    setPhoneNumber('')
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  /**
   * Fetch calls when pagination or filters change (including when filters are cleared)
   */
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const loadCalls = async () => {
      if (requestInFlightRef.current) {
        return
      }

      requestInFlightRef.current = true

      try {
        setIsLoading(true)
        setError(null)

        const data = await fetchCallsFromApi(
          userId,
          pagination.page,
          pagination.limit,
          filters,
          controller.signal
        )

        if (!isMounted) {
          return
        }

        setCalls(data.calls)
        setPagination((prev) => ({ ...prev, total: data.total }))
        setTotalCostCents(data.totalCostCents)
      } catch (err) {
        if (!isMounted || controller.signal.aborted) {
          return
        }

        setError(err instanceof Error ? err.message : 'An error occurred')
        setCalls([])
      } finally {
        requestInFlightRef.current = false
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCalls()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [filters, pagination.limit, pagination.page, userId])

  useEffect(() => {
    let isMounted = true

    const pollCalls = async () => {
      if (document.hidden || requestInFlightRef.current) {
        return
      }

      requestInFlightRef.current = true

      try {
        const data = await fetchCallsFromApi(
          userId,
          pagination.page,
          pagination.limit,
          filters
        )

        if (!isMounted) {
          return
        }

        setCalls(data.calls)
        setPagination((prev) => ({ ...prev, total: data.total }))
        setTotalCostCents(data.totalCostCents)
        setError(null)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        requestInFlightRef.current = false
      }
    }

    const intervalId = window.setInterval(() => {
      void pollCalls()
    }, 10000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void pollCalls()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [filters, pagination.limit, pagination.page, userId])

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const startIndex = (pagination.page - 1) * pagination.limit + 1
  const endIndex = Math.min(startIndex + pagination.limit - 1, pagination.total)

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Phone Number Search */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              placeholder="Search by phone"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isLoading ? 'Applying...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleClearFilters}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Filters
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          This page refreshes automatically every 10 seconds while it is open.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card rounded-2xl p-4 border border-red-200/50 dark:border-red-700/50 bg-red-50/50 dark:bg-red-900/20 animate-fade-in">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Total cost card */}
      <div className="glass-card rounded-2xl p-5 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Object.keys(filters).length > 0 ? 'Total cost (filtered)' : 'Total cost (all time)'}
          </span>
        </div>
        <span className="metric-card-value text-2xl">
          £{(totalCostCents / 100).toFixed(2)}
        </span>
      </div>

      {/* Calls Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading calls...</p>
                    </div>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-4">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No calls found matching your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                calls.map((call, index) => <CallRow key={call.id} call={call} index={index} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 flex items-center justify-between border-t border-gray-200/50 dark:border-gray-700/50">
            {/* Pagination Info */}
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{startIndex}</span> to{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{endIndex}</span> of{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> calls
            </div>

            {/* Pagination Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Call Row Props
 */
interface CallRowProps {
  call: Call
  index: number
}

/**
 * Call Row Component
 *
 * Displays a single call in the table.
 *
 * @param props - Call row props
 * @returns Call row JSX
 */
function CallRow({ call, index }: CallRowProps) {
  // Format call date
  const callDate = new Date(call.call_date)
  const formattedDate = callDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = callDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Status badge config
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
  }

  const config = statusConfig[call.status] || statusConfig.cancelled

  return (
    <tr className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors opacity-0 animate-fade-in" style={{ animationDelay: `${300 + index * 30}ms` }}>
      {/* Date & Time */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{formattedDate}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{formattedTime}</div>
      </td>

      {/* Phone Number */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {call.phone_number}
        </div>
      </td>

      {/* Duration */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatDurationFromMilliseconds(call.duration)}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border border-current/20`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
          {call.status.replace('_', ' ')}
        </span>
      </td>

      {/* Cost */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          {call.customer_cost_cents != null ? `£${(call.customer_cost_cents / 100).toFixed(2)}` : '-'}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Link
          href={`/dashboard/calls/${call.id}`}
          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          View Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </td>
    </tr>
  )
}
