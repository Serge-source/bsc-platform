import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2, Sparkles,
  Target, Lightbulb, Layers, Flag, BarChart2, Map, Rocket,
  Shield, DollarSign, ClipboardCheck, Loader2, RefreshCw,
} from 'lucide-react'
import { api, aiApi } from '../lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface KPIDraft { name: string; unit: string; target: string }
interface InitiativeDraft { name: string; description: string }
interface RiskDraft { name: string; likelihood: number; impact: number; mitigation: string }
interface ObjectiveDraft {
  id: string; themeId: string; name: string; description: string
  perspectiveName: string; priority: string; owner: string
  kpis: KPIDraft[]; initiatives: InitiativeDraft[]; risks: RiskDraft[]; budget: string
}
interface ThemeDraft { id: string; name: string; color: string; description: string }
interface WizardState {
  name: string; description: string; startYear: number; endYear: number
  status: string; planningCycle: string
  vision: string; mission: string; values: string[]
  themes: ThemeDraft[]
  objectives: ObjectiveDraft[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRESET_VALUES = ['Integrity','Innovation','Customer Focus','Collaboration','Accountability','Excellence','Respect','Sustainability']
const THEME_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#ec4899','#6366f1','#14b8a6']
const PRESET_THEMES = ['Customer Experience','Operational Excellence','Financial Sustainability','Digital Transformation','Innovation','Human Capital','Compliance & Governance','Growth & Expansion']
const PERSPECTIVES = ['Financial','Customer','Internal Processes','Learning & Growth']
const STEPS = [
  { label: 'General Info', icon: ClipboardCheck },
  { label: 'Identity', icon: Lightbulb },
  { label: 'Themes', icon: Layers },
  { label: 'Objectives', icon: Flag },
  { label: 'KPIs', icon: BarChart2 },
  { label: 'Strategy Map', icon: Map },
  { label: 'Initiatives', icon: Rocket },
  { label: 'Risks', icon: Shield },
  { label: 'Budget', icon: DollarSign },
  { label: 'Review', icon: Check },
]

const uid = () => Math.random().toString(36).slice(2, 9)

const defaultState = (): WizardState => ({
  name: '', description: '', startYear: new Date().getFullYear() + 1, endYear: new Date().getFullYear() + 4,
  status: 'DRAFT', planningCycle: '3_YEARS',
  vision: '', mission: '', values: [],
  themes: [], objectives: [],
})

// ─── Small helpers ──────────────────────────────────────────────────────────────
function StepHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
        <Icon size={20} className="text-brand-700" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
      checked ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
    )} onClick={onChange}>
      <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
        checked ? 'border-brand-600' : 'border-gray-300'
      )}>
        {checked && <div className="w-2 h-2 rounded-full bg-brand-600" />}
      </div>
      <span className={clsx('text-sm font-medium', checked ? 'text-brand-800' : 'text-gray-700')}>{label}</span>
    </label>
  )
}

