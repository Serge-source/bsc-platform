import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Settings, Building2, Shield, Bell, Palette, Key, CreditCard } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

function OrgSettings() {
  const { data } = useQuery({ queryKey: ['tenant'], queryFn: () => api.get('/tenants/current').then(r => r.data) })
  const { data: orgs } = useQuery({ queryKey: ['organizations'], queryFn: () => api.get('/organizations').then(r => r.data) })
  const org = orgs?.[0] || orgs?.items?.[0]

  const [form, setForm] = useState({ name: '', mission: '', vision: '', values: '' })
  const [loaded, setLoaded] = useState(false)

  if (org && !loaded) {
    setForm({ name: org.name || '', mission: org.mission || '', vision: org.vision || '', values: org.values || '' })
    setLoaded(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/organizations/${org?.id}`, form),
    onSuccess: () => toast.success('Organization saved'),
    onError: () => toast.error('Failed to save'),
  })

  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Organization Profile</h3>
        <div>
          <label className="label">Organization Name</label>
          <input className="input max-w-md" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label">Mission Statement</label>
          <textarea className="input resize-none max-w-2xl" rows={3} value={form.mission} onChange={set('mission')} placeholder="Why does your organization exist?" />
        </div>
        <div>
          <label className="label">Vision Statement</label>
          <textarea className="input resize-none max-w-2xl" rows={3} value={form.vision} onChange={set('vision')} placeholder="What does success look like?" />
        </div>
        <div>
          <label className="label">Core Values</label>
          <textarea className="input resize-none max-w-2xl" rows={2} value={form.values} onChange={set('values')} placeholder="e.g. Integrity, Innovation, Excellence" />
        </div>
        <button onClick={() => saveMutation.mutate()} className="btn-primary" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {data && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription</h3>
          <div className="flex items-center gap-3">
            <span className={clsx('badge', data.plan === 'ENTERPRISE' ? 'badge-purple' : data.plan === 'PROFESSIONAL' ? 'badge-blue' : 'badge-gray')}>
              {data.plan}
            </span>
            <span className="text-sm text-gray-500">
              {data.trialEndsAt && new Date(data.trialEndsAt) > new Date()
                ? `Trial ends ${new Date(data.trialEndsAt).toLocaleDateString()}`
                : 'Active subscription'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function SecuritySettings() {
  const { user } = useAuthStore()
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })

  const changePwMutation = useMutation({
    mutationFn: () => api.put(`/users/${user?.id}`, { password: passwords.newPass }),
    onSuccess: () => { toast.success('Password changed'); setPasswords({ current: '', newPass: '', confirm: '' }) },
    onError: () => toast.error('Failed'),
  })

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4 max-w-md">
        <h3 className="font-semibold text-gray-900">Change Password</h3>
        <div><label className="label">Current Password</label><input type="password" className="input" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} /></div>
        <div><label className="label">New Password</label><input type="password" className="input" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} minLength={8} /></div>
        <div><label className="label">Confirm New Password</label><input type="password" className="input" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} /></div>
        <button
          onClick={() => {
            if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return }
            if (passwords.newPass.length < 8) { toast.error('Min 8 characters'); return }
            changePwMutation.mutate()
          }}
          className="btn-primary"
          disabled={changePwMutation.isPending}
        >
          {changePwMutation.isPending ? 'Changing…' : 'Change Password'}
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account using an authenticator app.</p>
        <div className="flex items-center gap-3">
          <span className={clsx('badge', user ? 'badge-green' : 'badge-gray')}>
            {/* Could check user.twoFactorEnabled if available */}
            2FA Available
          </span>
          <button className="btn-secondary text-sm">Setup 2FA</button>
        </div>
      </div>
    </div>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="card p-12 flex flex-col items-center text-gray-400">
      <Settings size={40} className="mb-3 opacity-30" />
      <p className="font-medium text-gray-600">{label}</p>
      <p className="text-sm mt-1">Coming in a future release</p>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('organization')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your organization, security, and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                tab === id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'organization' && <OrgSettings />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'notifications' && <ComingSoon label="Notification Settings" />}
          {tab === 'appearance' && <ComingSoon label="Appearance & Branding" />}
          {tab === 'api' && <ComingSoon label="API Keys" />}
          {tab === 'billing' && <ComingSoon label="Billing & Subscription" />}
        </div>
      </div>
    </div>
  )
}
