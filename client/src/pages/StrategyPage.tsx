import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target, Plus, ArrowRight, ChevronDown, ChevronUp,
  BarChart2, Rocket, Shield, Layers, Lightbulb, Flag,
  Edit2, Trash2, CheckCircle, Clock, AlertCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import StrategyWizardModal from './StrategyWizardModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Strategy Map ───────────────────────────────────────────────────────────────
function StrategyMap({ objectives, perspectives }: { objectives: any[]; perspectives: any[] }) {
  const perspOrder = ['Learning & Growth', 'Internal Processes', 'Customer', 'Financial']
  const byPerspective: Record<string, any[]> = {}
  objectives.forEach(obj => {
    const key = obj.perspectiveId || 'unassigned'
    if (!byPerspective[key]) byPerspective[key] = []
    byPerspective[key].push(obj)
  })

  const ordered = [
    ...perspectives.filter(p => perspOrder.includes(p.name)).sort((a, b) => perspOrder.indexOf(a.name) - perspOrder.indexOf(b.name)),
    ...perspectives.filter(p => !perspOrder.includes(p.name)),
  ]

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <Target size={18} className="text-brand-700" /> Strategy Map
      </h3>
      <div className="space-y-3">
        {ordered.map((persp: any, pi: number) => {
          const objs = byPerspective[persp.id] || []
          if (objs.length === 0) return null
          return (
            <div key={persp.id}>
              <div className="flex gap-3 items-stretch min-h-[3.5rem]">
                <div className="w-40 flex-shrink-0 rounded-xl flex items-center justify-center p-2 text-white text-xs font-bold text-center leading-tight"
                  style={{ background: persp.color }}>
                  {persp.name}
                </div>
                <div className="flex-1 flex flex-wrap gap-2 items-center py-1">
                  {objs.map((obj: any, idx: number) => (
                    <div key={obj.id} className="flex items-center gap-2">
                      <div className="bg-white border-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderColor: persp.color }}>
                        {obj.name}
                        {obj.kpis?.length > 0 && <span className="ml-1.5 text-gray-400 text-xs">({obj.kpis.length} KPI{obj.kpis.length > 1 ? 's' : ''})</span>}
                      </div>
                      {idx < objs.length - 1 && <ArrowRight size={13} className="text-gray-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
              {pi < ordered.filter(p => (byPerspective[p.id] || []).length > 0).length - 1 && (
                <div className="flex justify-start pl-20 my-1">
                  <div className="w-0.5 h-4 bg-gray-200" />
                </div>
              )}
            </div>
          )
        })}
        {objectives.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8 italic">No objectives yet — add objectives to build the strategy map.</p>
        )}
      </div>
    </div>
  )
}

// ─── Objective card ─────────────────────────────────────────────────────────────
function ObjectiveCard({ obj, onEdit }: { obj: any; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const priorityConfig: Record<string, { cls: string; dots: number }> = {
    CRITICAL: { cls: 'bg-red-100 text-red-700', dots: 5 },
    HIGH: { cls: 'bg-orange-100 text-orange-700', dots: 4 },
    MEDIUM: { cls: 'bg-blue-100 text-blue-700', dots: 3 },
    LOW: { cls: 'bg-gray-100 text-gray-600', dots: 2 },
  }
  const pc = priorityConfig[obj.priority] || priorityConfig.MEDIUM

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-brand-200 transition-colors">
      <div className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{obj.name}</p>
            <span className={clsx('badge text-xs flex-shrink-0', pc.cls)}>{obj.priority}</span>
          </div>
          {obj.description && !expanded && (
            <p className="text-xs text-gray-500 line-clamp-1">{obj.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
            {obj.perspective && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: obj.perspective.color }} />
                {obj.perspective.name}
              </span>
            )}
            {obj.kpis?.length > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <BarChart2 size={10} /> {obj.kpis.length} KPI{obj.kpis.length > 1 ? 's' : ''}
              </span>
            )}
            {obj.initiatives?.length > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Rocket size={10} /> {obj.initiatives.length} initiative{obj.initiatives.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          {obj.description && <p className="text-xs text-gray-600">{obj.description}</p>}
          {obj.kpis?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">KPIs</p>
              <div className="flex flex-wrap gap-1">
                {obj.kpis.map((k: any) => (
                  <span key={k.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {k.name} {k.target ? `→ ${k.target}${k.unit || ''}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {obj.initiatives?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Initiatives</p>
              <div className="flex flex-wrap gap-1">
                {obj.initiatives.map((i: any) => (
                  <span key={i.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{i.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add objective form ─────────────────────────────────────────────────────────
function ObjectiveForm({ strategyId, themes, onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({ name: '', description: '', perspectiveId: '', themeId: '', priority: 'MEDIUM' })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))
  const { data: perspectives } = useQuery({ queryKey: ['perspectives'], queryFn: () => api.get('/perspectives').then(r => r.data) })
  const perspList = perspectives?.items || perspectives || []

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, strategyId, weight: 1 }) }} className="space-y-4">
      <div>
        <label className="label">Objective Name *</label>
        <input className="input" value={form.name} onChange={set('name')} required autoFocus placeholder="e.g. Increase Digital Services from 45% to 85%" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="Include measurable target and timeframe" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Perspective</label>
          <select className="input" value={form.perspectiveId} onChange={set('perspectiveId')}>
            <option value="">— Select —</option>
            {perspList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Theme</label>
          <select className="input" value={form.themeId} onChange={set('themeId')}>
            <option value="">— None —</option>
            {(themes || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Priority</label>
        <select className="input" value={form.priority} onChange={set('priority')}>
          {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Objective'}</button>
      </div>
    </form>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────────
function EmptyStrategy({ onCreateWizard }: { onCreateWizard: () => void }) {
  return (
    <div className="card p-12 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
        <Target size={32} className="text-brand-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">No Strategy Found</h3>
      <p className="text-gray-500 text-sm max-w-md mb-6">
        Start by creating your first strategic plan. Define your vision, mission, themes, and objectives to align your entire organization.
      </p>
      <div className="flex flex-col gap-3 items-center">
        <button onClick={onCreateWizard} className="btn-primary gap-2 px-6 py-3">
          <Plus size={16} /> Create Strategic Plan
        </button>
        <p className="text-xs text-gray-400">Guided 9-step wizard · AI-assisted · Takes ~10 minutes</p>
      </div>
    </div>
  )
}

// ─── Strategy header card ───────────────────────────────────────────────────────
function StrategyHeader({ strategy, objectives }: { strategy: any; objectives: any[] }) {
  const namedObjs = objectives.filter(o => o.name)
  const kpiCount = namedObjs.reduce((s: number, o: any) => s + (o.kpis?.length || 0), 0)
  const initCount = namedObjs.reduce((s: number, o: any) => s + (o.initiatives?.length || 0), 0)

  const statusIcon: Record<string, JSX.Element> = {
    ACTIVE: <CheckCircle size={14} className="text-green-500" />,
    DRAFT: <Clock size={14} className="text-amber-500" />,
    ARCHIVED: <AlertCircle size={14} className="text-gray-400" />,
  }

  return (
    <div className="card p-6 border-l-4 border-brand-600">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{strategy.name}</h2>
          {strategy.description && <p className="text-gray-500 text-sm mt-1">{strategy.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{strategy.startDate?.slice(0,4)} – {strategy.endDate?.slice(0,4)}</span>
            <span className="flex items-center gap-1">
              {statusIcon[strategy.status] || statusIcon.DRAFT}
              {strategy.status}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Layers, label: 'Themes', value: strategy.themes?.length || 0, color: 'text-purple-600' },
          { icon: Flag, label: 'Objectives', value: namedObjs.length, color: 'text-blue-600' },
          { icon: BarChart2, label: 'KPIs', value: kpiCount, color: 'text-green-600' },
          { icon: Rocket, label: 'Initiatives', value: initCount, color: 'text-orange-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <Icon size={16} className={color} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={clsx('text-lg font-bold', color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function StrategyPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [showAddObj, setShowAddObj] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
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
    queryFn: () => api.get('/objectives', { params: { strategyId: selectedStrategy, limit: 200 } }).then(r => r.data),
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

  if (!selectedStrategy && strategyList.length > 0) {
    setSelectedStrategy(strategyList[0].id)
  }

  const activeStrategy = strategyList.find((s: any) => s.id === selectedStrategy) || strategyList[0]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vision · Mission · Themes · Objectives · Strategy Map</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary gap-2">
          <Plus size={15} /> Create Strategic Plan
        </button>
      </div>

      {/* Strategy tabs */}
      {strategyList.length > 1 && (
        <div className="flex gap-3 flex-wrap">
          {strategyList.map((s: any) => (
            <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
              className={clsx('px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                selectedStrategy === s.id
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
              )}>
              {s.name}
              <span className={clsx('ml-2 text-xs', selectedStrategy === s.id ? 'text-brand-200' : 'text-gray-400')}>
                {s.startDate?.slice(0,4)}–{s.endDate?.slice(0,4)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && strategyList.length === 0 && (
        <EmptyStrategy onCreateWizard={() => setShowWizard(true)} />
      )}

      {activeStrategy && (
        <>
          {/* Strategy header */}
          <StrategyHeader strategy={activeStrategy} objectives={objectiveList} />

          {/* Vision / Mission / Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Vision', value: activeStrategy.vision || activeStrategy.organization?.vision, icon: Lightbulb, color: 'border-purple-500', iconColor: 'text-purple-600' },
              { label: 'Mission', value: activeStrategy.mission || activeStrategy.organization?.mission, icon: Target, color: 'border-brand-500', iconColor: 'text-brand-600' },
              { label: 'Core Values', value: activeStrategy.values || activeStrategy.organization?.values, icon: CheckCircle, color: 'border-green-500', iconColor: 'text-green-600' },
            ].map(({ label, value, icon: Icon, color, iconColor }) => (
              <div key={label} className={clsx('card p-4 border-t-4', color)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={iconColor} />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                </div>
                {value
                  ? <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
                  : <p className="text-sm text-gray-400 italic">Not defined</p>
                }
              </div>
            ))}
          </div>

          {/* Themes */}
          {activeStrategy.themes?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={16} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Strategic Themes</h3>
                <span className="badge badge-gray">{activeStrategy.themes.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeStrategy.themes.map((theme: any, i: number) => (
                  <div key={theme.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                    style={{ background: theme.color || '#3b82f6' }}>
                    {theme.name}
                    <span className="text-xs opacity-70">
                      {objectiveList.filter((o: any) => o.themeId === theme.id).length} obj.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Map */}
          <StrategyMap objectives={objectiveList} perspectives={perspectiveList} />

          {/* Objectives by perspective */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Strategic Objectives</h3>
                <span className="badge badge-gray">{objectiveList.filter((o: any) => o.name).length}</span>
              </div>
              <button onClick={() => setShowAddObj(true)} className="btn-secondary text-sm py-1.5 gap-1">
                <Plus size={14} /> Add Objective
              </button>
            </div>

            {perspectiveList.length > 0 ? (
              <div className="space-y-6">
                {perspectiveList.map((persp: any) => {
                  const objs = objectiveList.filter((o: any) => o.perspectiveId === persp.id)
                  if (objs.length === 0) return null
                  return (
                    <div key={persp.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full" style={{ background: persp.color }} />
                        <span className="text-sm font-semibold text-gray-700">{persp.name}</span>
                        <span className="badge badge-gray">{objs.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {objs.map((obj: any) => <ObjectiveCard key={obj.id} obj={obj} onEdit={() => {}} />)}
                      </div>
                    </div>
                  )
                })}
                {/* Unassigned */}
                {objectiveList.filter((o: any) => !o.perspectiveId && o.name).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full bg-gray-300" />
                      <span className="text-sm font-semibold text-gray-500">Unassigned</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {objectiveList.filter((o: any) => !o.perspectiveId && o.name).map((obj: any) => (
                        <ObjectiveCard key={obj.id} obj={obj} onEdit={() => {}} />
                      ))}
                    </div>
                  </div>
                )}
                {objectiveList.filter((o: any) => o.name).length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No objectives yet. Add your first strategic objective.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {objectiveList.map((obj: any) => <ObjectiveCard key={obj.id} obj={obj} onEdit={() => {}} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add objective modal */}
      <Modal open={showAddObj} onClose={() => setShowAddObj(false)} title="Add Strategic Objective" size="md">
        <ObjectiveForm
          strategyId={selectedStrategy}
          themes={activeStrategy?.themes || []}
          onSubmit={addObjectiveMutation.mutate}
          onCancel={() => setShowAddObj(false)}
          loading={addObjectiveMutation.isPending}
        />
      </Modal>

      {/* Wizard */}
      {showWizard && <StrategyWizardModal onClose={() => setShowWizard(false)} />}
    </div>
  )
}
