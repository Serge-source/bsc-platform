import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Plus, Zap, AlertTriangle, CheckCircle, Loader, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { scenarioApi } from '../lib/api'

const TYPE_COLORS: Record<string, string> = {
  OPTIMISTIC: 'bg-green-100 text-green-700 border-green-200',
  BASE: 'bg-blue-100 text-blue-700 border-blue-200',
  PESSIMISTIC: 'bg-red-100 text-red-700 border-red-200',
  STRESS: 'bg-orange-100 text-orange-700 border-orange-200',
}

const IMPACT_COLORS: Record<string, string> = {
  POSITIVE: 'text-green-600',
  NEGATIVE: 'text-red-600',
  NEUTRAL: 'text-gray-500',
}

function ScenarioCard({ scenario, onAnalyze }: { scenario: any; onAnalyze: (s: any) => void }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: (id: string) => scenarioApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  })

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm mb-4 ${TYPE_COLORS[scenario.type]?.split(' ').slice(2).join(' ') || 'border-gray-200'}`}>
      <div className="flex items-start gap-3 p-4">
        <button onClick={() => setExpanded(e => !e)} className="mt-1">
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[scenario.type] || 'bg-gray-100 text-gray-600'}`}>{scenario.type}</span>
            <h3 className="font-bold text-gray-900">{scenario.name}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">{scenario.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Probability: <strong className="text-gray-800">{(scenario.probability * 100).toFixed(0)}%</strong></span>
            <span>Horizon: <strong className="text-gray-800">{scenario.horizon} yr{scenario.horizon !== 1 ? 's' : ''}</strong></span>
            <span>{scenario.assumptions?.length || 0} assumptions</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAnalyze(scenario)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Zap size={12} /> Analyze
          </button>
          <button onClick={() => del.mutate(scenario.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && scenario.assumptions?.length > 0 && (
        <div className="border-t px-4 pb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Assumptions</h4>
          <div className="space-y-1.5">
            {scenario.assumptions.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-600 flex-1">{a.parameter}</span>
                <span className="text-gray-400">{a.baselineValue}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-800">{a.projectedValue}</span>
                <span className={`text-xs font-medium ${IMPACT_COLORS[a.impact] || 'text-gray-500'}`}>{a.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScenarioPlanningPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{ scenario: any; text: string } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('BASE')
  const [probability, setProbability] = useState(0.5)
  const [horizon, setHorizon] = useState(3)

  const { data: scenarios = [], isLoading } = useQuery({ queryKey: ['scenarios'], queryFn: () => scenarioApi.list().then(r => r.data) })

  const create = useMutation({
    mutationFn: (d: any) => scenarioApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scenarios'] }); setShowNew(false); setName(''); setDesc('') },
  })

  const handleAnalyze = async (scenario: any) => {
    setIsAnalyzing(true)
    setAnalysisResult(null)
    try {
      const { data } = await scenarioApi.analyze(scenario.id)
      setAnalysisResult({ scenario, text: data.analysis })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-violet-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scenario Planning</h1>
            <p className="text-sm text-gray-500">Forecast strategic decisions and their impacts</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-sm px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
          <Plus size={14} /> New Scenario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading scenarios...</div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-gray-600 font-medium mb-1">No scenarios yet</h3>
              <p className="text-gray-400 text-sm mb-4">Model optimistic, base, and pessimistic scenarios to prepare for the future</p>
              <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
                Create First Scenario
              </button>
            </div>
          ) : (
            scenarios.map((s: any) => <ScenarioCard key={s.id} scenario={s} onAnalyze={handleAnalyze} />)
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border p-4 sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-violet-600" />
              <h3 className="font-semibold text-gray-900">AI Analysis</h3>
            </div>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader size={20} className="animate-spin mr-2" /> Analyzing...
              </div>
            ) : analysisResult ? (
              <div>
                <div className="text-xs text-gray-500 mb-2">Scenario: <strong>{analysisResult.scenario.name}</strong></div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {analysisResult.text}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Zap size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Click "Analyze" on any scenario to get AI-powered insights</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Scenario</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Scenario name" value={name} onChange={e => setName(e.target.value)} />
            <textarea className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" rows={2} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" value={type} onChange={e => setType(e.target.value)}>
              <option value="OPTIMISTIC">Optimistic</option>
              <option value="BASE">Base Case</option>
              <option value="PESSIMISTIC">Pessimistic</option>
              <option value="STRESS">Stress Test</option>
            </select>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Probability ({(probability * 100).toFixed(0)}%)</label>
                <input type="range" min="0.05" max="0.95" step="0.05" value={probability} onChange={e => setProbability(+e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Horizon (years)</label>
                <input type="number" min="1" max="10" className="w-20 border rounded-lg px-2 py-1.5 text-sm" value={horizon} onChange={e => setHorizon(+e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => create.mutate({ name, description: desc, type, probability, horizon })} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
