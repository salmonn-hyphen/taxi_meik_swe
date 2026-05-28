import { UserRole } from '@/types'

export function getDashboardPath(role?: string | null) {
  if (role === UserRole.Admin) return '/admin'
  if (role === UserRole.Driver) return '/driver'
  return '/owner'
}
