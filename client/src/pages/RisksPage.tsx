import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Search } from 'lucide-react'
import { riskApi } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import Table from '../components/ui/Table'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const RISK_COLORS = [
  ['bg-green-100', 'bg-green-100', 'bg-yellow-100', 'bg-yellow-100', 'bg-orange-100'],
  ['bg-green-100', 'bg-yellow-100', 'bg-yellow-100', 'bg-orange-100', 'bg-red-100'],
  ['bg-yellow-100', 'bg-yellow-100', 'bg-orange-100', 'bg-red-100', 'bg-red-200'],
  ['bg-yellow-100', 'bg-orange-100', 'bg-red-100', 'bg-red-200', 'bg-red-300'],
  ['bg-orange-100', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400'],
]

function HeatMap({ risks }: { risks: any[] }) {
  const grid: Record<string, any[]> = {}
  risks.forEach(r => {
    const key = `${r.likelihood}-${r.impact}`
    if (!grid[key]) grid[key] = []
    grid[key].push(r)
  })

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Risk Heat Map</h3>
      <div className="flex gap-1">
        {/* Y axis label */}
        <div className="flex flex-col justify-between text-xs text-gray-400 py-6 pr-2 text-right">
          {[5,4,3,2,1].map(l => <span key={l} className="leading-none">L{l}</span>)}
        </div>
        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {[5,4,3,2,1].map(likelihood =>
              [1,2,3,4,5].map(impact => {
                const cellRisks = grid[`${likelihood}-${impact}`] || []
                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    className={clsx(
                      'h-14 rounded flex items-center justify-center relative group cursor-default transition-all',
                      RISK_COLORS[5 - likelihood]?.[impact - 1] || 'bg-gray-100'
                    )}
                    title={cellRisks.map(r => r.name).join(', ')}
                  >
                    {cellRisks.length > 0 && (
                      <span className="text-sm font-bold text-gray-700">{cellRisks.length}</span>
                    )}
                    {cellRisks.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                        {cellRisks.map(r => r.name).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
          {/* X axis */}
          <div className="grid grid-cols-5 gap-1 mt-1">
            {[1,2,3,4,5].map(i => <div key={i} className="text-xs text-gray-400 text-center">I{i}</div>)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border" />Low</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border" />Medium</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border" />High</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border" />Critical</div>
        <span className="ml-auto">L = Likelihood · I = Impact</span>
      </div>
    </div>
  )
}

function RiskForm({ initial, onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    category: initial?.category || '',
    likelihood: initial?.likelihood || 3,
    impact: initial?.impact || 3,
    status: initial?.status || 'OPEN',
  })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))

  const score = Number(form.likelihood) * Number(form.impact)
  const scoreColor = score >= 16 ? 'text-red-700 bg-red-100' : score >= 9 ? 'text-orange-700 bg-orange-100' : score >= 4 ? 'text-yellow-700 bg-yellow-100' : 'text-green-700 bg-green-100'

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, likelihood: Number(form.likelihood), impact: Number(form.impact) }) }} className="space-y-4">
      <div>
        <label className="label">Risk Name *</label>
        <input className="input" value={form.name} onChange={set('name')} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={set('category')}>
            <option value="">— Select —</option>
            {['Strategic','Operational','Financial','Technology','Compliance','Human Resources','External'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            {['OPEN','MITIGATED','ACCEPTED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Likelihood (1–5)</label>
          <input type="range" min={1} max={5} className="w-full accent-brand-700 mt-2" value={form.likelihood} onChange={set('likelihood')} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Rare</span><span>Unlikely</span><span>Possible</span><span>Likely</span><span>Almost Certain</span>
          </div>
        </div>
        <div>
          <label className="label">Impact (1–5)</label>
          <input type="range" min={1} max={5} className="w-full accent-brand-700 mt-2" value={form.impact} onChange={set('impact')} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Negligible</span><span></span><span>Moderate</span><span></span><span>Catastrophic</span>
          </div>
        </div>
      </div>
      <div className={clsx('rounded-lg px-4 py-3 flex items-center justify-between', scoreColor)}>
        <span className="text-sm font-medium">Risk Score</span>
        <span className="text-2xl font-bold">{score}</span>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : initial ? 'Update' : 'Create Risk'}</button>
      </div>
    </form>
  )
}

export default function RisksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['risks', search, statusFilter],
    queryFn: () => riskApi.list({ search: search || undefined, status: statusFilter || undefined, limit: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (v: any) => riskApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); setShowCreate(false); toast.success('Risk created') },
    onError: () => toast.error('Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: (v: any) => riskApi.update(selected.id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); setSelected(null); toast.success('Risk updated') },
    onError: () => toast.error('Failed'),
  })

  const risks = data?.items || []

  const columns = [
    {
      key: 'name', header: 'Risk',
      render: (r: any) => (
        <div>
          <p className="font-medium text-gray-900">{r.name}</p>
          {r.description && <p className="text-xs text-gray-500 truncate max-w-xs">{r.description}</p>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', width: '140px', render: (r: any) => <span className="text-sm text-gray-600">{r.category || '—'}</span> },
    {
      key: 'score', header: 'Score', width: '90px',
      render: (r: any) => {
        const s = r.likelihood * r.impact
        return (
          <span className={clsx('inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm',
            s >= 16 ? 'bg-red-100 text-red-700' : s >= 9 ? 'bg-orange-100 text-orange-700' : s >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          )}>{s}</span>
        )
      },
    },
    {
      key: 'likelihood', header: 'Likelihood', width: '110px',
      render: (r: any) => (
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => <div key={i} className={clsx('w-4 h-1.5 rounded-full', i <= r.likelihood ? 'bg-orange-400' : 'bg-gray-100')} />)}
        </div>
      ),
    },
    {
      key: 'impact', header: 'Impact', width: '110px',
      render: (r: any) => (
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => <div key={i} className={clsx('w-4 h-1.5 rounded-full', i <= r.impact ? 'bg-red-400' : 'bg-gray-100')} />)}
        </div>
      ),
    },
    { key: 'status', header: 'Status', width: '120px', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'owner', header: 'Owner', width: '130px',
      render: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : <span className="text-gray-400">—</span>,
    },
  ]

  const openCount = risks.filter((r: any) => r.status === 'OPEN').length
  const criticalCount = risks.filter((r: any) => r.likelihood * r.impact >= 16).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{risks.length} risks · {openCount} open · {criticalCount} critical</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={15} /> New Risk
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Risks', value: risks.length, color: 'text-gray-900' },
          { label: 'Open Risks', value: openCount, color: 'text-red-600' },
          { label: 'Critical (≥16)', value: criticalCount, color: 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={clsx('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <HeatMap risks={risks} />

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['OPEN','MITIGATED','ACCEPTED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Table
        columns={columns}
        data={risks}
        loading={isLoading}
        onRowClick={setSelected}
        emptyText="No risks registered"
        emptyIcon={<Shield size={40} className="opacity-30" />}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Risk" size="md">
        <RiskForm onSubmit={createMutation.mutate} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit Risk" size="md">
        {selected && (
          <RiskForm initial={selected} onSubmit={updateMutation.mutate} onCancel={() => setSelected(null)} loading={updateMutation.isPending} />
        )}
      </Modal>
    </div>
  )
}
