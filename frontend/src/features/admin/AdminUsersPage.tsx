import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { adminApi } from '@/api'
import { useToast } from '@/providers'
import type { User } from '@/types'
import { formatDate } from '@/utils/format'
import { Shield, ShieldOff, User as UserIcon } from 'lucide-react'

export function AdminUsersPage() {
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [processing, setProcessing] = useState<string | number | null>(null)

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers(roleFilter || undefined)
      setUsers(data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (userId: string | number, reason: string) => {
    try {
      setProcessing(userId)
      await adminApi.suspendUser(userId, reason)
      addToast('User suspended', 'success')
      loadUsers()
    } catch {
      addToast('Failed to suspend', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleUnsuspend = async (userId: string | number) => {
    try {
      setProcessing(userId)
      await adminApi.unsuspendUser(userId)
      addToast('User unsuspended', 'success')
      loadUsers()
    } catch {
      addToast('Failed to unsuspend', 'error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={8} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Tabs value={roleFilter} onValueChange={setRoleFilter}>
          <TabsList>
            <TabsTrigger value="">All</TabsTrigger>
            <TabsTrigger value="owner">Owners</TabsTrigger>
            <TabsTrigger value="driver">Drivers</TabsTrigger>
            <TabsTrigger value="admin">Admins</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><UserIcon className="w-5 h-5" /></div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email} &middot; <span className="capitalize">{user.role}</span></p>
                        <p className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={user.verification_status} type="verification" />
                      {user.verification_status === 'suspended' ? (
                        <Button size="sm" variant="outline" onClick={() => handleUnsuspend(user.id)} disabled={processing === user.id}>
                          <Shield className="w-4 h-4 mr-1" /> Unsuspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => handleSuspend(user.id, 'Admin action')} disabled={processing === user.id}>
                          <ShieldOff className="w-4 h-4 mr-1" /> Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
