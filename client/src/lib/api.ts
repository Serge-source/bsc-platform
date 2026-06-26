import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Typed helpers
export const kpiApi = {
  list: (params?: Record<string, unknown>) => api.get('/kpis', { params }),
  get: (id: string) => api.get(`/kpis/${id}`),
  create: (data: unknown) => api.post('/kpis', data),
  update: (id: string, data: unknown) => api.put(`/kpis/${id}`, data),
  delete: (id: string) => api.delete(`/kpis/${id}`),
  values: (id: string) => api.get(`/kpis/${id}/values`),
  addValue: (id: string, data: unknown) => api.post(`/kpis/${id}/values`, data),
  summary: () => api.get('/kpis/dashboard/summary'),
}

export const scorecardApi = {
  list: (params?: Record<string, unknown>) => api.get('/scorecards', { params }),
  get: (id: string) => api.get(`/scorecards/${id}`),
  create: (data: unknown) => api.post('/scorecards', data),
  update: (id: string, data: unknown) => api.put(`/scorecards/${id}`, data),
}

export const strategyApi = {
  list: () => api.get('/strategies'),
  get: (id: string) => api.get(`/strategies/${id}`),
  create: (data: unknown) => api.post('/strategies', data),
  update: (id: string, data: unknown) => api.put(`/strategies/${id}`, data),
  objectives: (id: string) => api.get(`/objectives?strategyId=${id}`),
}

export const riskApi = {
  list: (params?: Record<string, unknown>) => api.get('/risks', { params }),
  get: (id: string) => api.get(`/risks/${id}`),
  create: (data: unknown) => api.post('/risks', data),
  update: (id: string, data: unknown) => api.put(`/risks/${id}`, data),
  delete: (id: string) => api.delete(`/risks/${id}`),
}

export const initiativeApi = {
  list: (params?: Record<string, unknown>) => api.get('/initiatives', { params }),
  get: (id: string) => api.get(`/initiatives/${id}`),
  create: (data: unknown) => api.post('/initiatives', data),
  update: (id: string, data: unknown) => api.put(`/initiatives/${id}`, data),
  delete: (id: string) => api.delete(`/initiatives/${id}`),
}

export const aiApi = {
  chat: (message: string, conversationId?: string) => api.post('/ai/chat', { message, conversationId }),
  generateReport: (type: string, period?: string) => api.post('/ai/generate-report', { type, period }),
  forecast: (kpiId: string, periods?: number) => api.post('/ai/forecast', { kpiId, periods }),
}

export const userApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
}
