import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Target, ClipboardList, BarChart2, Rocket,
  Shield, FileText, Users, Settings, Bot, ChevronLeft, Menu,
  Bell, LogOut, Calendar, ChevronDown, Building2
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Executive Dashboard', perm: 'dashboard' },
  { to: '/strategy', icon: Target, label: 'Strategy', perm: 'strategy' },
  { to: '/scorecards', icon: ClipboardList, label: 'Scorecards', perm: 'scorecards' },
  { to: '/kpis', icon: BarChart2, label: 'KPIs', perm: 'kpis' },
  { to: '/initiatives', icon: Rocket, label: 'Initiatives', perm: 'initiatives' },
  { to: '/risks', icon: Shield, label: 'Risks', perm: 'risks' },
  { to: '/meetings', icon: Calendar, label: 'Meetings', perm: 'meetings' },
  { to: '/reports', icon: FileText, label: 'Reports', perm: 'reports' },
  { to: '/ai', icon: Bot, label: 'AI Assistant', perm: 'ai' },
]

const adminItems = [
  { to: '/users', icon: Users, label: 'Users', perm: 'users' },
  { to: '/roles', icon: Shield, label: 'Roles & Permissions', perm: 'roles' },
  { to: '/settings', icon: Settings, label: 'Settings', perm: 'settings' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, hasPermission, hasRole } = useAuthStore()
  const isAdmin = hasRole('Admin')
  const canSee = (perm: string) => isAdmin || hasPermission('nav', perm)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await api.post('/auth/logout')
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-white border-r border-gray-200 transition-all duration-200',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
          <div className="flex-shrink-0 w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center">
            <Target size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">BSC Platform</p>
              <p className="text-xs text-gray-500 truncate">{user?.tenantName}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {navItems.filter(item => canSee(item.perm)).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-nav-item', isActive && 'active')
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          {adminItems.some(item => canSee(item.perm)) && (
            <>
              {!collapsed && (
                <p className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              )}
              {collapsed && <div className="border-t border-gray-100 my-2" />}
              {adminItems.filter(item => canSee(item.perm)).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx('sidebar-nav-item', isActive && 'active')
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-gray-200 p-2">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 text-left flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.roles?.[0] ?? 'User'}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                </>
              )}
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 size={16} />
            <span className="font-medium">{user?.tenantName}</span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
