import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/providers'
import { bookingsApi, usersApi } from '@/api'
import type { Booking } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'
import { Car, Calendar, DollarSign, XCircle, ShieldAlert, Loader2 } from 'lucide-react'

export function DriverBookingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [cancelId, setCancelId] = useState<string | number | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  
  const [kycStatus, setKycStatus] = useState<string>('PENDING')
  const [loadingKyc, setLoadingKyc] = useState(true)

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const kycData = await usersApi.getKycStatus()
        setKycStatus(kycData?.kycStatus || 'PENDING')
      } catch (err) {
        // Fallback to checking the user session's verification_status
        if (user?.verification_status === 'verified' || user?.verification_status === 'trusted') {
          setKycStatus('APPROVED')
        } else {
          setKycStatus('PENDING')
        }
      } finally {
        setLoadingKyc(false)
      }
    }

    if (user) {
      fetchKycStatus()
    }
  }, [user])

  useEffect(() => {
    if (kycStatus === 'APPROVED') {
      loadBookings()
    }
  }, [activeTab, kycStatus])

  const loadBookings = async () => {
    try {
      setLoadingBookings(true)
      const params: { status?: string } = {}
      if (activeTab !== 'all') params.status = activeTab
      const res = await bookingsApi.getMyBookings(params)
      setBookings(res.data)
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  const filtered = useMemo(() => {
    if (activeTab === 'all') return bookings
    return bookings.filter((b) => b.status === activeTab)
  }, [activeTab, bookings])

  const handleCancel = async () => {
    if (cancelId) {
      await bookingsApi.cancelBooking(cancelId)
      setCancelId(null)
      loadBookings()
    }
  }

  const tabCounts = {
    all: bookings.length,
    requested: bookings.filter((b) => b.status === 'requested').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    active: bookings.filter((b) => b.status === 'active').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }

  if (loadingKyc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Checking verification status...</p>
      </div>
    )
  }

  if (kycStatus !== 'APPROVED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 flex items-center justify-center rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold mb-2">KYC Verification Required</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Please complete your identity verification to access My Booking.
        </p>
        <Button onClick={() => navigate('/driver/documents')} className="px-6 py-2">
          Go to KYC
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Booking</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {(['all', 'requested', 'accepted', 'active', 'completed', 'cancelled'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="relative">
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1.5 text-xs text-muted-foreground">({tabCounts[tab]})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loadingBookings ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading bookings...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">No bookings</p>
              <p className="text-sm">Browse cars to make a booking.</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/driver/cars')}>Browse Cars</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((booking) => (
                  <motion.div key={booking.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Car className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{booking.car?.brand} {booking.car?.model}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatCurrency(booking.total_amount)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <StatusBadge status={booking.status} type="booking" />
                              <StatusBadge status={booking.payment_status || booking.payment?.status || 'incomplete'} type="payment" />
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`/driver/bookings/${booking.id}`)}>
                                Details
                              </Button>
                              {(booking.status === 'requested' || booking.status === 'active') && (
                                <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2 text-xs" onClick={() => setCancelId(booking.id)}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={cancelId !== null} onOpenChange={(o) => { if (!o) setCancelId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>This action cannot be undone. The booking will be cancelled immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setCancelId(null)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              Keep Booking
            </button>
            <button onClick={handleCancel} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-500 text-white hover:bg-red-600 h-10 px-4 py-2">
              Yes, Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
