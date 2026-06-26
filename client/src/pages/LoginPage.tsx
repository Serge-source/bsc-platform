import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password, totpCode: totpCode || undefined })
      if (data.requires2FA) {
        setRequires2FA(true)
        return
      }
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
            <Target size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BSC Platform</h1>
          <p className="text-brand-200 mt-1">Strategic Performance Management</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@demo.com"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="label">Two-Factor Authentication Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Signing in...' : requires2FA ? 'Verify' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-700 font-medium hover:underline">
              Start free trial
            </Link>
          </p>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-medium mb-1">Demo credentials:</p>
            <p>Email: admin@demo.com</p>
            <p>Password: Admin123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
