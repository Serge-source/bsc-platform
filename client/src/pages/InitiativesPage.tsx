import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Rocket, Search, Calendar, DollarSign } from 'lucide-react'
import { initiativeApi } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function InitiativeCard({ item, onClick }: { item: any; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'border-l-blue-500',
    PLANNING: 'border-l-purple-400',
    COMPLETED: 'border-l-green-500',
    ON_HOLD: 'border-l-yellow-400',
    CANCELLED: 'border-l-gray-300',
  }

  return (
    <div
      onClick={onClick}
      className={clsx('card p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4', statusColors[item.status] || 'border-l-gray-200')}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
          {item.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-gray-700">{item.completion || 0}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all',
              item.completion >= 100 ? 'bg-green-500' :
              item.completion >= 60 ? 'bg-blue-500' :
              item.completion >= 30 ? 'bg-yellow-500' : 'bg-red-400'
            )}
            style={{ width: `${item.completion || 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {item.endDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {item.budget && (
            <span className="flex items-center gap-1">
              <DollarSign size={11} />
              {Number(item.budget).toLocaleString()}
            </span>
          )}
        </div>
        {item.owner && (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
              {item.owner.firstName?.[0]}{item.owner.lastName?.[0]}
            </div>
            <span>{item.owner.firstName}</span>
          </div>
        )}
      </div>

      {item.milestones?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5">Milestones</p>
          <div className="space-y-1">
            {item.milestones.slice(0, 3).map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                  m.status === 'COMPLETED' ? 'bg-green-500' :
                  m.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                  m.status === 'OVERDUE' ? 'bg-red-500' : 'bg-gray-300'
                )} />
                <span className={clsx('truncate', m.status === 'COMPLETED' && 'line-through text-gray-400')}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InitiativeForm({ initial, onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    type: initial?.type || 'PROJECT',
    status: initial?.status || 'PLANNING',
    priority: initial?.priority || 'MEDIUM',
    startDate: initial?.startDate?.slice(0, 10) || '',
    endDate: initial?.endDate?.slice(0, 10) || '',
    budget: initial?.budget || '',
    completion: initial?.completion || 0,
  })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, budget: form.budget ? Number(form.budget) : null, completion: Number(form.completion) }) }} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input className="input" value={form.name} onChange={set('name')} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={set('type')}>
            {['PROJECT','PROGRAM','ACTION_PLAN'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={set('priority')}>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            {['PLANNING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Completion %</label>
          <input type="number" className="input" min={0} max={100} value={form.completion} onChange={set('completion')} />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input" value={form.endDate} onChange={set('endDate')} />
        </div>
        <div className="col-span-2">
          <label className="label">Budget (USD)</label>
          <input type="number" className="input" value={form.budget} onChange={set('budget')} placeholder="0" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : initial ? 'Update' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function InitiativesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['initiatives', search, statusFilter],
    queryFn: () => initiativeApi.list({ search: search || undefined, status: statusFilter || undefined, limit: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (v: any) => initiativeApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['initiatives'] }); setShowCreate(false); toast.success('Initiative created') },
    onError: () => toast.error('Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: (v: any) => initiativeApi.update(selected.id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['initiatives'] }); setSelected(null); toast.success('Updated') },
    onError: () => toast.error('Failed'),
  })

  const items = data?.items || []
  const byStatus: Record<string, any[]> = {}
  items.forEach((i: any) => { if (!byStatus[i.status]) byStatus[i.status] = []; byStatus[i.status].push(i) })

  const statuses = ['PLANNING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Initiatives & Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} initiatives</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['grid','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={clsx('px-3 py-1.5 text-sm', view === v ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                {v === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={15} /> New Initiative
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {statuses.map(s => {
          const count = byStatus[s]?.length || 0
          return count > 0 ? (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                s === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-transparent' :
                s === 'COMPLETED' ? 'bg-green-100 text-green-800 border-transparent' :
                s === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800 border-transparent' :
                s === 'PLANNING' ? 'bg-purple-100 text-purple-800 border-transparent' :
                'bg-gray-100 text-gray-600 border-transparent',
                statusFilter === s && 'ring-2 ring-brand-500 ring-offset-1'
              )}
            >
              {s.replace('_', ' ')} ({count})
            </button>
          ) : null
        })}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Kanban view */}
      {view === 'grid' && !statusFilter ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statuses.map(s => (
            <div key={s}>
              <div className="flex items-center gap-2 mb-3">
                <div className={clsx('w-2 h-2 rounded-full',
                  s === 'IN_PROGRESS' ? 'bg-blue-500' : s === 'COMPLETED' ? 'bg-green-500' : s === 'ON_HOLD' ? 'bg-yellow-500' : s === 'PLANNING' ? 'bg-purple-500' : 'bg-gray-400'
                )} />
                <span className="text-sm font-medium text-gray-700">{s.replace('_', ' ')}</span>
                <span className="ml-auto badge badge-gray">{byStatus[s]?.length || 0}</span>
              </div>
              <div className="space-y-3">
                {(byStatus[s] || []).map((item: any) => (
                  <InitiativeCard key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-3">
          {items
            .filter((i: any) => !statusFilter || i.status === statusFilter)
            .map((item: any) => (
              <InitiativeCard key={item.id} item={item} onClick={() => setSelected(item)} />
            ))}
          {items.length === 0 && !isLoading && (
            <div className="card p-12 flex flex-col items-center text-gray-400">
              <Rocket size={40} className="mb-3 opacity-30" />
              <p>No initiatives found</p>
            </div>
          )}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Initiative" size="md">
        <InitiativeForm onSubmit={createMutation.mutate} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit Initiative" size="md">
        {selected && <InitiativeForm initial={selected} onSubmit={updateMutation.mutate} onCancel={() => setSelected(null)} loading={updateMutation.isPending} />}
      </Modal>
    </div>
  )
}
