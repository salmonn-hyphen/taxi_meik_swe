import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, LoginRequest, RegisterOwnerRequest, RegisterDriverRequest, AuthResponse } from '@/types'
import { UserRole } from '@/types'
import { authApi } from '@/api'
import { getDashboardPath } from '@/utils/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<AuthResponse>
  registerOwner: (data: RegisterOwnerRequest) => Promise<void>
  registerDriver: (data: RegisterDriverRequest) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const USER_CACHE_KEY = 'auth_user_cache'
const TOKEN_CACHE_KEY = 'auth_token_cache'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('auth_logged_out')) {
        return null
      }
      const cached = sessionStorage.getItem(USER_CACHE_KEY)
      if (!cached) return null
      return JSON.parse(cached) as User
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('auth_logged_out')) {
        return null
      }
      return sessionStorage.getItem(TOKEN_CACHE_KEY)
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  const refreshUser = useCallback(async () => {
    const currentSession = await authApi.me()
    setUser(currentSession.user)
    setToken(currentSession.token)
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(currentSession.user))
    sessionStorage.setItem(TOKEN_CACHE_KEY, currentSession.token || 'cookie-session')
    return currentSession.user
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshUser()
      } catch (err) {
        setUser(null)
        setToken(null)
        sessionStorage.removeItem(USER_CACHE_KEY)
        sessionStorage.removeItem(TOKEN_CACHE_KEY)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [refreshUser])

  useEffect(() => {
    if (!isAuthenticated) return

    const handleFocus = () => {
      refreshUser().catch(() => {
        // Keep the current cached session if a foreground refresh fails.
      })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isAuthenticated, refreshUser])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_logged_out') {
        setUser(null)
        setToken(null)
        sessionStorage.removeItem(USER_CACHE_KEY)
        sessionStorage.removeItem(TOKEN_CACHE_KEY)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data)
    setUser(response.user)
    setToken(response.token)
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.user))
    sessionStorage.setItem(TOKEN_CACHE_KEY, response.token || 'cookie-session')
    return response
  }, [])

  const registerOwner = useCallback(async (_data: RegisterOwnerRequest) => {
  }, [])

  const registerDriver = useCallback(async (_data: RegisterDriverRequest) => {
  }, [])

  const logout = useCallback(async () => {
    // Prevent immediate auto-refresh re-auth which may happen if server refresh token still valid.
    try {
      sessionStorage.setItem('skip_refresh', '1')
    } catch (e) {
      // ignore
    }

    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setToken(null)
      setUser(null)
      sessionStorage.removeItem(USER_CACHE_KEY)
      sessionStorage.removeItem(TOKEN_CACHE_KEY)
      try { localStorage.setItem('auth_logged_out', Date.now().toString()) } catch {}
      // keep skip_refresh until consumed by authApi.me to avoid immediate silent refresh
    }
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        registerOwner,
        registerDriver,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRole() {
  const { user } = useAuth()
  return {
    isAdmin: user?.role === UserRole.Admin,
    isOwner: user?.role === UserRole.Owner,
    isDriver: user?.role === UserRole.Driver,
    role: user?.role,
  }
}

export { getDashboardPath }