// ─── Step 1: General Info ───────────────────────────────────────────────────────
function Step1({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  return (
    <div className="space-y-5">
      <StepHeader icon={ClipboardCheck} title="General Information" subtitle="Name your strategic plan and set the timeframe." />
      <div>
        <label className="label">Strategic Plan Name *</label>
        <input className="input" placeholder="e.g. 2027–2030 Digital Transformation Strategy" value={state.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={3} placeholder="Brief overview of the strategic plan…" value={state.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Start Year *</label>
          <input type="number" className="input" min={2020} max={2050} value={state.startYear} onChange={e => set('startYear', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">End Year *</label>
          <input type="number" className="input" min={state.startYear} max={2060} value={state.endYear} onChange={e => set('endYear', Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label mb-3">Status</label>
        <div className="grid grid-cols-3 gap-3">
          {['DRAFT','ACTIVE','ARCHIVED'].map(s => (
            <Radio key={s} label={s.charAt(0) + s.slice(1).toLowerCase()} checked={state.status === s} onChange={() => set('status', s)} />
          ))}
        </div>
      </div>
      <div>
        <label className="label mb-3">Planning Cycle</label>
        <div className="grid grid-cols-2 gap-3">
          {[['ANNUAL','Annual (1 year)'],['3_YEARS','3 Years'],['5_YEARS','5 Years'],['CUSTOM','Custom']].map(([v,l]) => (
            <Radio key={v} label={l} checked={state.planningCycle === v} onChange={() => set('planningCycle', v)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Identity ───────────────────────────────────────────────────────────
function Step2({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const [customVal, setCustomVal] = useState('')
  const toggleVal = (v: string) => set('values', state.values.includes(v) ? state.values.filter(x => x !== v) : [...state.values, v])
  const addCustom = () => {
    const t = customVal.trim()
    if (t && !state.values.includes(t)) { set('values', [...state.values, t]); setCustomVal('') }
  }

  return (
    <div className="space-y-6">
      <StepHeader icon={Lightbulb} title="Organization Identity" subtitle="Define what drives your organization — where you're going and why you exist." />
      <div>
        <label className="label">Vision</label>
        <p className="text-xs text-gray-400 mb-1.5">Where the organization wants to be in the future.</p>
        <textarea className="input resize-none" rows={3} placeholder="e.g. Become the leading digital immigration service in the Caribbean." value={state.vision} onChange={e => set('vision', e.target.value)} />
      </div>
      <div>
        <label className="label">Mission</label>
        <p className="text-xs text-gray-400 mb-1.5">What the organization does every day.</p>
        <textarea className="input resize-none" rows={3} placeholder="e.g. Deliver secure, efficient and transparent immigration services." value={state.mission} onChange={e => set('mission', e.target.value)} />
      </div>
      <div>
        <label className="label">Core Values</label>
        <p className="text-xs text-gray-400 mb-3">Select the values that define your culture.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[...PRESET_VALUES, ...state.values.filter(v => !PRESET_VALUES.includes(v))].map(v => {
            const checked = state.values.includes(v)
            return (
              <label key={v} onClick={() => toggleVal(v)} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all',
                checked ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-700 hover:border-gray-300'
              )}>
                <div className={clsx('w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0',
                  checked ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                )}>
                  {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm font-medium">{v}</span>
              </label>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Add custom value…" value={customVal} onChange={e => setCustomVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
          <button type="button" onClick={addCustom} className="btn-secondary !px-3"><Plus size={16} /></button>
        </div>
        {state.values.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">Selected: {state.values.join(' · ')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Step 3: Themes ─────────────────────────────────────────────────────────────
function Step3({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const [custom, setCustom] = useState('')
  const themes = state.themes

  const addTheme = (name: string) => {
    if (!name.trim() || themes.find(t => t.name === name)) return
    const color = THEME_COLORS[themes.length % THEME_COLORS.length]
    set('themes', [...themes, { id: uid(), name: name.trim(), color, description: '' }])
    setCustom('')
  }
  const removeTheme = (id: string) => {
    set('themes', themes.filter(t => t.id !== id))
    set('objectives', state.objectives.filter(o => o.themeId !== id))
  }
  const updateColor = (id: string, color: string) => set('themes', themes.map(t => t.id === id ? { ...t, color } : t))

  return (
    <div className="space-y-5">
      <StepHeader icon={Layers} title="Strategic Themes" subtitle="Themes organize your objectives into coherent strategic pillars." />
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Suggested Themes</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRESET_THEMES.map(pt => {
            const active = !!themes.find(t => t.name === pt)
            return (
              <button key={pt} type="button" onClick={() => active ? removeTheme(themes.find(t => t.name === pt)!.id) : addTheme(pt)}
                className={clsx('text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                  active ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-700 hover:border-brand-400'
                )}>
                {active && <Check size={12} className="inline mr-1" />}{pt}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 mb-1">
          <input className="input flex-1" placeholder="Custom theme name…" value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTheme(custom))} />
          <button type="button" onClick={() => addTheme(custom)} className="btn-secondary !px-3"><Plus size={16} /></button>
        </div>
      </div>

      {themes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Themes ({themes.length})</p>
          {themes.map((theme, i) => (
            <div key={theme.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input type="color" value={theme.color} onChange={e => updateColor(theme.id, e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0.5 bg-white border border-gray-200" />
              <span className="flex-1 font-medium text-gray-800 text-sm">{theme.name}</span>
              <span className="text-xs text-gray-400">{state.objectives.filter(o => o.themeId === theme.id).length} obj.</span>
              <button type="button" onClick={() => removeTheme(theme.id)} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {themes.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Layers size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Select or add at least one theme to continue.</p>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Objectives ─────────────────────────────────────────────────────────
function Step4({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const [activeThemeId, setActiveThemeId] = useState(state.themes[0]?.id || '')
  const objectives = state.objectives

  const addObj = () => {
    if (!activeThemeId) return
    const newObj: ObjectiveDraft = {
      id: uid(), themeId: activeThemeId, name: '', description: '',
      perspectiveName: '', priority: 'HIGH', owner: '',
      kpis: [], initiatives: [], risks: [], budget: '',
    }
    set('objectives', [...objectives, newObj])
  }
  const updateObj = (id: string, field: keyof ObjectiveDraft, value: any) =>
    set('objectives', objectives.map(o => o.id === id ? { ...o, [field]: value } : o))
  const removeObj = (id: string) => set('objectives', objectives.filter(o => o.id !== id))

  const theme = state.themes.find(t => t.id === activeThemeId)
  const themeObjs = objectives.filter(o => o.themeId === activeThemeId)

  return (
    <div className="space-y-4">
      <StepHeader icon={Flag} title="Strategic Objectives" subtitle="Define what must be achieved within each theme." />

      {/* Theme tabs */}
      <div className="flex gap-2 flex-wrap">
        {state.themes.map(t => (
          <button key={t.id} onClick={() => setActiveThemeId(t.id)}
            className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
              activeThemeId === t.id ? 'text-white border-transparent' : 'text-gray-700 border-gray-200 hover:border-gray-300 bg-white'
            )}
            style={activeThemeId === t.id ? { background: t.color, borderColor: t.color } : {}}>
            {t.name}
            <span className="ml-1.5 opacity-70">{objectives.filter(o => o.themeId === t.id).length}</span>
          </button>
        ))}
      </div>

      {theme && (
        <div className="space-y-3">
          {themeObjs.map((obj, i) => (
            <div key={obj.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Objective {i + 1}</span>
                <button onClick={() => removeObj(obj.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <input className="input" placeholder="Objective name *" value={obj.name} onChange={e => updateObj(obj.id, 'name', e.target.value)} />
              <textarea className="input resize-none" rows={2} placeholder="Description (include measurable target)" value={obj.description} onChange={e => updateObj(obj.id, 'description', e.target.value)} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Perspective</label>
                  <select className="input text-sm" value={obj.perspectiveName} onChange={e => updateObj(obj.id, 'perspectiveName', e.target.value)}>
                    <option value="">— Select —</option>
                    {PERSPECTIVES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Priority</label>
                  <select className="input text-sm" value={obj.priority} onChange={e => updateObj(obj.id, 'priority', e.target.value)}>
                    {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Owner</label>
                  <input className="input text-sm" placeholder="Role or name" value={obj.owner} onChange={e => updateObj(obj.id, 'owner', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addObj} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Add Objective to {theme.name}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Step 5: KPIs ───────────────────────────────────────────────────────────────
function Step5({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const updateKpis = (objId: string, kpis: KPIDraft[]) =>
    set('objectives', state.objectives.map(o => o.id === objId ? { ...o, kpis } : o))

  return (
    <div className="space-y-5">
      <StepHeader icon={BarChart2} title="Success Measures (KPIs)" subtitle="Define how success will be measured for each objective." />
      {state.objectives.filter(o => o.name).map(obj => {
        const theme = state.themes.find(t => t.id === obj.themeId)
        return (
          <div key={obj.id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme?.color || '#3b82f6' }} />
              <p className="text-sm font-semibold text-gray-800">{obj.name}</p>
              {obj.perspectiveName && <span className="badge badge-blue text-xs">{obj.perspectiveName}</span>}
            </div>
            <div className="space-y-2">
              {obj.kpis.map((kpi, ki) => (
                <div key={ki} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-5 text-sm" placeholder="KPI name" value={kpi.name}
                    onChange={e => updateKpis(obj.id, obj.kpis.map((k, i) => i === ki ? { ...k, name: e.target.value } : k))} />
                  <input className="input col-span-3 text-sm" placeholder="Unit (%, days…)" value={kpi.unit}
                    onChange={e => updateKpis(obj.id, obj.kpis.map((k, i) => i === ki ? { ...k, unit: e.target.value } : k))} />
                  <input className="input col-span-3 text-sm" placeholder="Target" type="number" value={kpi.target}
                    onChange={e => updateKpis(obj.id, obj.kpis.map((k, i) => i === ki ? { ...k, target: e.target.value } : k))} />
                  <button className="col-span-1 p-1 text-gray-400 hover:text-red-500"
                    onClick={() => updateKpis(obj.id, obj.kpis.filter((_, i) => i !== ki))}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => updateKpis(obj.id, [...obj.kpis, { name: '', unit: '', target: '' }])}
                className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 mt-1">
                <Plus size={12} /> Add KPI
              </button>
            </div>
          </div>
        )
      })}
      {state.objectives.filter(o => o.name).length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No objectives defined yet — add objectives in Step 4.</p>
      )}
    </div>
  )
}

// ─── Step 6: Strategy Map ───────────────────────────────────────────────────────
function Step6({ state }: { state: WizardState }) {
  const perspOrder = ['Financial','Customer','Internal Processes','Learning & Growth']
  const byPersp: Record<string, ObjectiveDraft[]> = {}
  state.objectives.filter(o => o.name).forEach(o => {
    const key = o.perspectiveName || 'Other'
    if (!byPersp[key]) byPersp[key] = []
    byPersp[key].push(o)
  })

  const perspColors: Record<string, string> = {
    'Financial': '#16a34a', 'Customer': '#3b82f6',
    'Internal Processes': '#f59e0b', 'Learning & Growth': '#8b5cf6', 'Other': '#6b7280',
  }

  const rows = [...perspOrder.filter(p => byPersp[p]), ...Object.keys(byPersp).filter(p => !perspOrder.includes(p))]

  return (
    <div className="space-y-5">
      <StepHeader icon={Map} title="Strategy Map" subtitle="Auto-generated from your objectives. This is how your strategy flows from learning to financial results." />
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Map size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Add objectives in Step 4 to see the Strategy Map.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...rows].reverse().map((persp, pi) => (
            <div key={persp}>
              <div className="flex gap-3 items-stretch min-h-[3.5rem]">
                <div className="w-44 flex-shrink-0 rounded-xl flex items-center justify-center p-2 text-white text-xs font-bold text-center leading-tight"
                  style={{ background: perspColors[persp] || '#6b7280' }}>
                  {persp}
                </div>
                <div className="flex-1 flex flex-wrap gap-2 items-center py-1">
                  {byPersp[persp].map((obj, i) => (
                    <div key={obj.id} className="flex items-center gap-2">
                      <div className="bg-white border-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 shadow-sm max-w-[200px]"
                        style={{ borderColor: perspColors[persp] || '#6b7280' }}>
                        {obj.name}
                      </div>
                      {i < byPersp[persp].length - 1 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
              {pi < rows.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="w-0.5 h-4 bg-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="card p-4 bg-gray-50">
        <p className="text-xs text-gray-500">
          <strong>Reading the map:</strong> Objectives flow bottom-up — Learning & Growth capabilities enable better Internal Processes, which improve Customer outcomes, which drive Financial results.
        </p>
      </div>
    </div>
  )
}

// ─── Step 7: Initiatives ────────────────────────────────────────────────────────
function Step7({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const updateInits = (objId: string, initiatives: InitiativeDraft[]) =>
    set('objectives', state.objectives.map(o => o.id === objId ? { ...o, initiatives } : o))

  return (
    <div className="space-y-4">
      <StepHeader icon={Rocket} title="Initiatives" subtitle="What projects and initiatives will drive each objective forward?" />
      {state.objectives.filter(o => o.name).map(obj => {
        const theme = state.themes.find(t => t.id === obj.themeId)
        return (
          <div key={obj.id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme?.color || '#3b82f6' }} />
              <p className="text-sm font-semibold text-gray-800">{obj.name}</p>
            </div>
            <div className="space-y-2">
              {obj.initiatives.map((init, ii) => (
                <div key={ii} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-5 text-sm" placeholder="Initiative name" value={init.name}
                    onChange={e => updateInits(obj.id, obj.initiatives.map((x, i) => i === ii ? { ...x, name: e.target.value } : x))} />
                  <input className="input col-span-6 text-sm" placeholder="Description (optional)" value={init.description}
                    onChange={e => updateInits(obj.id, obj.initiatives.map((x, i) => i === ii ? { ...x, description: e.target.value } : x))} />
                  <button className="col-span-1 p-1 text-gray-400 hover:text-red-500"
                    onClick={() => updateInits(obj.id, obj.initiatives.filter((_, i) => i !== ii))}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => updateInits(obj.id, [...obj.initiatives, { name: '', description: '' }])}
                className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">
                <Plus size={12} /> Add Initiative
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 8: Risks ──────────────────────────────────────────────────────────────
function Step8({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const updateRisks = (objId: string, risks: RiskDraft[]) =>
    set('objectives', state.objectives.map(o => o.id === objId ? { ...o, risks } : o))

  return (
    <div className="space-y-4">
      <StepHeader icon={Shield} title="Risks" subtitle="Identify the key risks that could prevent each objective from being achieved." />
      {state.objectives.filter(o => o.name).map(obj => {
        const theme = state.themes.find(t => t.id === obj.themeId)
        return (
          <div key={obj.id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme?.color || '#3b82f6' }} />
              <p className="text-sm font-semibold text-gray-800">{obj.name}</p>
            </div>
            <div className="space-y-3">
              {obj.risks.map((risk, ri) => (
                <div key={ri} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex gap-2 items-center">
                    <input className="input flex-1 text-sm" placeholder="Risk name" value={risk.name}
                      onChange={e => updateRisks(obj.id, obj.risks.map((x, i) => i === ri ? { ...x, name: e.target.value } : x))} />
                    <button className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                      onClick={() => updateRisks(obj.id, obj.risks.filter((_, i) => i !== ri))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Likelihood (1-5)</label>
                      <input type="range" min={1} max={5} className="w-full accent-brand-600" value={risk.likelihood}
                        onChange={e => updateRisks(obj.id, obj.risks.map((x, i) => i === ri ? { ...x, likelihood: Number(e.target.value) } : x))} />
                      <div className="flex justify-between text-xs text-gray-400"><span>Low</span><span className="font-bold text-gray-700">{risk.likelihood}</span><span>High</span></div>
                    </div>
                    <div>
                      <label className="label text-xs">Impact (1-5)</label>
                      <input type="range" min={1} max={5} className="w-full accent-brand-600" value={risk.impact}
                        onChange={e => updateRisks(obj.id, obj.risks.map((x, i) => i === ri ? { ...x, impact: Number(e.target.value) } : x))} />
                      <div className="flex justify-between text-xs text-gray-400"><span>Low</span><span className="font-bold text-gray-700">{risk.impact}</span><span>High</span></div>
                    </div>
                  </div>
                  <input className="input text-sm" placeholder="Mitigation strategy" value={risk.mitigation}
                    onChange={e => updateRisks(obj.id, obj.risks.map((x, i) => i === ri ? { ...x, mitigation: e.target.value } : x))} />
                </div>
              ))}
              <button onClick={() => updateRisks(obj.id, [...obj.risks, { name: '', likelihood: 2, impact: 3, mitigation: '' }])}
                className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">
                <Plus size={12} /> Add Risk
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 9: Budget ─────────────────────────────────────────────────────────────
function Step9({ state, set }: { state: WizardState; set: (k: keyof WizardState, v: any) => void }) {
  const updateBudget = (objId: string, budget: string) =>
    set('objectives', state.objectives.map(o => o.id === objId ? { ...o, budget } : o))
  const total = state.objectives.reduce((s, o) => s + (Number(o.budget) || 0), 0)

  return (
    <div className="space-y-5">
      <StepHeader icon={DollarSign} title="Budget Allocation" subtitle="Optional — assign budget estimates to each objective." />
      <div className="space-y-2">
        {state.objectives.filter(o => o.name).map(obj => {
          const theme = state.themes.find(t => t.id === obj.themeId)
          return (
            <div key={obj.id} className="flex items-center gap-4 p-3 card">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: theme?.color || '#3b82f6' }} />
              <span className="flex-1 text-sm text-gray-800">{obj.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">$</span>
                <input type="number" className="input w-36 text-sm text-right" placeholder="0" min={0}
                  value={obj.budget} onChange={e => updateBudget(obj.id, e.target.value)} />
              </div>
            </div>
          )
        })}
      </div>
      {state.objectives.some(o => o.budget) && (
        <div className="flex justify-between items-center px-4 py-3 bg-brand-50 rounded-xl border border-brand-100">
          <span className="font-semibold text-brand-800">Total Budget</span>
          <span className="text-xl font-bold text-brand-700">${total.toLocaleString()}</span>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">Budget details can be refined in the Budget module after publishing.</p>
    </div>
  )
}

// ─── Step 10: Review ────────────────────────────────────────────────────────────
function Step10({ state }: { state: WizardState }) {
  const totalKPIs = state.objectives.reduce((s, o) => s + o.kpis.filter(k => k.name).length, 0)
  const totalInitiatives = state.objectives.reduce((s, o) => s + o.initiatives.filter(i => i.name).length, 0)
  const totalRisks = state.objectives.reduce((s, o) => s + o.risks.filter(r => r.name).length, 0)
  const namedObjs = state.objectives.filter(o => o.name).length

  const checks = [
    { label: 'Plan Name', ok: !!state.name },
    { label: 'Vision', ok: !!state.vision },
    { label: 'Mission', ok: !!state.mission },
    { label: 'Core Values', ok: state.values.length > 0 },
    { label: 'Strategic Themes', ok: state.themes.length > 0 },
    { label: 'Objectives', ok: namedObjs > 0 },
  ]
  const ready = checks.every(c => c.ok)

  return (
    <div className="space-y-5">
      <StepHeader icon={Check} title="Final Review" subtitle="Review your strategic plan before publishing." />

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Themes', value: state.themes.length, color: 'text-purple-700' },
          { label: 'Objectives', value: namedObjs, color: 'text-blue-700' },
          { label: 'KPIs', value: totalKPIs, color: 'text-green-700' },
          { label: 'Initiatives', value: totalInitiatives, color: 'text-orange-700' },
          { label: 'Risks', value: totalRisks, color: 'text-red-700' },
          { label: 'Years', value: `${state.startYear}–${state.endYear}`, color: 'text-gray-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Completion Checklist</p>
        <div className="space-y-2">
          {checks.map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                ok ? 'bg-green-500' : 'bg-gray-200')}>
                {ok ? <Check size={12} strokeWidth={3} className="text-white" /> : <span className="text-gray-400 text-xs">!</span>}
              </div>
              <span className={clsx('text-sm', ok ? 'text-gray-700' : 'text-red-500')}>{label}</span>
              {!ok && <span className="text-xs text-red-400">— required</span>}
            </div>
          ))}
        </div>
      </div>

      {state.vision && (
        <div className="card p-4 border-l-4 border-brand-500">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Vision</p>
          <p className="text-sm text-gray-700 italic">"{state.vision}"</p>
        </div>
      )}

      {ready ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 rounded-xl border border-green-200">
          <Check size={18} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">Ready to publish</span>
        </div>
      ) : (
        <div className="px-4 py-3 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-800">Complete the required fields above before publishing.</p>
        </div>
      )}
    </div>
  )
}

// ─── AI Assistant Panel ─────────────────────────────────────────────────────────
function AIAssistantPanel({ onApply, onClose }: { onApply: (draft: any) => void; onClose: () => void }) {
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: () => api.get('/organizations').then(r => r.data?.items?.[0] || r.data) })
  const [form, setForm] = useState({ orgType: '', industry: '', priorities: '', challenges: '', framework: 'Balanced Scorecard' })
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  const generate = async () => {
    if (!form.orgType || !form.industry || !form.priorities) {
      toast.error('Please fill in Organization Type, Industry, and Priorities')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/ai/generate-strategy', { ...form, orgName: org?.name || '' })
      onApply(data)
      toast.success('AI strategy draft generated! Review and customize each step.')
      onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'AI generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">AI Strategy Assistant</h3>
              <p className="text-xs text-gray-500">Answer a few questions to generate a draft plan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="label">What type of organization are you? *</label>
            <select className="input" value={form.orgType} onChange={set('orgType')}>
              <option value="">— Select —</option>
              {['Government Agency','Regulatory Body','Public Institution','Ministry','State-Owned Enterprise','Non-Profit','Private Company','Healthcare','Educational Institution','Financial Institution'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Industry or Sector *</label>
            <input className="input" placeholder="e.g. Immigration Services, Healthcare, Financial Services…" value={form.industry} onChange={set('industry')} />
          </div>
          <div>
            <label className="label">Top Priorities (next 3–5 years) *</label>
            <textarea className="input resize-none" rows={3} placeholder="e.g. Digitize services, reduce processing time, improve citizen satisfaction, achieve ISO certification…" value={form.priorities} onChange={set('priorities')} />
          </div>
          <div>
            <label className="label">Key Challenges</label>
            <textarea className="input resize-none" rows={2} placeholder="e.g. Aging systems, budget constraints, skills shortage, regulatory changes…" value={form.challenges} onChange={set('challenges')} />
          </div>
          <div>
            <label className="label">Strategic Framework</label>
            <select className="input" value={form.framework} onChange={set('framework')}>
              {['Balanced Scorecard','OKRs (Objectives & Key Results)','SWOT Analysis','PESTLE Framework','Blue Ocean Strategy','Porter\'s Five Forces'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-800">
            <p className="font-semibold mb-1 flex items-center gap-1.5"><Sparkles size={13} /> What will be generated:</p>
            <ul className="space-y-0.5 text-xs text-purple-700">
              <li>• Vision & Mission statements</li>
              <li>• 4–6 strategic themes with objectives</li>
              <li>• KPI suggestions per objective</li>
              <li>• Recommended initiatives</li>
              <li>• Risk identification</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <button onClick={generate} disabled={loading} className="btn-primary w-full gap-2 justify-center py-3">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generating your strategy…</> : <><Sparkles size={16} /> Generate Strategic Plan Draft</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ────────────────────────────────────────────────────────────────
export default function StrategyWizardModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(defaultState)
  const [showAI, setShowAI] = useState(false)
  const qc = useQueryClient()

  const set = useCallback((k: keyof WizardState, v: any) => setState(prev => ({ ...prev, [k]: v })), [])

  const applyAIDraft = (draft: any) => {
    setState(prev => {
      const themes: ThemeDraft[] = (draft.themes || []).map((t: any, i: number) => ({
        id: uid(), name: t.name, color: t.color || THEME_COLORS[i % THEME_COLORS.length], description: t.description || '',
      }))
      const objectives: ObjectiveDraft[] = []
      ;(draft.themes || []).forEach((t: any, ti: number) => {
        const themeId = themes[ti]?.id || ''
        ;(t.objectives || []).forEach((o: any) => {
          objectives.push({
            id: uid(), themeId, name: o.name || '', description: o.description || '',
            perspectiveName: o.perspectiveName || '', priority: o.priority || 'HIGH', owner: o.owner || '',
            kpis: (o.kpis || []).map((k: any) => ({ name: k.name || '', unit: k.unit || '', target: String(k.target || '') })),
            initiatives: (o.initiatives || []).map((i: any) => ({ name: i.name || '', description: i.description || '' })),
            risks: (o.risks || []).map((r: any) => ({ name: r.name || '', likelihood: r.likelihood || 2, impact: r.impact || 3, mitigation: r.mitigation || '' })),
            budget: '',
          })
        })
      })
      return {
        ...prev,
        name: draft.name || prev.name,
        description: draft.description || prev.description,
        vision: draft.vision || prev.vision,
        mission: draft.mission || prev.mission,
        values: draft.values || prev.values,
        themes,
        objectives,
      }
    })
  }

  const publishMutation = useMutation({
    mutationFn: () => api.post('/strategies/wizard/publish', {
      ...state,
      themes: state.themes.map(t => ({
        ...t,
        objectives: state.objectives.filter(o => o.themeId === t.id),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategies'] })
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      toast.success(`"${state.name}" published successfully!`)
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to publish'),
  })

  const namedObjs = state.objectives.filter(o => o.name).length
  const canPublish = !!state.name && !!state.vision && !!state.mission && state.themes.length > 0 && namedObjs > 0

  const stepComponents = [
    <Step1 state={state} set={set} />,
    <Step2 state={state} set={set} />,
    <Step3 state={state} set={set} />,
    <Step4 state={state} set={set} />,
    <Step5 state={state} set={set} />,
    <Step6 state={state} />,
    <Step7 state={state} set={set} />,
    <Step8 state={state} set={set} />,
    <Step9 state={state} set={set} />,
    <Step10 state={state} />,
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Strategic Plan</h2>
              <p className="text-xs text-gray-400 mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAI(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors">
                <Sparkles size={14} /> AI Assist
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < step
                const active = i === step
                return (
                  <button key={i} onClick={() => setStep(i)}
                    className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                      active ? 'bg-brand-700 text-white' : done ? 'text-green-700 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                    )}>
                    {done ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {stepComponents[step]}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="btn-secondary gap-2 disabled:opacity-40">
              <ChevronLeft size={16} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={clsx('w-2 h-2 rounded-full transition-all', i === step ? 'bg-brand-600 w-4' : 'bg-gray-300')} />
              ))}
            </div>

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} className="btn-primary gap-2">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={() => publishMutation.mutate()} disabled={!canPublish || publishMutation.isPending}
                className="btn-primary gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700">
                {publishMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : <><Check size={15} /> Publish Strategy</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {showAI && <AIAssistantPanel onApply={applyAIDraft} onClose={() => setShowAI(false)} />}
    </>
  )
}
