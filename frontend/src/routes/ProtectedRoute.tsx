import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers'
import { getDashboardPath } from '@/utils/auth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user.role as UserRole)) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return <>{children}</>
}
