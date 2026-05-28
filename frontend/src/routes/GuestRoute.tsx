import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers'
import { getDashboardPath } from '@/utils/auth'

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return <>{children}</>
}
