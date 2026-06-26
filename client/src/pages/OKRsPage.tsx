import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Target, Plus, ChevronDown, ChevronRight, TrendingUp, Check, Trash2 } from 'lucide-react'
import { okrApi } from '../lib/api'

const LEVEL_COLORS: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-700',
  DEPARTMENT: 'bg-blue-100 text-blue-700',
  TEAM: 'bg-green-100 text-green-700',
  INDIVIDUAL: 'bg-gray-100 text-gray-700',
}

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

function KeyResultRow({ kr, onCheckIn }: { kr: any; onCheckIn: (kr: any) => void }) {
  const progress = kr.target > kr.baseline
    ? Math.min(100, ((kr.current - kr.baseline) / (kr.target - kr.baseline)) * 100)
    : 0

  return (
    <div className="flex items-center gap-3 py-2 pl-6 border-t border-gray-100">
      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{kr.title}</p>
        <p className="text-xs text-gray-500">{kr.current} / {kr.target} {kr.unit}</p>
      </div>
      <div className="w-32">
        <ProgressBar value={progress} />
      </div>
      <button onClick={() => onCheckIn(kr)} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">
        + Check-in
      </button>
    </div>
  )
}

function ObjectiveCard({ obj, onCheckIn }: { obj: any; onCheckIn: (kr: any) => void }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[obj.level] || 'bg-gray-100 text-gray-600'}`}>{obj.level}</span>
            <h3 className="font-semibold text-gray-900">{obj.title}</h3>
          </div>
          <ProgressBar value={obj.progress || 0} />
        </div>
        <div className="text-right text-sm text-gray-500 ml-4">
          {obj.keyResults?.length || 0} KRs
        </div>
      </div>
      {expanded && obj.keyResults?.map((kr: any) => (
        <KeyResultRow key={kr.id} kr={kr} onCheckIn={onCheckIn} />
      ))}
    </div>
  )
}

export default function OKRsPage() {
  const qc = useQueryClient()
  const [selectedCycle, setSelectedCycle] = useState<string>('')
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [showNewObj, setShowNewObj] = useState(false)
  const [checkInKR, setCheckInKR] = useState<any>(null)
  const [cycleName, setCycleName] = useState('')
  const [cycleYear, setCycleYear] = useState(new Date().getFullYear())
  const [cycleQ, setCycleQ] = useState(1)
  const [objTitle, setObjTitle] = useState('')
  const [objLevel, setObjLevel] = useState('COMPANY')
  const [checkInValue, setCheckInValue] = useState('')
  const [checkInNote, setCheckInNote] = useState('')

  const { data: cycles = [] } = useQuery({ queryKey: ['okr-cycles'], queryFn: () => okrApi.cycles().then(r => r.data) })
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['okr-objectives', selectedCycle],
    queryFn: () => okrApi.objectives(selectedCycle || undefined).then(r => r.data),
  })

  const createCycle = useMutation({
    mutationFn: (d: any) => okrApi.createCycle(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-cycles'] }); setShowNewCycle(false); setCycleName('') },
  })
  const createObj = useMutation({
    mutationFn: (d: any) => okrApi.createObjective(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); setShowNewObj(false); setObjTitle('') },
  })
  const addCheckIn = useMutation({
    mutationFn: ({ krId, data }: any) => okrApi.addCheckIn(krId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); setCheckInKR(null); setCheckInValue(''); setCheckInNote('') },
  })

  const activeCycle = cycles.find((c: any) => c.id === selectedCycle) || cycles[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Target className="text-purple-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OKRs</h1>
            <p className="text-sm text-gray-500">Objectives & Key Results</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewCycle(true)} className="btn-secondary flex items-center gap-1 text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Plus size={14} /> New Cycle
          </button>
          <button onClick={() => setShowNewObj(true)} className="flex items-center gap-1 text-sm px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus size={14} /> New Objective
          </button>
        </div>
      </div>

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {cycles.map((c: any) => (
            <button key={c.id} onClick={() => setSelectedCycle(c.id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${selectedCycle === c.id || (!selectedCycle && c === cycles[0]) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {objectives.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{objectives.length}</div>
            <div className="text-sm text-gray-500">Objectives</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{objectives.reduce((s: number, o: any) => s + (o.keyResults?.length || 0), 0)}</div>
            <div className="text-sm text-gray-500">Key Results</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {objectives.length ? Math.round(objectives.reduce((s: number, o: any) => s + (o.progress || 0), 0) / objectives.length) : 0}%
            </div>
            <div className="text-sm text-gray-500">Avg Progress</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading objectives...</div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No objectives yet</h3>
          <p className="text-gray-400 text-sm mb-4">Create a cycle first, then add objectives aligned with your strategy</p>
          <button onClick={() => setShowNewObj(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            Create First Objective
          </button>
        </div>
      ) : (
        objectives.map((obj: any) => (
          <ObjectiveCard key={obj.id} obj={obj} onCheckIn={setCheckInKR} />
        ))
      )}

      {/* New Cycle Modal */}
      {showNewCycle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New OKR Cycle</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Cycle name (e.g. Q3 2026)" value={cycleName} onChange={e => setCycleName(e.target.value)} />
            <div className="flex gap-3 mb-4">
              <input type="number" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Year" value={cycleYear} onChange={e => setCycleYear(+e.target.value)} />
              <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={cycleQ} onChange={e => setCycleQ(+e.target.value)}>
                <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                <option value={0}>Annual</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewCycle(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => createCycle.mutate({ name: cycleName || `Q${cycleQ} ${cycleYear}`, year: cycleYear, quarter: cycleQ || null, startDate: new Date(`${cycleYear}-01-01`), endDate: new Date(`${cycleYear}-12-31`) })}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Objective Modal */}
      {showNewObj && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Objective</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Objective title" value={objTitle} onChange={e => setObjTitle(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" value={objLevel} onChange={e => setObjLevel(e.target.value)}>
              <option value="COMPANY">Company</option>
              <option value="DEPARTMENT">Department</option>
              <option value="TEAM">Team</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
            <select className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
              <option value="">Select cycle...</option>
              {cycles.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewObj(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => createObj.mutate({ title: objTitle, level: objLevel, cycleId: selectedCycle || undefined })}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {checkInKR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-1">Check-in</h2>
            <p className="text-sm text-gray-500 mb-4">{checkInKR.title}</p>
            <label className="text-sm text-gray-600 block mb-1">Current value ({checkInKR.unit})</label>
            <input type="number" className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder={`Target: ${checkInKR.target}`} value={checkInValue} onChange={e => setCheckInValue(e.target.value)} />
            <label className="text-sm text-gray-600 block mb-1">Note (optional)</label>
            <textarea className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" rows={2} value={checkInNote} onChange={e => setCheckInNote(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCheckInKR(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => addCheckIn.mutate({ krId: checkInKR.id, data: { value: +checkInValue, note: checkInNote } })}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Check-in</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
