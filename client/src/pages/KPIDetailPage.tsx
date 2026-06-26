import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { ArrowLeft, Plus, Edit2, TrendingUp, TrendingDown, Minus, Bot, Calendar } from 'lucide-react'
import { kpiApi, aiApi } from '../lib/api'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import KPIForm from '../components/kpi/KPIForm'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

function ValueEntryModal({ kpi, open, onClose, onSave }: any) {
  const [form, setForm] = useState({ actual: '', period: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1, notes: '' })
  const [loading, setLoading] = useState(false)

  // Auto-fill period from year+month
  const period = `${form.year}-${String(form.month).padStart(2, '0')}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({ actual: Number(form.actual), period, year: form.year, month: form.month, notes: form.notes })
      onClose()
      setForm({ actual: '', period: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1, notes: '' })
    } finally {
      setLoading(false)
    }
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <Modal open={open} onClose={onClose} title="Enter KPI Value" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Year</label>
            <input type="number" className="input" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} min={2020} max={2035} required />
          </div>
          <div>
            <label className="label">Month</label>
            <select className="input" value={form.month} onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Actual Value *</label>
          <div className="relative">
            <input type="number" className="input pr-16" value={form.actual} onChange={e => setForm(p => ({ ...p, actual: e.target.value }))} step="any" required autoFocus />
            {kpi?.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{kpi.unit}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-1">Target: {kpi?.target?.toLocaleString()} {kpi?.unit}</p>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional context…" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Value'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function KPIDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddValue, setShowAddValue] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [forecast, setForecast] = useState<any>(null)
  const [forecastLoading, setForecastLoading] = useState(false)

  const { data: kpi, isLoading } = useQuery({
    queryKey: ['kpi', id],
    queryFn: () => kpiApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: allValues } = useQuery({
    queryKey: ['kpi-values', id],
    queryFn: () => kpiApi.values(id!).then(r => r.data),
    enabled: !!id,
  })

  const addValueMutation = useMutation({
    mutationFn: (data: any) => kpiApi.addValue(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi', id] })
      qc.invalidateQueries({ queryKey: ['kpi-values', id] })
      qc.invalidateQueries({ queryKey: ['kpi-summary'] })
      toast.success('Value saved')
    },
    onError: () => toast.error('Failed to save value'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => kpiApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi', id] })
      setShowEdit(false)
      toast.success('KPI updated')
    },
    onError: () => toast.error('Failed to update KPI'),
  })

  const handleForecast = async () => {
    setForecastLoading(true)
    try {
      const { data } = await aiApi.forecast(id!, 3)
      setForecast(data)
    } catch {
      toast.error('Forecast failed')
    } finally {
      setForecastLoading(false)
    }
  }

  if (isLoading) return <div className="text-gray-400 p-8 text-center">Loading…</div>
  if (!kpi) return <div className="text-red-500 p-8 text-center">KPI not found</div>

  const latest = kpi.values?.[0]
  const chartData = [...(allValues || [])].reverse().map((v: any) => ({
    period: v.period,
    actual: v.actual,
    target: v.target || kpi.target,
    variance: v.variance,
  }))

  const variancePct = latest?.variancePct
  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].actual > chartData[chartData.length - 2].actual ? 'up' : 'down'
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/kpis')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{kpi.name}</h1>
            <StatusBadge status={latest?.status || 'NO_DATA'} />
            {kpi.perspective && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: kpi.perspective.color }} />
                {kpi.perspective.name}
              </span>
            )}
          </div>
          {kpi.description && <p className="text-gray-500 text-sm mt-1">{kpi.description}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowEdit(true)} className="btn-secondary">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => setShowAddValue(true)} className="btn-primary">
            <Plus size={14} /> Add Value
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {latest?.actual != null ? Number(latest.actual).toLocaleString() : '—'}
          </p>
          <p className="text-sm text-gray-400">{kpi.unit}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target</p>
          <p className="text-3xl font-bold text-brand-700 mt-1">{kpi.target?.toLocaleString() ?? '—'}</p>
          <p className="text-sm text-gray-400">{kpi.unit}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Variance</p>
          <p className={clsx('text-3xl font-bold mt-1',
            variancePct == null ? 'text-gray-400' :
            (variancePct > 0 && kpi.higherIsBetter) || (variancePct < 0 && !kpi.higherIsBetter) ? 'text-green-600' : 'text-red-600'
          )}>
            {variancePct != null ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%` : '—'}
          </p>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
            {trend === 'up' ? <TrendingUp size={14} className={kpi.higherIsBetter ? 'text-green-500' : 'text-red-500'} /> :
             trend === 'down' ? <TrendingDown size={14} className={kpi.higherIsBetter ? 'text-red-500' : 'text-green-500'} /> :
             <Minus size={14} />}
            vs previous period
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Achievement</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {latest?.actual != null && kpi.target
              ? `${Math.round((latest.actual / kpi.target) * 100)}%`
              : '—'}
          </p>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2">
            <div
              className={clsx('h-full rounded-full', latest?.status === 'CRITICAL' ? 'bg-red-500' : latest?.status === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500')}
              style={{ width: `${Math.min(100, latest?.actual && kpi.target ? (latest.actual / kpi.target) * 100 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chart + info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Historical Trend</h3>
            <button
              onClick={handleForecast}
              disabled={forecastLoading || chartData.length < 3}
              className="btn-secondary text-xs py-1.5"
            >
              <Bot size={13} />
              {forecastLoading ? 'Forecasting…' : 'AI Forecast'}
            </button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} ${kpi.unit || ''}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {kpi.warningLevel && <ReferenceLine y={kpi.warningLevel} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fontSize: 10, fill: '#f59e0b' }} />}
                {kpi.criticalLevel && <ReferenceLine y={kpi.criticalLevel} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fontSize: 10, fill: '#ef4444' }} />}
                <Line type="monotone" dataKey="actual" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4, fill: '#1d4ed8' }} name="Actual" />
                <Line type="monotone" dataKey="target" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400">
              <Calendar size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No data entered yet</p>
              <button onClick={() => setShowAddValue(true)} className="btn-primary mt-3 text-xs py-1.5">
                <Plus size={12} /> Add first value
              </button>
            </div>
          )}

          {/* AI Forecast result */}
          {forecast && (
            <div className="mt-4 p-3 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-xs font-semibold text-brand-700 mb-1">AI Forecast Analysis</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{forecast.analysis || JSON.stringify(forecast, null, 2)}</p>
            </div>
          )}
        </div>

        {/* KPI metadata */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">KPI Details</h3>
          {[
            { label: 'Formula', value: kpi.formula },
            { label: 'Frequency', value: kpi.frequency },
            { label: 'Calculation', value: kpi.calculationMethod?.replace('_', ' ') },
            { label: 'Data Source', value: kpi.dataSource },
            { label: 'Warning Level', value: kpi.warningLevel ? `${kpi.warningLevel} ${kpi.unit || ''}` : null, color: 'text-yellow-600' },
            { label: 'Critical Level', value: kpi.criticalLevel ? `${kpi.criticalLevel} ${kpi.unit || ''}` : null, color: 'text-red-600' },
            { label: 'Direction', value: kpi.higherIsBetter ? '↑ Higher is better' : '↓ Lower is better' },
            { label: 'Owner', value: kpi.owner ? `${kpi.owner.firstName} ${kpi.owner.lastName}` : null },
            { label: 'Department', value: kpi.department?.name },
            { label: 'Objective', value: kpi.objective?.name },
          ].map(({ label, value, color }) => value ? (
            <div key={label} className="flex justify-between items-start gap-2">
              <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
              <span className={clsx('text-sm text-right', color || 'text-gray-900')}>{value}</span>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Variance bar chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Variance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
              <ReferenceLine y={0} stroke="#d1d5db" />
              <Bar
                dataKey="variance"
                name="Variance"
                radius={[3, 3, 0, 0]}
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Value History</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Period', 'Actual', 'Target', 'Variance', 'Variance %', 'Status', 'Notes'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(allValues || []).map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{v.period}</td>
                <td className="px-4 py-3 font-semibold">{v.actual?.toLocaleString() ?? '—'} <span className="text-gray-400 text-xs">{kpi.unit}</span></td>
                <td className="px-4 py-3 text-gray-600">{v.target?.toLocaleString() ?? kpi.target?.toLocaleString() ?? '—'}</td>
                <td className={clsx('px-4 py-3 font-medium',
                  v.variance == null ? 'text-gray-400' :
                  (v.variance > 0 && kpi.higherIsBetter) ? 'text-green-600' : 'text-red-600'
                )}>
                  {v.variance != null ? `${v.variance > 0 ? '+' : ''}${v.variance.toFixed(2)}` : '—'}
                </td>
                <td className={clsx('px-4 py-3',
                  v.variancePct == null ? 'text-gray-400' :
                  (v.variancePct > 0 && kpi.higherIsBetter) ? 'text-green-600' : 'text-red-600'
                )}>
                  {v.variancePct != null ? `${v.variancePct > 0 ? '+' : ''}${v.variancePct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{v.notes || '—'}</td>
              </tr>
            ))}
            {(allValues || []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No values recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <ValueEntryModal kpi={kpi} open={showAddValue} onClose={() => setShowAddValue(false)} onSave={addValueMutation.mutateAsync} />
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit KPI" size="xl">
        <KPIForm
          initial={kpi}
          onSubmit={updateMutation.mutate}
          onCancel={() => setShowEdit(false)}
          loading={updateMutation.isPending}
        />
      </Modal>
    </div>
  )
}
