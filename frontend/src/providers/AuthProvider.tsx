import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, LoginRequest, RegisterOwnerRequest, RegisterDriverRequest, AuthResponse } from '@/types'
import { UserRole } from '@/types'
import { authApi } from '@/api'
import { getDashboardPath } from '@/utils/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<AuthResponse>
  registerOwner: (data: RegisterOwnerRequest) => Promise<void>
  registerDriver: (data: RegisterDriverRequest) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    let cancelled = false
    const checkSession = async () => {
      try {
        const currentSession = await authApi.me()
        if (!cancelled) {
          setUser(currentSession.user)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    checkSession()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data)
    setUser(response.user)
    return response
  }, [])

  const registerOwner = useCallback(async (_data: RegisterOwnerRequest) => {
  }, [])

  const registerDriver = useCallback(async (_data: RegisterDriverRequest) => {
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        registerOwner,
        registerDriver,
        logout,
        updateUser,
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
