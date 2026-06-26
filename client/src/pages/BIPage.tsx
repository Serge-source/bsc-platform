import { useQuery } from '@tanstack/react-query'
import { Database, BarChart2, TrendingUp, TrendingDown, Minus, Activity, PieChart, Target } from 'lucide-react'
import { kpiApi, riskApi, initiativeApi } from '../lib/api'

function MiniSparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-gray-300 text-xs">no data</span>
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 60
  const h = 24
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  const trend = prev !== undefined ? (last > prev ? 'up' : last < prev ? 'down' : 'flat') : 'flat'
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} className="text-blue-500">
        <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
      </svg>
      {trend === 'up' ? <TrendingUp size={14} className="text-green-500" /> : trend === 'down' ? <TrendingDown size={14} className="text-red-500" /> : <Minus size={14} className="text-gray-400" />}
    </div>
  )
}

function KPIDataTable({ kpis }: { kpis: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4">KPI</th>
            <th className="pb-2 pr-4">Perspective</th>
            <th className="pb-2 pr-4">Target</th>
            <th className="pb-2 pr-4">Latest</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi: any) => {
            const latest = kpi.values?.[0]
            const histValues = [...(kpi.values || [])].reverse().map((v: any) => v.actual).filter((v: any) => v !== null && v !== undefined)
            const statusColors: Record<string, string> = {
              GREEN: 'bg-green-100 text-green-700',
              YELLOW: 'bg-yellow-100 text-yellow-700',
              RED: 'bg-red-100 text-red-700',
              CRITICAL: 'bg-red-600 text-white',
            }
            return (
              <tr key={kpi.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium text-gray-800">{kpi.name}</td>
                <td className="py-2 pr-4 text-gray-500">{kpi.perspective?.name || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{kpi.target ?? '—'}{kpi.unit || ''}</td>
                <td className="py-2 pr-4 text-gray-800 font-medium">{latest?.actual ?? '—'}{latest ? kpi.unit || '' : ''}</td>
                <td className="py-2 pr-4">
                  {latest?.status && <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[latest.status] || 'bg-gray-100'}`}>{latest.status}</span>}
                </td>
                <td className="py-2"><MiniSparkline values={histValues.slice(-6)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function BIPage() {
  const { data: kpis = [] } = useQuery({ queryKey: ['kpis'], queryFn: () => kpiApi.list().then(r => r.data) })
  const { data: risks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => riskApi.list().then(r => r.data) })
  const { data: initiatives = [] } = useQuery({ queryKey: ['initiatives'], queryFn: () => initiativeApi.list().then(r => r.data) })
  const { data: summary } = useQuery({ queryKey: ['kpi-summary'], queryFn: () => kpiApi.summary().then(r => r.data) })

  const kpiByPerspective: Record<string, any[]> = {}
  kpis.forEach((k: any) => {
    const p = k.perspective?.name || 'Unassigned'
    if (!kpiByPerspective[p]) kpiByPerspective[p] = []
    kpiByPerspective[p].push(k)
  })

  const statusDist: Record<string, number> = {}
  kpis.forEach((k: any) => { const s = k.values?.[0]?.status || 'NO_DATA'; statusDist[s] = (statusDist[s] || 0) + 1 })

  const initStatus: Record<string, number> = {}
  initiatives.forEach((i: any) => { initStatus[i.status] = (initStatus[i.status] || 0) + 1 })

  const riskHigh = risks.filter((r: any) => r.likelihood * r.impact >= 12).length
  const riskMed = risks.filter((r: any) => { const s = r.likelihood * r.impact; return s >= 6 && s < 12 }).length
  const riskLow = risks.filter((r: any) => r.likelihood * r.impact < 6).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
          <Database className="text-cyan-600" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-sm text-gray-500">Consolidated data warehouse and analytics dashboard</p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active KPIs', value: summary?.active ?? kpis.filter((k: any) => k.status === 'ACTIVE').length, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'On Target', value: summary?.onTarget ?? 0, icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'At Risk', value: summary?.atRisk ?? 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Initiatives', value: initiatives.length, icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* KPI Status Distribution */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><PieChart size={15} className="text-blue-500" /> KPI Status</h3>
          <div className="space-y-2">
            {[
              { key: 'GREEN', label: 'Green', color: 'bg-green-500' },
              { key: 'YELLOW', label: 'Yellow', color: 'bg-yellow-400' },
              { key: 'RED', label: 'Red', color: 'bg-red-500' },
              { key: 'CRITICAL', label: 'Critical', color: 'bg-red-800' },
              { key: 'NO_DATA', label: 'No Data', color: 'bg-gray-300' },
            ].map(({ key, label, color }) => {
              const count = statusDist[key] || 0
              const total = Object.values(statusDist).reduce((a, b) => a + b, 0) || 1
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600 flex-1">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk Heatmap Summary */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Activity size={15} className="text-red-500" /> Risk Profile</h3>
          <div className="space-y-2 mb-4">
            {[
              { label: 'High Risk (≥12)', count: riskHigh, color: 'bg-red-500' },
              { label: 'Medium Risk (6-11)', count: riskMed, color: 'bg-yellow-400' },
              { label: 'Low Risk (<6)', count: riskLow, color: 'bg-green-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-sm text-gray-600 flex-1">{label}</span>
                <span className="text-sm font-bold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <div className="text-xs text-gray-500">Top Risks</div>
            {risks.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex justify-between text-xs py-1">
                <span className="text-gray-700 truncate flex-1">{r.name}</span>
                <span className="text-red-600 font-medium ml-2">{r.likelihood * r.impact}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Initiative Status */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart2 size={15} className="text-purple-500" /> Initiatives</h3>
          <div className="space-y-2">
            {Object.entries(initStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{status.replace(/_/g, ' ')}</span>
                <span className="font-bold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
          {initiatives.length > 0 && (
            <div className="border-t mt-3 pt-3">
              <div className="text-xs text-gray-500 mb-1">Overall Completion</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.round(initiatives.reduce((s: number, i: any) => s + i.completion, 0) / initiatives.length)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700">{Math.round(initiatives.reduce((s: number, i: any) => s + i.completion, 0) / initiatives.length)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Data by Perspective */}
      {Object.entries(kpiByPerspective).map(([perspective, pkpis]) => (
        <div key={perspective} className="bg-white rounded-xl border mb-4">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800">{perspective}</h3>
            <p className="text-xs text-gray-400">{pkpis.length} KPI{pkpis.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="p-4">
            <KPIDataTable kpis={pkpis} />
          </div>
        </div>
      ))}
    </div>
  )
}
