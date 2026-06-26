import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react'
import { scorecardApi, kpiApi } from '../lib/api'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function ScoreGauge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const s = score ?? 0
  const color = s >= 80 ? '#16a34a' : s >= 60 ? '#f59e0b' : '#ef4444'
  const sizes = { sm: { r: 22, sw: 5, dim: 54 }, md: { r: 30, sw: 6, dim: 72 }, lg: { r: 40, sw: 8, dim: 96 } }
  const { r, sw, dim } = sizes[size]
  const circumference = 2 * Math.PI * r
  const dash = (s / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={clsx('font-bold', size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm')} style={{ color }}>
          {score != null ? `${Math.round(score)}` : '—'}
        </span>
      </div>
    </div>
  )
}

function ScorecardDetail({ scorecard }: { scorecard: any }) {
  const { data: kpiSummary } = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => kpiApi.summary().then(r => r.data),
  })

  const perspectives = scorecard.perspectives || []

  return (
    <div className="space-y-6">
      {/* Header metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <ScoreGauge score={kpiSummary?.overallScore ?? null} size="md" />
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overall Score</p>
            <p className="text-sm text-gray-700 mt-0.5">{scorecard.name}</p>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">On Target</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{kpiSummary?.onTarget ?? 0}</p>
          <p className="text-xs text-gray-400">KPIs on target</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Warning</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{kpiSummary?.warning ?? 0}</p>
          <p className="text-xs text-gray-400">KPIs at warning</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Critical</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{kpiSummary?.critical ?? 0}</p>
          <p className="text-xs text-gray-400">KPIs critical</p>
        </div>
      </div>

      {/* Perspectives with KPI scores */}
      {kpiSummary?.byPerspective && Object.entries(kpiSummary.byPerspective).map(([name, data]: any) => {
        const score = data.total > 0 ? Math.round(((data.onTarget * 100 + data.warning * 60) / data.total)) : null
        return (
          <div key={name} className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <ScoreGauge score={score} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: data.color }} />
                  <h4 className="font-semibold text-gray-900">{name}</h4>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                  <span className="text-green-600">✓ {data.onTarget} on target</span>
                  {data.warning > 0 && <span className="text-yellow-600">⚠ {data.warning} warning</span>}
                  {data.critical > 0 && <span className="text-red-600">✗ {data.critical} critical</span>}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-40">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Achievement</span>
                  <span className="font-medium">{score ?? '—'}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', score == null ? '' : score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {(!kpiSummary?.byPerspective || Object.keys(kpiSummary.byPerspective).length === 0) && (
        <div className="card p-10 text-center text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
          <p>No KPI data available. Add KPIs and enter values to see scorecard scores.</p>
        </div>
      )}
    </div>
  )
}

function ScorecardForm({ onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({
    name: '', type: 'CORPORATE', year: new Date().getFullYear(), quarter: '', period: String(new Date().getFullYear()),
  })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))
  const { data: strategies } = useQuery({ queryKey: ['strategies'], queryFn: () => api.get('/strategies').then(r => r.data) })
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) })
  const strategyList = strategies?.items || strategies || []
  const deptList = departments?.items || []
  const [stratId, setStratId] = useState('')
  const [deptId, setDeptId] = useState('')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, strategyId: stratId || null, departmentId: deptId || null, year: Number(form.year), quarter: form.quarter ? Number(form.quarter) : null }) }} className="space-y-4">
      <div>
        <label className="label">Scorecard Name *</label>
        <input className="input" value={form.name} onChange={set('name')} required placeholder="e.g. Corporate Scorecard 2026" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={set('type')}>
            {['CORPORATE','DEPARTMENT','PROJECT','INDIVIDUAL'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input type="number" className="input" value={form.year} onChange={set('year')} min={2020} max={2035} />
        </div>
        <div>
          <label className="label">Strategy</label>
          <select className="input" value={stratId} onChange={e => setStratId(e.target.value)}>
            <option value="">— None —</option>
            {strategyList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Department (optional)</label>
          <select className="input" value={deptId} onChange={e => setDeptId(e.target.value)}>
            <option value="">— None —</option>
            {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Scorecard'}</button>
      </div>
    </form>
  )
}

export default function ScorecardsPage() {
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scorecards'],
    queryFn: () => scorecardApi.list({ limit: 50 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (v: any) => scorecardApi.create(v),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['scorecards'] })
      setShowCreate(false)
      setSelected(res.data)
      toast.success('Scorecard created')
    },
    onError: () => toast.error('Failed'),
  })

  const scorecards = data?.items || []

  // Auto-select first
  if (!selected && scorecards.length > 0 && !isLoading) {
    setSelected(scorecards[0])
  }

  const typeColors: Record<string, string> = {
    CORPORATE: 'bg-brand-100 text-brand-800',
    DEPARTMENT: 'bg-purple-100 text-purple-800',
    PROJECT: 'bg-orange-100 text-orange-800',
    INDIVIDUAL: 'bg-green-100 text-green-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balanced Scorecards</h1>
          <p className="text-gray-500 text-sm mt-0.5">{scorecards.length} scorecards</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={15} /> New Scorecard
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar: scorecard list */}
        <div className="w-64 flex-shrink-0 space-y-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)
          ) : scorecards.map((sc: any) => (
            <button
              key={sc.id}
              onClick={() => setSelected(sc)}
              className={clsx('w-full text-left p-4 rounded-xl border transition-all',
                selected?.id === sc.id
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={clsx('badge text-xs', typeColors[sc.type] || 'badge-gray')}>{sc.type}</span>
                <StatusBadge status={sc.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate mt-2">{sc.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sc.year} {sc.quarter ? `Q${sc.quarter}` : ''}</p>
            </button>
          ))}

          {scorecards.length === 0 && !isLoading && (
            <div className="text-center py-6 text-gray-400 text-sm">No scorecards yet</div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <ScorecardDetail scorecard={selected} />
          ) : (
            <div className="card p-12 flex flex-col items-center text-gray-400">
              <ClipboardList size={40} className="mb-3 opacity-30" />
              <p>Select a scorecard to view details</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Scorecard" size="md">
        <ScorecardForm onSubmit={createMutation.mutate} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      </Modal>
    </div>
  )
}
