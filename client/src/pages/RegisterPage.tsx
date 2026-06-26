import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', tenantName: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success('Welcome! Your account has been created.')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
            <Target size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BSC Platform</h1>
          <p className="text-brand-200 mt-1">14-day free trial · No credit card required</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your organization</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input className="input" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" value={form.lastName} onChange={set('lastName')} required />
              </div>
            </div>
            <div>
              <label className="label">Organization name</label>
              <input className="input" value={form.tenantName} onChange={set('tenantName')} placeholder="Acme Corp" required />
            </div>
            <div>
              <label className="label">Work email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={set('password')} placeholder="Min 8 characters" minLength={8} required />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Start free trial'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
