import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react'
import { grcApi } from '../lib/api'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  RETIRED: { label: 'Retired', color: 'bg-red-100 text-red-600' },
  COMPLIANT: { label: 'Compliant', color: 'bg-green-100 text-green-700' },
  NON_COMPLIANT: { label: 'Non-Compliant', color: 'bg-red-100 text-red-700' },
  PARTIAL: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' },
  NOT_ASSESSED: { label: 'Not Assessed', color: 'bg-gray-100 text-gray-500' },
  OPEN: { label: 'Open', color: 'bg-orange-100 text-orange-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-600',
}

type Tab = 'policies' | 'audit'

export default function GRCPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('policies')
  const [showNewPolicy, setShowNewPolicy] = useState(false)
  const [showNewAudit, setShowNewAudit] = useState(false)
  const [policyName, setPolicyName] = useState('')
  const [policyDesc, setPolicyDesc] = useState('')
  const [policyCategory, setPolicyCategory] = useState('')
  const [auditTitle, setAuditTitle] = useState('')
  const [auditScope, setAuditScope] = useState('')
  const [auditPriority, setAuditPriority] = useState('MEDIUM')

  const { data: policies = [] } = useQuery({ queryKey: ['grc-policies'], queryFn: () => grcApi.policies().then(r => r.data) })
  const { data: auditItems = [] } = useQuery({ queryKey: ['grc-audit'], queryFn: () => grcApi.auditItems().then(r => r.data) })
  const { data: summary } = useQuery({ queryKey: ['grc-summary'], queryFn: () => grcApi.summary().then(r => r.data) })

  const createPolicy = useMutation({
    mutationFn: (d: any) => grcApi.createPolicy(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grc-policies'] }); qc.invalidateQueries({ queryKey: ['grc-summary'] }); setShowNewPolicy(false); setPolicyName(''); setPolicyDesc(''); setPolicyCategory('') },
  })
  const deletePolicy = useMutation({
    mutationFn: (id: string) => grcApi.deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grc-policies'] }); qc.invalidateQueries({ queryKey: ['grc-summary'] }) },
  })
  const createAudit = useMutation({
    mutationFn: (d: any) => grcApi.createAuditItem(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grc-audit'] }); qc.invalidateQueries({ queryKey: ['grc-summary'] }); setShowNewAudit(false); setAuditTitle(''); setAuditScope('') },
  })
  const updateAudit = useMutation({
    mutationFn: ({ id, data }: any) => grcApi.updateAuditItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grc-audit'] }); qc.invalidateQueries({ queryKey: ['grc-summary'] }) },
  })

  const complianceScore = summary?.complianceScore || 0
  const scoreColor = complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-indigo-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Governance, Risk & Compliance</h1>
            <p className="text-sm text-gray-500">Policies, compliance, and audit management</p>
          </div>
        </div>
        <button onClick={() => tab === 'policies' ? setShowNewPolicy(true) : setShowNewAudit(true)}
          className="flex items-center gap-1 text-sm px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={14} /> {tab === 'policies' ? 'New Policy' : 'New Audit Item'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 col-span-1">
            <div className={`text-3xl font-bold ${scoreColor}`}>{complianceScore}%</div>
            <div className="text-sm text-gray-500">Compliance Score</div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${complianceScore >= 80 ? 'bg-green-500' : complianceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${complianceScore}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-1 mb-1"><FileText size={14} className="text-blue-600" /></div>
            <div className="text-2xl font-bold">{summary.activePolicies}<span className="text-sm text-gray-400 font-normal">/{summary.policies}</span></div>
            <div className="text-sm text-gray-500">Active Policies</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-1 mb-1"><CheckCircle size={14} className="text-green-600" /></div>
            <div className="text-2xl font-bold">{summary.compliant}<span className="text-sm text-gray-400 font-normal">/{summary.requirements}</span></div>
            <div className="text-sm text-gray-500">Compliant Reqs</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-1 mb-1"><AlertTriangle size={14} className="text-red-600" /></div>
            <div className="text-2xl font-bold text-red-600">{summary.criticalAudits}</div>
            <div className="text-sm text-gray-500">Critical Audits</div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b mb-6">
        {(['policies', 'audit'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'audit' ? 'Audit Items' : 'Policies & Compliance'}
          </button>
        ))}
      </div>

      {tab === 'policies' ? (
        policies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <FileText size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No policies yet. Create your first governance policy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy: any) => (
              <div key={policy.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[policy.status]?.color || 'bg-gray-100'}`}>{STATUS_BADGE[policy.status]?.label || policy.status}</span>
                      {policy.category && <span className="text-xs text-gray-400">{policy.category}</span>}
                    </div>
                    {policy.description && <p className="text-sm text-gray-500 mb-2">{policy.description}</p>}
                    {policy.requirements?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {policy.requirements.map((req: any) => (
                          <span key={req.id} className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[req.status]?.color || 'bg-gray-100'}`}>{req.title}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deletePolicy.mutate(policy.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        auditItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <AlertTriangle size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No audit items yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditItems.map((item: any) => (
              <div key={item.id} className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[item.priority] || 'bg-gray-100'}`}>{item.priority}</span>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status]?.color || 'bg-gray-100'}`}>{STATUS_BADGE[item.status]?.label || item.status}</span>
                  </div>
                  {item.scope && <p className="text-sm text-gray-500">Scope: {item.scope}</p>}
                  {item.findings && <p className="text-sm text-gray-600 mt-1">{item.findings}</p>}
                </div>
                <div className="flex gap-1">
                  {item.status === 'OPEN' && (
                    <button onClick={() => updateAudit.mutate({ id: item.id, data: { status: 'IN_PROGRESS' } })}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Start</button>
                  )}
                  {item.status === 'IN_PROGRESS' && (
                    <button onClick={() => updateAudit.mutate({ id: item.id, data: { status: 'CLOSED' } })}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Close</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showNewPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Governance Policy</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Policy name" value={policyName} onChange={e => setPolicyName(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Category (e.g. Data Privacy, Financial)" value={policyCategory} onChange={e => setPolicyCategory(e.target.value)} />
            <textarea className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" rows={3} placeholder="Description" value={policyDesc} onChange={e => setPolicyDesc(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewPolicy(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => createPolicy.mutate({ name: policyName, category: policyCategory, description: policyDesc })}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {showNewAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">New Audit Item</h2>
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Audit title" value={auditTitle} onChange={e => setAuditTitle(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Scope" value={auditScope} onChange={e => setAuditScope(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" value={auditPriority} onChange={e => setAuditPriority(e.target.value)}>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewAudit(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => createAudit.mutate({ title: auditTitle, scope: auditScope, priority: auditPriority })}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
