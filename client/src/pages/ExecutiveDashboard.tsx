import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle, Target, Rocket, Shield } from 'lucide-react'
import { kpiApi, riskApi, initiativeApi } from '../lib/api'
import clsx from 'clsx'

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  ON_TARGET:  { color: 'text-green-600 bg-green-50', icon: CheckCircle, label: 'On Target' },
  EXCEEDED:   { color: 'text-green-600 bg-green-50', icon: TrendingUp, label: 'Exceeded' },
  WARNING:    { color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle, label: 'Warning' },
  CRITICAL:   { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Critical' },
  NO_DATA:    { color: 'text-gray-500 bg-gray-50', icon: Minus, label: 'No Data' },
}

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const data = [{ name: label, value: score, fill: color }]
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <RadialBarChart
          width={80} height={80}
          cx={40} cy={40}
          innerRadius={28} outerRadius={38}
          startAngle={90} endAngle={-270}
          data={[{ value: 100, fill: '#f3f4f6' }, ...data]}
        >
          <RadialBar dataKey="value" cornerRadius={4} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-600 text-center leading-tight">{label}</span>
    </div>
  )
}

function KPICard({ kpi }: { kpi: any }) {
  const latest = kpi.values?.[0]
  const prev = kpi.values?.[1]
  const status = latest?.status || 'NO_DATA'
  const cfg = statusConfig[status] || statusConfig.NO_DATA
  const Icon = cfg.icon
  const trend = latest?.actual && prev?.actual
    ? latest.actual > prev.actual ? 'up' : latest.actual < prev.actual ? 'down' : 'flat'
    : 'flat'

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-700 leading-tight">{kpi.name}</p>
        <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', cfg.color)}>
          <Icon size={11} />
          {cfg.label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {latest?.actual !== null && latest?.actual !== undefined ? Number(latest.actual).toLocaleString() : '—'}
            <span className="text-sm font-normal text-gray-500 ml-1">{kpi.unit}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Target: {kpi.target?.toLocaleString()} {kpi.unit}</p>
        </div>
        <div className={clsx('flex items-center gap-1 text-sm font-medium',
          trend === 'up' ? (kpi.higherIsBetter ? 'text-green-600' : 'text-red-600') :
          trend === 'down' ? (kpi.higherIsBetter ? 'text-red-600' : 'text-green-600') : 'text-gray-500'
        )}>
          {trend === 'up' ? <TrendingUp size={16} /> : trend === 'down' ? <TrendingDown size={16} /> : <Minus size={16} />}
          {latest?.variancePct != null ? `${Math.abs(latest.variancePct).toFixed(1)}%` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all',
              status === 'ON_TARGET' || status === 'EXCEEDED' ? 'bg-green-500' :
              status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, latest?.actual && kpi.target ? (latest.actual / kpi.target) * 100 : 0)}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {kpi.target ? `${Math.round((latest?.actual || 0) / kpi.target * 100)}%` : '—'}
        </span>
      </div>
      {kpi.perspective && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: kpi.perspective.color }} />
          <span className="text-xs text-gray-500">{kpi.perspective.name}</span>
        </div>
      )}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const { data: kpiSummary } = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => kpiApi.summary().then((r) => r.data),
  })

  const { data: kpisData } = useQuery({
    queryKey: ['kpis-dashboard'],
    queryFn: () => kpiApi.list({ showOnDashboard: true, limit: 12 }).then((r) => r.data),
  })

  const { data: risksData } = useQuery({
    queryKey: ['risks'],
    queryFn: () => riskApi.list({ status: 'OPEN', limit: 5 }).then((r) => r.data),
  })

  const { data: initiativesData } = useQuery({
    queryKey: ['initiatives-active'],
    queryFn: () => initiativeApi.list({ limit: 5 }).then((r) => r.data),
  })

  const kpis = kpisData?.items || []
  const risks = risksData?.items || []
  const initiatives = initiativesData?.items || []

  const perspectiveData = kpiSummary?.byPerspective
    ? Object.entries(kpiSummary.byPerspective).map(([name, v]: any) => ({
        name, ...v,
        score: v.total > 0 ? Math.round(((v.onTarget * 100 + v.warning * 60) / v.total)) : 0,
      }))
    : []

  // Trend data from first KPI with values
  const trendKpi = kpis.find((k: any) => k.values?.length > 2)
  const trendData = trendKpi?.values?.slice(0, 6).reverse().map((v: any) => ({
    period: v.period,
    actual: v.actual,
    target: v.target || trendKpi.target,
  })) || []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overall organizational performance · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Overall score row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', value: kpiSummary?.overallScore || 0, color: '#1d4ed8', bg: 'bg-brand-50', text: 'text-brand-700' },
          { label: 'KPIs On Target', value: kpiSummary?.onTarget || 0, color: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', suffix: `/${kpiSummary?.total || 0}` },
          { label: 'Critical KPIs', value: kpiSummary?.critical || 0, color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700' },
          { label: 'Open Risks', value: risks.length, color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700' },
        ].map((item) => (
          <div key={item.label} className={clsx('card p-5', item.bg)}>
            <p className="text-sm font-medium text-gray-600">{item.label}</p>
            <p className={clsx('text-3xl font-bold mt-1', item.text)}>
              {item.value}{item.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Perspective scores + Trend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perspective bar chart */}
        <div className="card p-5 col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4">Performance by Perspective</h3>
          {perspectiveData.length > 0 ? (
            <div className="space-y-3">
              {perspectiveData.map((p: any) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                      <span className="text-sm text-gray-700">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{p.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.score}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Target size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No data yet</p>
            </div>
          )}
        </div>

        {/* Trend chart */}
        <div className="card p-5 col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">
            KPI Trend — {trendKpi?.name || 'No KPI selected'}
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} name="Actual" />
                <Line type="monotone" dataKey="target" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">Enter KPI values to see trends</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards grid */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis.map((kpi: any) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
          {kpis.length === 0 && (
            <div className="col-span-full card p-10 flex flex-col items-center text-gray-400">
              <Target size={40} className="mb-3 opacity-40" />
              <p className="font-medium">No KPIs configured yet</p>
              <p className="text-sm mt-1">Go to KPIs to create your first indicator</p>
            </div>
          )}
        </div>
      </div>

      {/* Risks + Initiatives row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risks */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">Open Risks</h3>
            <span className="ml-auto badge badge-red">{risks.length}</span>
          </div>
          <div className="space-y-3">
            {risks.map((risk: any) => {
              const score = risk.likelihood * risk.impact
              return (
                <div key={risk.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                    score >= 16 ? 'bg-red-100 text-red-700' :
                    score >= 9  ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                  )}>
                    {score}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{risk.name}</p>
                    <p className="text-xs text-gray-500">{risk.category} · L:{risk.likelihood} × I:{risk.impact}</p>
                  </div>
                </div>
              )
            })}
            {risks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No open risks</p>}
          </div>
        </div>

        {/* Initiatives */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Rocket size={18} className="text-brand-600" />
            <h3 className="font-semibold text-gray-900">Active Initiatives</h3>
            <span className="ml-auto badge badge-blue">{initiatives.length}</span>
          </div>
          <div className="space-y-3">
            {initiatives.map((init: any) => (
              <div key={init.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{init.name}</p>
                  <span className={clsx('badge ml-2 flex-shrink-0',
                    init.status === 'IN_PROGRESS' ? 'badge-blue' :
                    init.status === 'COMPLETED' ? 'badge-green' :
                    init.status === 'ON_HOLD' ? 'badge-yellow' : 'badge-gray'
                  )}>
                    {init.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                    <div className="h-full bg-brand-600 rounded-full" style={{ width: `${init.completion || 0}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-8 text-right">{init.completion || 0}%</span>
                </div>
              </div>
            ))}
            {initiatives.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active initiatives</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
