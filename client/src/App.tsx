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
import SettingsPage from './pages/SettingsPage'
import AIAssistantPage from './pages/AIAssistantPage'
import MeetingsPage from './pages/MeetingsPage'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
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
          <Route path="dashboard" element={<ExecutiveDashboard />} />
          <Route path="strategy" element={<StrategyPage />} />
          <Route path="scorecards" element={<ScorecardsPage />} />
          <Route path="kpis" element={<KPIsPage />} />
          <Route path="kpis/:id" element={<KPIDetailPage />} />
          <Route path="initiatives" element={<InitiativesPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
