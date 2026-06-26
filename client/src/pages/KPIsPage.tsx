import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BarChart2, Download } from 'lucide-react'
import { kpiApi } from '../lib/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import KPIForm from '../components/kpi/KPIForm'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual',
}

export default function KPIsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['kpis', search, statusFilter],
    queryFn: () => kpiApi.list({ search: search || undefined, status: statusFilter || undefined, limit: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (values: unknown) => kpiApi.create(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['kpi-summary'] })
      setShowCreate(false)
      toast.success('KPI created')
    },
    onError: () => toast.error('Failed to create KPI'),
  })

  const kpis = data?.items || []

  const statusCounts = kpis.reduce((acc: Record<string, number>, kpi: any) => {
    const s = kpi.values?.[0]?.status || 'NO_DATA'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const columns = [
    {
      key: 'name', header: 'KPI Name',
      render: (kpi: any) => (
        <div>
          <p className="font-medium text-gray-900">{kpi.name}</p>
          {kpi.description && <p className="text-xs text-gray-500 truncate max-w-xs">{kpi.description}</p>}
        </div>
      ),
    },
    {
      key: 'perspective', header: 'Perspective', width: '160px',
      render: (kpi: any) => kpi.perspective ? (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: kpi.perspective.color }} />
          <span className="text-sm">{kpi.perspective.name}</span>
        </div>
      ) : <span className="text-gray-400 text-sm">—</span>,
    },
    {
      key: 'status', header: 'Status', width: '120px',
      render: (kpi: any) => <StatusBadge status={kpi.values?.[0]?.status || 'NO_DATA'} />,
    },
    {
      key: 'actual', header: 'Actual / Target', width: '160px',
      render: (kpi: any) => {
        const v = kpi.values?.[0]
        return (
          <div>
            <span className="font-semibold text-gray-900">
              {v?.actual != null ? Number(v.actual).toLocaleString() : '—'}
            </span>
            <span className="text-gray-400 text-xs mx-1">/</span>
            <span className="text-gray-600 text-sm">{kpi.target?.toLocaleString() ?? '—'}</span>
            {kpi.unit && <span className="text-gray-400 text-xs ml-1">{kpi.unit}</span>}
          </div>
        )
      },
    },
    {
      key: 'progress', header: 'Progress', width: '140px',
      render: (kpi: any) => {
        const v = kpi.values?.[0]
        const pct = v?.actual != null && kpi.target ? Math.min(120, Math.round((v.actual / kpi.target) * 100)) : null
        const status = v?.status || 'NO_DATA'
        return pct != null ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full',
                  status === 'ON_TARGET' || status === 'EXCEEDED' ? 'bg-green-500' :
                  status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 w-10 text-right">{pct}%</span>
          </div>
        ) : <span className="text-gray-400 text-xs">No data</span>
      },
    },
    {
      key: 'frequency', header: 'Frequency', width: '110px',
      render: (kpi: any) => <span className="text-sm text-gray-600">{FREQ_LABELS[kpi.frequency] || kpi.frequency}</span>,
    },
    {
      key: 'owner', header: 'Owner', width: '140px',
      render: (kpi: any) => kpi.owner ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
            {kpi.owner.firstName?.[0]}{kpi.owner.lastName?.[0]}
          </div>
          <span className="text-sm text-gray-700 truncate">{kpi.owner.firstName} {kpi.owner.lastName}</span>
        </div>
      ) : <span className="text-gray-400 text-sm">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{kpis.length} indicators tracked</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={15} /> New KPI
          </button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: `All (${kpis.length})`, color: 'bg-gray-100 text-gray-700' },
          { key: 'ON_TARGET', label: `On Target (${(statusCounts['ON_TARGET'] || 0) + (statusCounts['EXCEEDED'] || 0)})`, color: 'bg-green-100 text-green-800' },
          { key: 'WARNING',   label: `Warning (${statusCounts['WARNING'] || 0})`,   color: 'bg-yellow-100 text-yellow-800' },
          { key: 'CRITICAL',  label: `Critical (${statusCounts['CRITICAL'] || 0})`,  color: 'bg-red-100 text-red-800' },
          { key: 'NO_DATA',   label: `No Data (${statusCounts['NO_DATA'] || 0})`,    color: 'bg-gray-100 text-gray-600' },
        ].map(pill => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(prev => prev === pill.key ? '' : pill.key)}
            className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
              pill.color,
              statusFilter === pill.key ? 'border-brand-500 ring-1 ring-brand-400' : 'border-transparent'
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search KPIs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        data={kpis}
        loading={isLoading}
        onRowClick={kpi => navigate(`/kpis/${kpi.id}`)}
        emptyText="No KPIs found. Create your first KPI."
        emptyIcon={<BarChart2 size={40} className="opacity-30" />}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create KPI" size="xl">
        <KPIForm
          onSubmit={createMutation.mutate}
          onCancel={() => setShowCreate(false)}
          loading={createMutation.isPending}
        />
      </Modal>
    </div>
  )
}
