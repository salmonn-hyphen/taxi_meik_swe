import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers'
import { getDashboardPath } from '@/utils/auth'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return <>{children}</>
}
