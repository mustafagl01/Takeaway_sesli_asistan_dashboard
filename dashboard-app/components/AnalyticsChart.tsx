'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Call } from '@/lib/db'

// ============================================================================
// Type Definitions
// ============================================================================

interface AnalyticsChartProps {
  calls: Call[]
  hasActivePackage?: boolean
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function useCallVolumeData(calls: Call[]) {
  return useMemo(() => {
    const byDate: Record<string, number> = {}

    calls.forEach((call) => {
      const date = new Date(call.call_date).toISOString().split('T')[0]
      if (!byDate[date]) byDate[date] = 0
      byDate[date] += 1
    })

    const sortedData = Object.entries(byDate)
      .map(([date, count]) => ({ date, calls: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return sortedData.map((point) => ({
      date: formatShortDate(point.date),
      calls: point.calls,
    }))
  }, [calls])
}

function useHourlyData(calls: Call[]) {
  return useMemo(() => {
    const counts: number[] = Array(24).fill(0)
    calls.forEach((call) => {
      const hour = new Date(call.call_date).getHours()
      counts[hour] += 1
    })
    return counts.map((count, hour) => ({ hour, count }))
  }, [calls])
}

// ============================================================================
// Custom Tooltip Components
// ============================================================================

function CallVolumeTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const p = payload[0].payload
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{p.date}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Yanıtlanan: <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.calls} </span>
          </p>
        </div>
      </div>
    )
  }
  return null
}

// ============================================================================
// Heatmap Subcomponent
// ============================================================================

function getHourBoxStyle(count: number, maxCount: number): React.CSSProperties {
  if (count === 0) return {}
  const intensity = Math.max(0.1, count / maxCount)
  return {
    backgroundColor: `rgba(99, 102, 241, ${intensity})`,
    color: intensity > 0.5 ? '#fff' : 'currentColor'
  }
}

function HeatmapGrid({ hourlyData }: { hourlyData: { hour: number; count: number }[] }) {
  const busiest = hourlyData.reduce((best, cur) => (cur.count > best.count ? cur : best), { hour: 0, count: 0 })
  const maxCount = busiest.count || 1

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            En Yoğun Saatler
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Müşterilerinizin sizi en çok aradığı saat dilimleri
          </p>
        </div>
        {busiest.count > 0 && (
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-500 mb-1">Zirve Saati</span>
            <div className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {busiest.hour.toString().padStart(2, '0')}:00 
              <span className="text-sm font-medium px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {busiest.count} Çağrı
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 md:grid-cols-12 gap-2 md:gap-3">
        {hourlyData.map(({ hour, count }, idx) => (
          <div
            key={hour}
            className="group relative flex flex-col items-center hover:-translate-y-1 transition-transform duration-200"
          >
            <div
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-medium shadow-sm border border-gray-100 dark:border-gray-800 transition-colors
                ${count === 0 ? 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500' : ''}`}
              style={getHourBoxStyle(count, maxCount)}
            >
              {hour.toString().padStart(2, '0')}
            </div>
            {/* Tooltip on hover */}
            {count > 0 && (
              <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                {count} Çağrı
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function AnalyticsChart({ calls }: AnalyticsChartProps) {
  const callVolumeData = useCallVolumeData(calls)
  const hourlyData = useHourlyData(calls)

  const hasCallVolumeData = callVolumeData.length > 0

  return (
    <div className="space-y-8">
      {/* Call Volume Over Time - Bar Chart */}
      <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="mb-6">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Günlük Çağrı Trendi
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Yapay zekanın sizin yerinize karşıladığı günlük yoğunluk
          </p>
        </div>

        {hasCallVolumeData ? (
          <div className="relative h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip content={<CallVolumeTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                <Bar 
                  dataKey="calls" 
                  fill="url(#colorCalls)" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <p>Seçili tarih aralığında veri bulunamadı</p>
          </div>
        )}
      </div>

      {/* Busiest Hours - Heatmap */}
      <HeatmapGrid hourlyData={hourlyData} />
    </div>
  )
}
