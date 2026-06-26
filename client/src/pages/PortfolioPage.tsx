import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Plus, ChevronDown, ChevronRight, Layers, GitBranch, CheckSquare, DollarSign } from 'lucide-react'
import { portfolioApi } from '../lib/api'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PLANNING: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-orange-100 text-orange-700',
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : 'bg-orange-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value.toFixed(0)}%</span>
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  const [expanded, setExpanded] = useState(false)
  const budgetUsed = project.budget ? (project.spent / project.budget) * 100 : 0

  return (
    <div className="ml-8 border-l-2 border-gray-100 pl-4 mb-2">
      <div className="flex items-center gap-2 py-1.5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
        <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>{project.status}</span>
        <span className="text-sm font-medium text-gray-800 flex-1">{project.name}</span>
        <div className="w-24"><ProgressBar value={project.progress || 0} /></div>
        {project.budget && <span className="text-xs text-gray-400">${(project.budget / 1000).toFixed(0)}K</span>}
      </div>
      {expanded && project.milestones?.length > 0 && (
        <div className="ml-6 mb-2">
          {project.milestones.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 py-1 text-xs text-gray-600 border-t border-gray-50">
              <CheckSquare size={12} className={m.status === 'COMPLETED' ? 'text-green-500' : 'text-gray-300'} />
              <span className={m.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}>{m.name}</span>
              {m.dueDate && <span className="ml-auto text-gray-400">{new Date(m.dueDate).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgramCard({ program }: { program: any }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="ml-4 border-l-2 border-blue-100 pl-4 mb-3">
      <div className="flex items-center gap-2 py-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <GitBranch size={14} className="text-blue-500" />
        <span className="font-medium text-gray-700 flex-1">{program.name}</span>
        <span className="text-xs text-gray-400">{program.projects?.length || 0} projects</span>
      </div>
      {expanded && program.projects?.map((p: any) => <ProjectCard key={p.id} project={p} />)}
    </div>
  )
}

export default function PortfolioPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: portfolios = [], isLoading } = useQuery({ queryKey: ['portfolio'], queryFn: () => portfolioApi.list().then(r => r.data) })
  const { data: summary } = useQuery({ queryKey: ['portfolio-summary'], queryFn: () => portfolioApi.summary().then(r => r.data) })

  const create = useMutation({
    mutationFn: (d: any) => portfolioApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portfolio'] }); setShowNew(false); setNewName(''); setNewDesc('') },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Briefcase className="text-blue-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Management</h1>
            <p className="text-sm text-gray-500">Programs, projects, and milestones</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={14} /> New Portfolio
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Portfolios', value: summary.portfolios, icon: Layers, color: 'text-blue-600' },
            { label: 'Programs', value: summary.programs, icon: GitBranch, color: 'text-indigo-600' },
            { label: 'Projects', value: summary.projects, icon: Briefcase, color: 'text-purple-600' },
            { label: 'Overdue Milestones', value: summary.overdueMilestones, icon: CheckSquare, color: 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <Icon size={18} className={`${color} mb-2`} />
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {summary?.totalBudget > 0 && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-green-600" />
            <span className="font-semibold text-gray-800">Budget Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Spent</span>
                <span className="text-gray-800 font-medium">${(summary.totalSpent / 1000).toFixed(0)}K / ${(summary.totalBudget / 1000).toFixed(0)}K</span>
              </div>
              <ProgressBar value={summary.totalBudget ? (summary.totalSpent / summary.totalBudget) * 100 : 0} />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{summary.avgProgress?.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Avg Progress</div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading portfolios...</div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No portfolios yet</h3>
          <p className="text-gray-400 text-sm mb-4">Organize strategic initiatives into portfolios, programs, and projects</p>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Create First Portfolio
          </button>
        </div>
      ) : (
        portfolios.map((p: any) => (
          <div key={p.id} className="bg-white rounded-xl border shadow-sm mb-4">
            <div className="flex items-center gap-3 p-4 border-b">
              <Layers size={18} className="text-blue-600" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100'}`}>{p.status}</span>
            </div>
            <div className="p-4">
              {p.programs?.length === 0 && <p className="text-sm text-gray-400 pl-4">No programs yet</p>}
              {p.programs?.map((prog: any) => <ProgramCard key={prog.id} program={prog} />)}
            </div>
          </div>
        ))
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Portfolio</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Portfolio name" value={newName} onChange={e => setNewName(e.target.value)} />
            <textarea className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" rows={3} placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => create.mutate({ name: newName, description: newDesc })} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
