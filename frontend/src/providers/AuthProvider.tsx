import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, LoginRequest, RegisterOwnerRequest, RegisterDriverRequest } from '@/types'
import { UserRole } from '@/types'
import { authApi } from '@/api'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  registerOwner: (data: RegisterOwnerRequest) => Promise<void>
  registerDriver: (data: RegisterDriverRequest) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token')
  })
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.me()
    setUser(currentUser)
    setToken(localStorage.getItem('token') || 'session-token')
    localStorage.setItem('user', JSON.stringify(currentUser))
    return currentUser
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshUser()
      } catch (err) {
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
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

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(data)
      setUser(response.user)
      setToken(response.token)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const registerOwner = useCallback(async (_data: RegisterOwnerRequest) => {
  }, [])

  const registerDriver = useCallback(async (_data: RegisterDriverRequest) => {
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
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
