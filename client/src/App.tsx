import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ExecutiveDashboard from './pages/ExecutiveDashboard'
import KPIsPage from './pages/KPIsPage'
import KPIDetailPage from './pages/KPIDetailPage'
import ScorecardsPage from './pages/ScorecardsPage'
import StrategyPage from './pages/StrategyPage'
import InitiativesPage from './pages/InitiativesPage'
import RisksPage from './pages/RisksPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import RolesPage from './pages/RolesPage'
import SettingsPage from './pages/SettingsPage'
import AIAssistantPage from './pages/AIAssistantPage'
import MeetingsPage from './pages/MeetingsPage'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const NavRoute = ({ perm, children }: { perm: string; children: React.ReactNode }) => {
  const { hasPermission, hasRole } = useAuthStore()
  if (hasRole('Admin') || hasPermission('nav', perm)) return <>{children}</>
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<NavRoute perm="dashboard"><ExecutiveDashboard /></NavRoute>} />
          <Route path="strategy" element={<NavRoute perm="strategy"><StrategyPage /></NavRoute>} />
          <Route path="scorecards" element={<NavRoute perm="scorecards"><ScorecardsPage /></NavRoute>} />
          <Route path="kpis" element={<NavRoute perm="kpis"><KPIsPage /></NavRoute>} />
          <Route path="kpis/:id" element={<NavRoute perm="kpis"><KPIDetailPage /></NavRoute>} />
          <Route path="initiatives" element={<NavRoute perm="initiatives"><InitiativesPage /></NavRoute>} />
          <Route path="risks" element={<NavRoute perm="risks"><RisksPage /></NavRoute>} />
          <Route path="meetings" element={<NavRoute perm="meetings"><MeetingsPage /></NavRoute>} />
          <Route path="reports" element={<NavRoute perm="reports"><ReportsPage /></NavRoute>} />
          <Route path="ai" element={<NavRoute perm="ai"><AIAssistantPage /></NavRoute>} />
          <Route path="users" element={<NavRoute perm="users"><UsersPage /></NavRoute>} />
          <Route path="roles" element={<NavRoute perm="roles"><RolesPage /></NavRoute>} />
          <Route path="settings" element={<NavRoute perm="settings"><SettingsPage /></NavRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
