import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, CalendarCheck, Car,
  Users, Shield, Bell, ScrollText, DollarSign, Landmark,
  AlertTriangle, Star, Menu, X, ChevronDown, Gauge,
  PlusCircle, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth, useRole } from '@/providers'
import { ScrollArea } from '@/components/ui/scroll-area'
import { APP_NAME, isKycApproved } from '@/constants'
import { getInitials } from '@/utils/format'

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  locked?: boolean
  children?: { label: string; path: string }[]
}

const ownerNav = (kycPassed: boolean): NavItem[] => [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/owner' },
  { label: 'My Post', icon: <FileText className="w-4 h-4" />, path: '/owner/cars', locked: !kycPassed },
  { label: 'Post Car', icon: <PlusCircle className="w-4 h-4" />, path: '/owner/cars/new', locked: !kycPassed },
  { label: 'Bookings', icon: <CalendarCheck className="w-4 h-4" />, path: '/owner/bookings', locked: !kycPassed },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/owner/payments', locked: !kycPassed },
  { label: 'KYC', icon: <Shield className="w-4 h-4" />, path: '/owner/documents' },
  { label: 'Profile', icon: <Users className="w-4 h-4" />, path: '/owner/profile' },
]

const driverNav = (kycPassed: boolean): NavItem[] => [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/driver' },
  { label: 'Browse Cars', icon: <Car className="w-4 h-4" />, path: '/driver/cars' },
  { label: 'My Booking', icon: <CalendarCheck className="w-4 h-4" />, path: '/driver/bookings', locked: !kycPassed },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/driver/payments', locked: !kycPassed },
  { label: 'KYC', icon: <Shield className="w-4 h-4" />, path: '/driver/documents' },
  { label: 'Profile', icon: <Users className="w-4 h-4" />, path: '/driver/profile' },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: <Gauge className="w-4 h-4" />, path: '/admin' },
  { label: 'Verify Owners', icon: <Users className="w-4 h-4" />, path: '/admin/verifications/owners' },
  { label: 'Verify Drivers', icon: <Users className="w-4 h-4" />, path: '/admin/verifications/drivers' },
  { label: 'Verify Cars', icon: <Car className="w-4 h-4" />, path: '/admin/verifications/cars' },
  { label: 'Bookings', icon: <CalendarCheck className="w-4 h-4" />, path: '/admin/bookings' },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/admin/payments' },
  { label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" />, path: '/admin/disputes' },
  { label: 'Users', icon: <Users className="w-4 h-4" />, path: '/admin/users' },
  { label: 'Deposits', icon: <Landmark className="w-4 h-4" />, path: '/admin/deposits' },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/admin/notifications' },
  { label: 'Audit Log', icon: <ScrollText className="w-4 h-4" />, path: '/admin/audit-log' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, refreshUser } = useAuth()
  const { isOwner, isDriver, isAdmin } = useRole()

  const kycPassed = isKycApproved(user?.verification_status)
  const navItems = isAdmin ? adminNav : isOwner ? ownerNav(kycPassed) : isDriver ? driverNav(kycPassed) : []

  useEffect(() => {
    if ((isOwner || isDriver) && !kycPassed) {
      refreshUser().catch(() => {
        // Keep the current sidebar state if the session refresh fails.
      })
    }
  }, [isOwner, isDriver, kycPassed, refreshUser])

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-lg shadow"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn(
          'flex items-center gap-3 h-16 px-4 border-b',
          collapsed && 'justify-center px-2',
        )}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            TR
          </div>
          {!collapsed && <span className="font-semibold text-sm">{APP_NAME}</span>}
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              item.path ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      isActive && !item.locked
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      item.locked && 'opacity-50',
                      collapsed && 'justify-center px-2',
                    )
                  }
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.locked && <Lock className="w-3 h-3 ml-auto shrink-0" />}
                    </>
                  )}
                </NavLink>
              ) : null
            ))}
          </nav>
        </ScrollArea>

        <div className={cn(
          'p-4 border-t flex items-center gap-3',
          collapsed && 'justify-center',
        )}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-8 border-t text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-90')} />
        </button>
      </aside>
    </>
  )
}
