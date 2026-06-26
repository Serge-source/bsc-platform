import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Users, Check, Trash2, Save, ChevronRight } from 'lucide-react'
import { rolesApi } from '../lib/api'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Permission definitions shown in the UI ───────────────────────────────────
const NAV_PERMS = [
  { key: 'nav:dashboard', label: 'Executive Dashboard' },
  { key: 'nav:strategy', label: 'Strategy Map' },
  { key: 'nav:scorecards', label: 'Scorecards' },
  { key: 'nav:kpis', label: 'KPIs' },
  { key: 'nav:initiatives', label: 'Initiatives' },
  { key: 'nav:risks', label: 'Risks' },
  { key: 'nav:meetings', label: 'Meetings' },
  { key: 'nav:reports', label: 'Reports' },
  { key: 'nav:ai', label: 'AI Assistant' },
]

const ADMIN_NAV_PERMS = [
  { key: 'nav:users', label: 'User Management' },
  { key: 'nav:roles', label: 'Roles & Permissions' },
  { key: 'nav:settings', label: 'Settings' },
]

const DATA_PERM_GROUPS = [
  { label: 'KPIs', perms: [{ key: 'kpis:read', label: 'Read' }, { key: 'kpis:write', label: 'Write' }, { key: 'kpis:delete', label: 'Delete' }] },
  { label: 'Risks', perms: [{ key: 'risks:read', label: 'Read' }, { key: 'risks:write', label: 'Write' }, { key: 'risks:delete', label: 'Delete' }] },
  { label: 'Initiatives', perms: [{ key: 'initiatives:read', label: 'Read' }, { key: 'initiatives:write', label: 'Write' }, { key: 'initiatives:delete', label: 'Delete' }] },
  { label: 'Strategy', perms: [{ key: 'strategy:read', label: 'Read' }, { key: 'strategy:write', label: 'Write' }] },
  { label: 'Reports', perms: [{ key: 'reports:read', label: 'Read' }, { key: 'reports:write', label: 'Generate' }] },
  { label: 'AI', perms: [{ key: 'ai:use', label: 'Use' }] },
  { label: 'Admin', perms: [{ key: 'users:manage', label: 'Manage Users' }, { key: 'settings:manage', label: 'Manage Settings' }] },
]

// ─── Checkbox cell ─────────────────────────────────────────────────────────────
function PermCheck({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'w-6 h-6 rounded flex items-center justify-center border-2 transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' :
          checked ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700' :
            'border-gray-300 bg-white hover:border-brand-400'
      )}
    >
      {checked && <Check size={13} strokeWidth={3} />}
    </button>
  )
}

// ─── Role editor panel ─────────────────────────────────────────────────────────
function RoleEditor({ role, allPermissions, onSaved }: { role: any; allPermissions: any[]; onSaved: () => void }) {
  const isAdmin = role.name === 'Admin'
  const hasWildcard = role.permissions?.some((rp: any) => rp.permission.resource === '*' && rp.permission.action === '*')

  const currentKeys = new Set<string>(
    role.permissions?.map((rp: any) => `${rp.permission.resource}:${rp.permission.action}`) ?? []
  )
  const [selected, setSelected] = useState<Set<string>>(new Set(currentKeys))

  const qc = useQueryClient()
  const saveMutation = useMutation({
    mutationFn: async () => {
      const permIds = allPermissions
        .filter((p) => selected.has(`${p.resource}:${p.action}`))
        .map((p) => p.id)
      await rolesApi.update(role.id, { permissionIds: permIds })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role saved')
      onSaved()
    },
    onError: () => toast.error('Failed to save'),
  })

  const toggle = (key: string) => {
    if (isAdmin) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const effective = (key: string) => isAdmin || hasWildcard || selected.has(key)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{role.name}</h2>
          {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
          {isAdmin && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              <Check size={10} /> Full access — all permissions granted
            </span>
          )}
        </div>
        {!isAdmin && (
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary gap-2">
            <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Navigation Access */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation Access</h3>
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_PERMS.map(({ key, label }) => (
              <label key={key} className={clsx('flex items-center gap-3 p-2 rounded-lg cursor-pointer', !isAdmin && 'hover:bg-gray-50')} onClick={() => toggle(key)}>
                <PermCheck checked={effective(key)} onChange={() => toggle(key)} disabled={isAdmin} />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">Admin sections</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ADMIN_NAV_PERMS.map(({ key, label }) => (
                <label key={key} className={clsx('flex items-center gap-3 p-2 rounded-lg cursor-pointer', !isAdmin && 'hover:bg-gray-50')} onClick={() => toggle(key)}>
                  <PermCheck checked={effective(key)} onChange={() => toggle(key)} disabled={isAdmin} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data Permissions */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Permissions</h3>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {DATA_PERM_GROUPS.map((group) => (
                <tr key={group.label}>
                  <td className="px-4 py-3 font-medium text-gray-700 w-32">{group.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-4">
                      {group.perms.map(({ key, label }) => (
                        <label key={key} className={clsx('flex items-center gap-2 cursor-pointer', !isAdmin && 'hover:text-brand-700')} onClick={() => toggle(key)}>
                          <PermCheck checked={effective(key)} onChange={() => toggle(key)} disabled={isAdmin} />
                          <span className="text-gray-600">{label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ─── Create role modal ─────────────────────────────────────────────────────────
function CreateRoleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => rolesApi.create({ name, description: desc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role created')
      setName(''); setDesc('')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Create Role" size="sm">
      <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
        <div>
          <label className="label">Role Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Analyst" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data: roles = [], isLoading } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then(r => r.data),
  })

  const { data: allPermissions = [] } = useQuery<any[]>({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.allPermissions().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setSelected(null); toast.success('Role deleted') },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Cannot delete'),
  })

  const selectedRole = roles.find((r: any) => r.id === selected)

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {/* Left: role list */}
      <aside className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Roles</h1>
          <button onClick={() => setShowCreate(true)} className="btn-secondary !py-1.5 !px-2.5 gap-1 text-xs">
            <Plus size={13} /> New
          </button>
        </div>

        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)
        ) : (
          roles.map((role: any) => (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={clsx(
                'w-full text-left p-3 rounded-xl border transition-colors',
                selected === role.id
                  ? 'border-brand-300 bg-brand-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={15} className={selected === role.id ? 'text-brand-600' : 'text-gray-400'} />
                  <span className="font-medium text-sm text-gray-900">{role.name}</span>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
              <div className="flex items-center gap-3 mt-1.5 pl-5">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users size={10} /> {role._count?.users ?? 0} users
                </span>
                {role.isSystem && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">System</span>
                )}
              </div>
            </button>
          ))
        )}
      </aside>

      {/* Right: editor */}
      <div className="flex-1 flex flex-col">
        {selectedRole ? (
          <>
            <RoleEditor
              key={selectedRole.id}
              role={selectedRole}
              allPermissions={allPermissions}
              onSaved={() => {}}
            />
            {!selectedRole.isSystem && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (confirm(`Delete role "${selectedRole.name}"? Users will lose this role.`)) {
                      deleteMutation.mutate(selectedRole.id)
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} /> Delete Role
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Shield size={48} className="opacity-20" />
            <p className="text-sm">Select a role to edit its permissions</p>
          </div>
        )}
      </div>

      <CreateRoleModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
