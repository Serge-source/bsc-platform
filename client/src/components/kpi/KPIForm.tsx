import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface KPIFormProps {
  initial?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  loading?: boolean
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']
const CALC_METHODS = ['LAST_VALUE', 'AVERAGE', 'SUM', 'MAX', 'MIN']

export default function KPIForm({ initial, onSubmit, onCancel, loading }: KPIFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    formula: initial?.formula || '',
    unit: initial?.unit || '',
    category: initial?.category || '',
    frequency: initial?.frequency || 'MONTHLY',
    calculationMethod: initial?.calculationMethod || 'LAST_VALUE',
    weight: initial?.weight || 1,
    target: initial?.target || '',
    minimum: initial?.minimum || '',
    maximum: initial?.maximum || '',
    warningLevel: initial?.warningLevel || '',
    criticalLevel: initial?.criticalLevel || '',
    higherIsBetter: initial?.higherIsBetter ?? true,
    perspectiveId: initial?.perspectiveId || '',
    objectiveId: initial?.objectiveId || '',
    departmentId: initial?.departmentId || '',
    dataSource: initial?.dataSource || '',
    showOnDashboard: initial?.showOnDashboard ?? true,
  })

  const { data: perspectives } = useQuery({
    queryKey: ['perspectives'],
    queryFn: () => api.get('/perspectives').then(r => r.data),
  })
  const { data: objectivesData } = useQuery({
    queryKey: ['objectives'],
    queryFn: () => api.get('/objectives').then(r => r.data),
  })
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const setCheck = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.checked }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      target: form.target !== '' ? Number(form.target) : null,
      minimum: form.minimum !== '' ? Number(form.minimum) : null,
      maximum: form.maximum !== '' ? Number(form.maximum) : null,
      warningLevel: form.warningLevel !== '' ? Number(form.warningLevel) : null,
      criticalLevel: form.criticalLevel !== '' ? Number(form.criticalLevel) : null,
      weight: Number(form.weight),
      perspectiveId: form.perspectiveId || null,
      objectiveId: form.objectiveId || null,
      departmentId: form.departmentId || null,
    }
    onSubmit(payload)
  }

  const field = (label: string, children: React.ReactNode, hint?: string) => (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4">
          {field('KPI Name *',
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Customer Satisfaction Score" required />
          )}
          {field('Description',
            <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="What does this KPI measure?" />
          )}
          {field('Formula',
            <input className="input" value={form.formula} onChange={set('formula')} placeholder="e.g. (Satisfied Customers / Total Responses) × 100" />,
            'How is this KPI calculated?'
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {field('Unit', <input className="input" value={form.unit} onChange={set('unit')} placeholder="%, Days, USD, Score…" />)}
          {field('Category', <input className="input" value={form.category} onChange={set('category')} placeholder="e.g. Customer, Financial" />)}
        </div>
      </div>

      {/* Classification */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Classification</h3>
        <div className="grid grid-cols-2 gap-4">
          {field('Perspective',
            <select className="input" value={form.perspectiveId} onChange={set('perspectiveId')}>
              <option value="">— Select perspective —</option>
              {(perspectives?.items || perspectives || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {field('Strategic Objective',
            <select className="input" value={form.objectiveId} onChange={set('objectiveId')}>
              <option value="">— Select objective —</option>
              {(objectivesData?.items || []).map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          {field('Department',
            <select className="input" value={form.departmentId} onChange={set('departmentId')}>
              <option value="">— Select department —</option>
              {(departmentsData?.items || []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {field('Data Source', <input className="input" value={form.dataSource} onChange={set('dataSource')} placeholder="PostgreSQL, Excel, Manual…" />)}
        </div>
      </div>

      {/* Measurement */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Measurement</h3>
        <div className="grid grid-cols-3 gap-4">
          {field('Frequency',
            <select className="input" value={form.frequency} onChange={set('frequency')}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
            </select>
          )}
          {field('Calculation Method',
            <select className="input" value={form.calculationMethod} onChange={set('calculationMethod')}>
              {CALC_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          )}
          {field('Weight',
            <input type="number" className="input" value={form.weight} onChange={set('weight')} min={0} max={10} step={0.1} />
          )}
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.higherIsBetter} onChange={setCheck('higherIsBetter')} className="rounded" />
            <span className="text-sm text-gray-700">Higher value is better (e.g. Revenue, Satisfaction)</span>
          </label>
        </div>
      </div>

      {/* Targets & Thresholds */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Targets & Thresholds</h3>
        <div className="grid grid-cols-2 gap-4">
          {field('Target *', <input type="number" className="input" value={form.target} onChange={set('target')} placeholder="e.g. 90" step="any" />)}
          {field('Weight', <input type="number" className="input" value={form.weight} onChange={set('weight')} step={0.1} min={0} />)}
          {field('Warning Level',
            <input type="number" className="input border-yellow-300 focus:ring-yellow-500" value={form.warningLevel} onChange={set('warningLevel')} placeholder="Alert threshold" step="any" />,
            'Triggers a warning alert'
          )}
          {field('Critical Level',
            <input type="number" className="input border-red-300 focus:ring-red-500" value={form.criticalLevel} onChange={set('criticalLevel')} placeholder="Critical threshold" step="any" />,
            'Triggers a critical alert'
          )}
          {field('Minimum', <input type="number" className="input" value={form.minimum} onChange={set('minimum')} placeholder="Acceptable minimum" step="any" />)}
          {field('Maximum', <input type="number" className="input" value={form.maximum} onChange={set('maximum')} placeholder="Acceptable maximum" step="any" />)}
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.showOnDashboard} onChange={setCheck('showOnDashboard')} className="rounded" />
          <span className="text-sm text-gray-700">Show on Executive Dashboard</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update KPI' : 'Create KPI'}
        </button>
      </div>
    </form>
  )
}
