import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { userApi } from '../lib/api'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'

function UserForm({ onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', title: '', departmentId: '' })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))
  const { data } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) })
  const depts = data?.items || []

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={set('firstName')} required /></div>
        <div><label className="label">Last Name *</label><input className="input" value={form.lastName} onChange={set('lastName')} required /></div>
      </div>
      <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={set('email')} required /></div>
      <div><label className="label">Temporary Password *</label><input type="password" className="input" value={form.password} onChange={set('password')} minLength={8} required placeholder="Min 8 characters" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Job Title</label><input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Manager" /></div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={form.departmentId} onChange={set('departmentId')}>
            <option value="">— None —</option>
            {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create User'}</button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userApi.list({ search: search || undefined }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (v: any) => userApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); toast.success('User created') },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => userApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Updated') },
  })

  const users = data?.items || []

  const columns = [
    {
      key: 'name', header: 'User',
      render: (u: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-700 flex-shrink-0">
            {u.firstName?.[0]}{u.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'title', header: 'Title', width: '150px', render: (u: any) => <span className="text-sm text-gray-600">{u.title || '—'}</span> },
    { key: 'department', header: 'Department', width: '150px', render: (u: any) => <span className="text-sm text-gray-600">{u.department?.name || '—'}</span> },
    {
      key: 'roles', header: 'Roles', width: '180px',
      render: (u: any) => (
        <div className="flex flex-wrap gap-1">
          {u.roles?.map((ur: any) => (
            <span key={ur.role.id} className="badge badge-blue text-xs">
              <Shield size={9} className="mr-0.5" />{ur.role.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: '100px',
      render: (u: any) => (
        <span className={clsx('badge', u.isActive ? 'badge-green' : 'badge-gray')}>
          {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: '2fa', header: '2FA', width: '60px',
      render: (u: any) => (
        <span className={clsx('text-xs font-medium', u.twoFactorEnabled ? 'text-green-600' : 'text-gray-400')}>
          {u.twoFactorEnabled ? '✓ On' : 'Off'}
        </span>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Login', width: '140px',
      render: (u: any) => <span className="text-xs text-gray-500">{u.lastLoginAt ? format(new Date(u.lastLoginAt), 'MMM d, yyyy') : 'Never'}</span>,
    },
    {
      key: 'actions', header: '', width: '60px',
      render: (u: any) => (
        <button
          onClick={e => { e.stopPropagation(); toggleMutation.mutate(u.id) }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          title={u.isActive ? 'Deactivate' : 'Activate'}
        >
          {u.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} users · {users.filter((u: any) => u.isActive).length} active</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={15} /> Invite User
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Table
        columns={columns}
        data={users}
        loading={isLoading}
        emptyText="No users found"
        emptyIcon={<Users size={40} className="opacity-30" />}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User" size="md">
        <UserForm onSubmit={createMutation.mutate} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      </Modal>
    </div>
  )
}
