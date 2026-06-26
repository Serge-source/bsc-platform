import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Target, Plus, ChevronRight, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function StrategyMap({ objectives, perspectives }: { objectives: any[]; perspectives: any[] }) {
  const byPerspective: Record<string, any[]> = {}
  objectives.forEach(obj => {
    const key = obj.perspectiveId || 'unassigned'
    if (!byPerspective[key]) byPerspective[key] = []
    byPerspective[key].push(obj)
  })

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Target size={18} className="text-brand-700" />
        Strategy Map
      </h3>
      <div className="space-y-4">
        {perspectives.map((persp: any) => {
          const objs = byPerspective[persp.id] || []
          return (
            <div key={persp.id} className="flex gap-4 items-stretch">
              {/* Perspective label */}
              <div
                className="flex-shrink-0 w-36 rounded-xl flex items-center justify-center p-3 text-white text-sm font-semibold text-center leading-tight"
                style={{ background: persp.color }}
              >
                {persp.name}
              </div>
              {/* Objectives */}
              <div className="flex-1 flex flex-wrap gap-2 items-center">
                {objs.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No objectives assigned</p>
                ) : (
                  objs.map((obj: any, idx: number) => (
                    <div key={obj.id} className="flex items-center gap-2">
                      <div className="bg-white border-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-default"
                        style={{ borderColor: persp.color }}>
                        {obj.name}
                      </div>
                      {idx < objs.length - 1 && <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Objectives are arranged by perspective. Cause-and-effect links flow from Learning → Internal → Customer → Financial.
      </p>
    </div>
  )
}

function ObjectiveCard({ obj }: { obj: any }) {
  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    LOW: 'bg-gray-100 text-gray-600',
  }
  return (
    <div className="p-3 border border-gray-200 rounded-lg hover:border-brand-300 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 flex-1">{obj.name}</p>
        <span className={clsx('badge text-xs flex-shrink-0', priorityColors[obj.priority] || 'badge-gray')}>
          {obj.priority}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {obj.perspective && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: obj.perspective.color }} />
            {obj.perspective.name}
          </span>
        )}
        {obj.kpis?.length > 0 && (
          <span className="text-gray-500">{obj.kpis.length} KPI{obj.kpis.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  )
}

function ObjectiveForm({ strategyId, onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({ name: '', description: '', perspectiveId: '', priority: 'MEDIUM', weight: 1 })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))
  const { data: perspectives } = useQuery({
    queryKey: ['perspectives'],
    queryFn: () => api.get('/perspectives').then(r => r.data),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, strategyId, weight: Number(form.weight) }) }} className="space-y-4">
      <div>
        <label className="label">Objective Name *</label>
        <input className="input" value={form.name} onChange={set('name')} required autoFocus placeholder="e.g. Increase Revenue by 20%" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Perspective</label>
          <select className="input" value={form.perspectiveId} onChange={set('perspectiveId')}>
            <option value="">— Select —</option>
            {(perspectives?.items || perspectives || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={set('priority')}>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Objective'}</button>
      </div>
    </form>
  )
}

export default function StrategyPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [showAddObj, setShowAddObj] = useState(false)
  const qc = useQueryClient()

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => api.get('/strategies').then(r => r.data),
  })

  const { data: perspectives } = useQuery({
    queryKey: ['perspectives'],
    queryFn: () => api.get('/perspectives').then(r => r.data),
  })

  const { data: objectives } = useQuery({
    queryKey: ['objectives', selectedStrategy],
    queryFn: () => api.get('/objectives', { params: { strategyId: selectedStrategy, limit: 100 } }).then(r => r.data),
    enabled: !!selectedStrategy,
  })

  const addObjectiveMutation = useMutation({
    mutationFn: (v: any) => api.post('/objectives', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['objectives'] }); setShowAddObj(false); toast.success('Objective added') },
    onError: () => toast.error('Failed'),
  })

  const strategyList = strategies?.items || strategies || []
  const perspectiveList = perspectives?.items || perspectives || []
  const objectiveList = objectives?.items || []

  const activeStrategy = strategyList.find((s: any) => s.id === selectedStrategy) || strategyList[0]

  // Auto-select first strategy
  if (!selectedStrategy && strategyList.length > 0 && strategyList[0]?.id) {
    setSelectedStrategy(strategyList[0].id)
  }

  const themeColors = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vision · Mission · Strategic Objectives · Strategy Map</p>
        </div>
      </div>

      {/* Strategy selector */}
      {strategyList.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {strategyList.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelectedStrategy(s.id)}
              className={clsx('px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                selectedStrategy === s.id
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
              )}
            >
              {s.name}
              <span className={clsx('ml-2 text-xs', selectedStrategy === s.id ? 'text-brand-200' : 'text-gray-400')}>
                {s.startDate?.slice(0, 4)}–{s.endDate?.slice(0, 4)}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeStrategy && (
        <>
          {/* Mission / Vision */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Mission', value: activeStrategy.organization?.mission || activeStrategy.mission, color: 'border-brand-500' },
              { label: 'Vision', value: activeStrategy.organization?.vision || activeStrategy.vision, color: 'border-purple-500' },
              { label: 'Core Values', value: activeStrategy.organization?.values || activeStrategy.values, color: 'border-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className={clsx('card p-4 border-t-4', color)}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{value || <span className="text-gray-400 italic">Not defined</span>}</p>
              </div>
            ))}
          </div>

          {/* Themes */}
          {activeStrategy.themes?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Strategic Themes</h3>
              <div className="flex flex-wrap gap-2">
                {activeStrategy.themes.map((theme: any, i: number) => (
                  <span key={theme.id} className="px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: theme.color || themeColors[i % themeColors.length] }}>
                    {theme.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Map */}
          <StrategyMap objectives={objectiveList} perspectives={perspectiveList} />

          {/* Objectives */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Strategic Objectives ({objectiveList.length})</h3>
              <button onClick={() => setShowAddObj(true)} className="btn-primary text-sm py-1.5">
                <Plus size={14} /> Add Objective
              </button>
            </div>

            {perspectiveList.length > 0 ? (
              <div className="space-y-6">
                {perspectiveList.map((persp: any) => {
                  const objs = objectiveList.filter((o: any) => o.perspectiveId === persp.id)
                  const unassigned = objectiveList.filter((o: any) => !o.perspectiveId)
                  const showList = persp.id === perspectiveList[perspectiveList.length - 1]?.id
                    ? [...objs, ...unassigned]
                    : objs
                  if (showList.length === 0) return null
                  return (
                    <div key={persp.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full" style={{ background: persp.color }} />
                        <span className="text-sm font-semibold text-gray-700">{persp.name}</span>
                        <span className="badge badge-gray">{showList.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {showList.map((obj: any) => <ObjectiveCard key={obj.id} obj={obj} />)}
                      </div>
                    </div>
                  )
                })}
                {objectiveList.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-6">No objectives yet. Add your first strategic objective.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {objectiveList.map((obj: any) => <ObjectiveCard key={obj.id} obj={obj} />)}
              </div>
            )}
          </div>
        </>
      )}

      {!isLoading && strategyList.length === 0 && (
        <div className="card p-12 flex flex-col items-center text-gray-400">
          <Target size={40} className="mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No strategy defined yet</p>
          <p className="text-sm mt-1">Create your first strategic plan to get started</p>
        </div>
      )}

      <Modal open={showAddObj} onClose={() => setShowAddObj(false)} title="Add Strategic Objective" size="md">
        <ObjectiveForm
          strategyId={selectedStrategy}
          onSubmit={addObjectiveMutation.mutate}
          onCancel={() => setShowAddObj(false)}
          loading={addObjectiveMutation.isPending}
        />
      </Modal>
    </div>
  )
}
