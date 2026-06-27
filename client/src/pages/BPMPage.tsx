import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitBranch, Plus, ArrowRight, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { bpmApi } from '../lib/api'

const MATURITY_COLORS: Record<string, string> = {
  INITIAL: 'bg-red-100 text-red-700',
  MANAGED: 'bg-orange-100 text-orange-700',
  DEFINED: 'bg-yellow-100 text-yellow-700',
  QUANTITATIVELY_MANAGED: 'bg-blue-100 text-blue-700',
  OPTIMIZING: 'bg-green-100 text-green-700',
}

const STEP_TYPE_COLORS: Record<string, string> = {
  START: 'bg-green-500',
  TASK: 'bg-blue-500',
  DECISION: 'bg-yellow-500',
  GATEWAY: 'bg-orange-500',
  END: 'bg-red-500',
}

export default function BPMPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<any>(null)
  const [showNew, setShowNew] = useState(false)
  const [showStep, setShowStep] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [owner, setOwner] = useState('')
  const [stepName, setStepName] = useState('')
  const [stepType, setStepType] = useState('TASK')
  const [stepResponsible, setStepResponsible] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data: processes = [], isLoading } = useQuery({ queryKey: ['bpm'], queryFn: () => bpmApi.list().then(r => r.data) })

  const create = useMutation({
    mutationFn: (d: any) => bpmApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bpm'] }); setShowNew(false); setName(''); setDesc(''); setOwner('') },
  })
  const del = useMutation({
    mutationFn: (id: string) => bpmApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bpm'] }); if (selected) setSelected(null) },
  })
  const addStep = useMutation({
    mutationFn: ({ processId, data }: any) => bpmApi.addStep(processId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bpm'] }); setShowStep(false); setStepName(''); setStepResponsible('') },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <GitBranch className="text-orange-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Process Management</h1>
            <p className="text-sm text-gray-500">Model, analyze, and optimize business processes</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-sm px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          <Plus size={14} /> New Process
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading processes...</div>
      ) : processes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <GitBranch size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No processes yet</h3>
          <p className="text-gray-400 text-sm mb-4">Document and optimize your business processes</p>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
            Create First Process
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {processes.map((proc: any) => (
            <div key={proc.id} className="bg-white rounded-xl border shadow-sm">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => setExpanded(e => ({ ...e, [proc.id]: !e[proc.id] }))}>
                  {expanded[proc.id] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900">{proc.name}</h3>
                    {proc.maturityLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${MATURITY_COLORS[proc.maturityLevel] || 'bg-gray-100'}`}>{proc.maturityLevel.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{proc.owner && `Owner: ${proc.owner}`} {proc.steps?.length ? `· ${proc.steps.length} steps` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelected(proc); setShowStep(true) }} className="p-1.5 rounded hover:bg-orange-50 text-orange-600">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => del.mutate(proc.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded[proc.id] && proc.steps?.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {proc.steps.map((step: any, idx: number) => (
                      <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative group">
                          <div className={`w-20 h-16 rounded-lg flex flex-col items-center justify-center ${STEP_TYPE_COLORS[step.type] || 'bg-gray-400'} text-white text-center p-1`}>
                            <span className="text-xs font-medium leading-tight">{step.name}</span>
                            {step.responsible && <span className="text-xs opacity-75 mt-0.5">{step.responsible}</span>}
                          </div>
                          {step.duration && (
                            <div className="absolute -top-5 left-0 right-0 text-center text-xs text-gray-400">{step.duration}min</div>
                          )}
                        </div>
                        {idx < proc.steps.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Process Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Business Process</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Process name" value={name} onChange={e => setName(e.target.value)} />
            <textarea className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" rows={2} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" defaultValue="INITIAL">
              <option value="INITIAL">Initial</option>
              <option value="MANAGED">Managed</option>
              <option value="DEFINED">Defined</option>
              <option value="QUANTITATIVELY_MANAGED">Quantitatively Managed</option>
              <option value="OPTIMIZING">Optimizing</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => create.mutate({ name, description: desc, owner })} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Step Modal */}
      {showStep && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-1">Add Step</h2>
            <p className="text-sm text-gray-500 mb-4">{selected.name}</p>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Step name" value={stepName} onChange={e => setStepName(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" value={stepType} onChange={e => setStepType(e.target.value)}>
              <option value="START">Start</option>
              <option value="TASK">Task</option>
              <option value="DECISION">Decision</option>
              <option value="GATEWAY">Gateway</option>
              <option value="END">End</option>
            </select>
            <input className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" placeholder="Responsible / Role" value={stepResponsible} onChange={e => setStepResponsible(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowStep(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => addStep.mutate({ processId: selected.id, data: { name: stepName, type: stepType, responsible: stepResponsible } })}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Add Step</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

