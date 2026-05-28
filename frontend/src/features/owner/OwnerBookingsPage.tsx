import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { KYCLock } from '@/components/shared/KYCLock'
import { bookingsApi } from '@/api'
import { useToast } from '@/providers'
import type { Booking } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'
import { User, Calendar, DollarSign } from 'lucide-react'

export function OwnerBookingsPage() {
  return (
    <KYCLock feature="Bookings">
      <OwnerBookingsContent />
    </KYCLock>
  )
}

function OwnerBookingsContent() {
  const { addToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [actionId, setActionId] = useState<string | number | null>(null)
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [activeTab])

  const loadBookings = async () => {
    try {
      const params: any = {}
      if (activeTab !== 'all') params.status = activeTab
      const res = await bookingsApi.getOwnerBookings(params)
      setBookings(res.data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!actionId) return
    try {
      setProcessing(true)
      if (actionType === 'accept') {
        await bookingsApi.acceptBooking(actionId)
        addToast('Booking accepted', 'success')
      } else {
        await bookingsApi.rejectBooking(actionId, 'Rejected by owner')
        addToast('Booking rejected', 'info')
      }
      setActionId(null)
      setActionType(null)
      loadBookings()
    } catch {
      addToast('Action failed', 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={4} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Booking Requests</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="requested">Requested</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {bookings.length === 0 ? (
            <EmptyState title="No bookings" description="You will see booking requests here" />
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.driver?.name || `Driver #${booking.driver_id}`}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatCurrency(booking.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <StatusBadge status={booking.status} type="booking" />
                          <StatusBadge status={booking.owner_payment_status || booking.owner_payment?.status || 'incomplete'} type="payment" />
                          {booking.status === 'requested' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="success" onClick={() => { setActionId(booking.id); setActionType('accept') }}>Accept</Button>
                              <Button size="sm" variant="destructive" onClick={() => { setActionId(booking.id); setActionType('reject') }}>Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!actionId}
        onOpenChange={() => { setActionId(null); setActionType(null) }}
        title={actionType === 'accept' ? 'Accept Booking' : 'Reject Booking'}
        description={actionType === 'accept' ? 'Confirm this booking request?' : 'Reject this booking request?'}
        variant={actionType === 'accept' ? 'default' : 'destructive'}
        confirmLabel={actionType === 'accept' ? 'Accept' : 'Reject'}
        onConfirm={handleAction}
        loading={processing}
      />
    </div>
  )
}
