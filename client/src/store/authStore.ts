import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  roles: string[]
  permissions: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (...roles: string[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      hasPermission: (resource, action) => {
        const { user } = get()
        if (!user) return false
        return (
          user.permissions.includes('*:*') ||
          user.permissions.includes(`${resource}:*`) ||
          user.permissions.includes(`${resource}:${action}`)
        )
      },

      hasRole: (...roles) => {
        const { user } = get()
        if (!user) return false
        return roles.some((r) => user.roles.includes(r))
      },
    }),
    { name: 'bsc-auth' }
  )
)
