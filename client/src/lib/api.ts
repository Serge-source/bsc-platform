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
  generateStrategy: (data: unknown) => api.post('/ai/generate-strategy', data),
  copilot: (question: string, type?: string) => api.post('/ai/copilot', { question, type }),
  conversations: () => api.get('/ai/conversations'),
}

export const okrApi = {
  cycles: () => api.get('/okrs/cycles'),
  createCycle: (data: unknown) => api.post('/okrs/cycles', data),
  updateCycle: (id: string, data: unknown) => api.put(`/okrs/cycles/${id}`, data),
  deleteCycle: (id: string) => api.delete(`/okrs/cycles/${id}`),
  objectives: (cycleId?: string) => api.get('/okrs/objectives', { params: cycleId ? { cycleId } : {} }),
  createObjective: (data: unknown) => api.post('/okrs/objectives', data),
  updateObjective: (id: string, data: unknown) => api.put(`/okrs/objectives/${id}`, data),
  deleteObjective: (id: string) => api.delete(`/okrs/objectives/${id}`),
  createKeyResult: (objId: string, data: unknown) => api.post(`/okrs/objectives/${objId}/key-results`, data),
  updateKeyResult: (id: string, data: unknown) => api.put(`/okrs/key-results/${id}`, data),
  deleteKeyResult: (id: string) => api.delete(`/okrs/key-results/${id}`),
  addCheckIn: (krId: string, data: unknown) => api.post(`/okrs/key-results/${krId}/check-ins`, data),
}

export const portfolioApi = {
  list: () => api.get('/portfolio'),
  create: (data: unknown) => api.post('/portfolio', data),
  update: (id: string, data: unknown) => api.put(`/portfolio/${id}`, data),
  delete: (id: string) => api.delete(`/portfolio/${id}`),
  summary: () => api.get('/portfolio/summary'),
  createProgram: (data: unknown) => api.post('/portfolio/programs', data),
  updateProgram: (id: string, data: unknown) => api.put(`/portfolio/programs/${id}`, data),
  deleteProgram: (id: string) => api.delete(`/portfolio/programs/${id}`),
  createProject: (data: unknown) => api.post('/portfolio/projects', data),
  updateProject: (id: string, data: unknown) => api.put(`/portfolio/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/portfolio/projects/${id}`),
  addMilestone: (projectId: string, data: unknown) => api.post(`/portfolio/projects/${projectId}/milestones`, data),
  updateMilestone: (id: string, data: unknown) => api.put(`/portfolio/milestones/${id}`, data),
}

export const bpmApi = {
  list: () => api.get('/bpm'),
  create: (data: unknown) => api.post('/bpm', data),
  update: (id: string, data: unknown) => api.put(`/bpm/${id}`, data),
  delete: (id: string) => api.delete(`/bpm/${id}`),
  addStep: (processId: string, data: unknown) => api.post(`/bpm/${processId}/steps`, data),
  updateStep: (id: string, data: unknown) => api.put(`/bpm/steps/${id}`, data),
  deleteStep: (id: string) => api.delete(`/bpm/steps/${id}`),
}

export const grcApi = {
  policies: () => api.get('/grc/policies'),
  createPolicy: (data: unknown) => api.post('/grc/policies', data),
  updatePolicy: (id: string, data: unknown) => api.put(`/grc/policies/${id}`, data),
  deletePolicy: (id: string) => api.delete(`/grc/policies/${id}`),
  addRequirement: (policyId: string, data: unknown) => api.post(`/grc/policies/${policyId}/requirements`, data),
  updateRequirement: (id: string, data: unknown) => api.put(`/grc/requirements/${id}`, data),
  deleteRequirement: (id: string) => api.delete(`/grc/requirements/${id}`),
  auditItems: () => api.get('/grc/audit'),
  createAuditItem: (data: unknown) => api.post('/grc/audit', data),
  updateAuditItem: (id: string, data: unknown) => api.put(`/grc/audit/${id}`, data),
  deleteAuditItem: (id: string) => api.delete(`/grc/audit/${id}`),
  summary: () => api.get('/grc/summary'),
}

export const appraisalApi = {
  cycles: () => api.get('/appraisals/cycles'),
  createCycle: (data: unknown) => api.post('/appraisals/cycles', data),
  updateCycle: (id: string, data: unknown) => api.put(`/appraisals/cycles/${id}`, data),
  forms: (params?: Record<string, unknown>) => api.get('/appraisals/forms', { params }),
  createForm: (data: unknown) => api.post('/appraisals/forms', data),
  updateForm: (id: string, data: unknown) => api.put(`/appraisals/forms/${id}`, data),
}

export const scenarioApi = {
  list: () => api.get('/scenarios'),
  create: (data: unknown) => api.post('/scenarios', data),
  update: (id: string, data: unknown) => api.put(`/scenarios/${id}`, data),
  delete: (id: string) => api.delete(`/scenarios/${id}`),
  addAssumption: (id: string, data: unknown) => api.post(`/scenarios/${id}/assumptions`, data),
  updateAssumption: (id: string, data: unknown) => api.put(`/scenarios/assumptions/${id}`, data),
  deleteAssumption: (id: string) => api.delete(`/scenarios/assumptions/${id}`),
  addKpiImpact: (id: string, data: unknown) => api.post(`/scenarios/${id}/kpi-impacts`, data),
  analyze: (id: string) => api.post(`/scenarios/${id}/analyze`),
}

export const userApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
}

export const rolesApi = {
  list: () => api.get('/roles'),
  create: (data: unknown) => api.post('/roles', data),
  update: (id: string, data: unknown) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  allPermissions: () => api.get('/roles/permissions/all'),
}
