import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, Plus, Star, ChevronDown, ChevronRight } from 'lucide-react'
import { appraisalApi } from '../lib/api'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SELF_REVIEW: 'bg-yellow-100 text-yellow-700',
  MANAGER_REVIEW: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  APPROVED: 'bg-purple-100 text-purple-700',
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={14} className={i < value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

function FormCard({ form }: { form: any }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const update = useMutation({
    mutationFn: ({ id, data }: any) => appraisalApi.updateForm(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appraisal-forms'] }),
  })

  const STATUS_NEXT: Record<string, string> = {
    DRAFT: 'IN_PROGRESS',
    IN_PROGRESS: 'SELF_REVIEW',
    SELF_REVIEW: 'MANAGER_REVIEW',
    MANAGER_REVIEW: 'COMPLETED',
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm mb-3">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-sm font-semibold text-purple-700">
          {form.employee?.firstName?.[0]}{form.employee?.lastName?.[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{form.employee?.firstName} {form.employee?.lastName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[form.status] || 'bg-gray-100'}`}>{form.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-gray-500">{form.employee?.title} · {form.employee?.department}</p>
        </div>
        {form.overallScore && (
          <div className="text-right">
            <div className="font-bold text-gray-900">{form.overallScore?.toFixed(1)}</div>
            <StarRating value={Math.round(form.overallScore)} />
          </div>
        )}
        {STATUS_NEXT[form.status] && (
          <button onClick={e => { e.stopPropagation(); update.mutate({ id: form.id, data: { status: STATUS_NEXT[form.status] } }) }}
            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 ml-2">
            Advance
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4">
          {form.objectives?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Objectives</h4>
              <div className="space-y-2">
                {form.objectives.map((obj: any) => (
                  <div key={obj.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{obj.title}</p>
                      {obj.description && <p className="text-xs text-gray-500">{obj.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {obj.selfScore && <div className="text-xs text-gray-500">Self: {obj.selfScore}/5</div>}
                      {obj.managerScore && <div className="text-xs text-gray-800 font-medium">Mgr: {obj.managerScore}/5</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {form.competencies?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Competencies</h4>
              <div className="space-y-1.5">
                {form.competencies.map((comp: any) => (
                  <div key={comp.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{comp.name}</span>
                    {comp.managerScore && <StarRating value={comp.managerScore} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {form.managerComments && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Manager Comments</p>
              <p className="text-sm text-gray-700">{form.managerComments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AppraisalsPage() {
  const qc = useQueryClient()
  const [selectedCycle, setSelectedCycle] = useState('')
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [cycleYear, setCycleYear] = useState(new Date().getFullYear())
  const [cycleType, setCycleType] = useState('ANNUAL')

  const { data: cycles = [] } = useQuery({ queryKey: ['appraisal-cycles'], queryFn: () => appraisalApi.cycles().then(r => r.data) })
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['appraisal-forms', selectedCycle],
    queryFn: () => appraisalApi.forms(selectedCycle ? { cycleId: selectedCycle } : {}).then(r => r.data),
  })

  const createCycle = useMutation({
    mutationFn: (d: any) => appraisalApi.createCycle(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appraisal-cycles'] }); setShowNewCycle(false); setCycleName('') },
  })

  const stats = {
    total: forms.length,
    completed: forms.filter((f: any) => f.status === 'COMPLETED' || f.status === 'APPROVED').length,
    inProgress: forms.filter((f: any) => f.status === 'IN_PROGRESS' || f.status === 'SELF_REVIEW' || f.status === 'MANAGER_REVIEW').length,
    avgScore: forms.filter((f: any) => f.overallScore).length
      ? forms.filter((f: any) => f.overallScore).reduce((s: number, f: any) => s + f.overallScore, 0) / forms.filter((f: any) => f.overallScore).length
      : null,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <UserCheck className="text-purple-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Appraisals</h1>
            <p className="text-sm text-gray-500">Employee performance aligned with strategy</p>
          </div>
        </div>
        <button onClick={() => setShowNewCycle(true)} className="flex items-center gap-1 text-sm px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Plus size={14} /> New Cycle
        </button>
      </div>

      {cycles.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button onClick={() => setSelectedCycle('')}
            className={`px-4 py-2 text-sm rounded-lg border ${!selectedCycle ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            All Cycles
          </button>
          {cycles.map((c: any) => (
            <button key={c.id} onClick={() => setSelectedCycle(c.id)}
              className={`px-4 py-2 text-sm rounded-lg border ${selectedCycle === c.id ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {c.name} {c.year}
            </button>
          ))}
        </div>
      )}

      {forms.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Forms</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.avgScore ? stats.avgScore.toFixed(1) : '—'}</div>
            <div className="text-sm text-gray-500">Avg Score</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading appraisals...</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <UserCheck size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No appraisals yet</h3>
          <p className="text-gray-400 text-sm">Create an appraisal cycle and add employee forms</p>
        </div>
      ) : (
        forms.map((form: any) => <FormCard key={form.id} form={form} />)
      )}

      {showNewCycle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Appraisal Cycle</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Cycle name" value={cycleName} onChange={e => setCycleName(e.target.value)} />
            <div className="flex gap-3 mb-3">
              <input type="number" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Year" value={cycleYear} onChange={e => setCycleYear(+e.target.value)} />
              <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={cycleType} onChange={e => setCycleType(e.target.value)}>
                <option value="ANNUAL">Annual</option>
                <option value="SEMI_ANNUAL">Semi-Annual</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="PROBATION">Probation</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setShowNewCycle(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => createCycle.mutate({ name: cycleName || `${cycleType} ${cycleYear}`, year: cycleYear, type: cycleType, startDate: new Date(`${cycleYear}-01-01`), endDate: new Date(`${cycleYear}-12-31`) })}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
