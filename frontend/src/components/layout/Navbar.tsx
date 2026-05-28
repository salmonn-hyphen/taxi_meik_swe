import { useAuth } from '@/providers'
import { NotificationDropdown } from '@/components/shared/NotificationDropdown'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInitials } from '@/utils/format'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-end h-full px-4 lg:px-6 gap-4">
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted rounded-lg p-1.5 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profile_photo_url || ''} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to={user?.role === 'ADMIN' ? '/admin/profile' : `/${user?.role?.toLowerCase()}/profile`}>
                <User className="w-4 h-4 mr-2" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
