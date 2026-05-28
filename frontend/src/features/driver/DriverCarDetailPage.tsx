import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Fuel, Gauge, Users, MapPin, CalendarDays, Star,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { KYCLock } from '@/components/shared/KYCLock'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useAuth, useToast } from '@/providers'
import { bookingsApi, carsApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Car } from '@/types'

const KYC_REQUIRED = ['verified', 'trusted']

export function DriverCarDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [showApply, setShowApply] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  const carBookings = useMemo<any[]>(() => [], [])
  const carReviews = useMemo<any[]>(() => [], [])

  useEffect(() => {
    const loadCar = async () => {
      if (!id) {
        setError('Car not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await carsApi.getById(id)
        setCar(data)
      } catch (err: any) {
        setCar(null)
        setError(err.response?.data?.error || 'Car not found')
      } finally {
        setLoading(false)
      }
    }

    loadCar()
  }, [id])

  useEffect(() => {
    setImgIdx(0)
  }, [car?.id])

  if (loading) {
    return <LoadingSkeleton type="detail" count={3} />
  }

  if (!car || error) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">{error || 'Car not found'}</p>
        <Button size="sm" className="mt-3" onClick={() => navigate('/driver/cars')}>Back to Browse</Button>
      </div>
    )
  }

  const photos = car.photos || []

  const handleApply = async () => {
    if (!car) return

    try {
      setApplying(true)
      await bookingsApi.create(car.id, {
        driver_notes: `Borrow request for ${car.brand} ${car.model}`,
      })
      setApplied(true)
      setShowApply(false)
      addToast('Borrow request sent to the owner.', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send borrow request.', 'error')
    } finally {
      setApplying(false)
    }
  }

  const handleSubmitReview = () => {
    setShowReview(false)
  }

  const detailContent = (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/driver/cars')} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to Browse
      </button>

      <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/9] sm:aspect-[16/7]">
        <img
          src={photos[imgIdx]?.url || '/placeholder-car.jpg'}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button onClick={() => setImgIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setImgIdx((i) => (i + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{car.brand} {car.model}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" /> {car.city}, {car.location}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1"><Fuel className="w-3.5 h-3.5" /> {car.fuel_type}</Badge>
            <Badge variant="outline" className="gap-1"><Gauge className="w-3.5 h-3.5" /> {car.transmission}</Badge>
            <Badge variant="outline" className="gap-1"><Users className="w-3.5 h-3.5" /> {car.seat_capacity} seats</Badge>
            <Badge variant="outline">{car.year}</Badge>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{car.description}</p>
            </CardContent>
          </Card>

          <div>
            <h2 className="font-semibold mb-3">Features</h2>
            <div className="flex flex-wrap gap-2">
              {car.features?.map((f, i) => (
                <Badge key={i} variant="secondary">{f}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Owner</h2>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {car.owner?.name?.charAt(0) || 'O'}
                </div>
                <div>
                  <p className="font-medium">{car.owner?.name}</p>
                  <p className="text-xs text-muted-foreground">{car.owner?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {carReviews.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Reviews ({carReviews.length})
              </h2>
              <div className="space-y-3">
                {carReviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{r.reviewer?.name || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(car.daily_rate)}<span className="text-sm text-muted-foreground font-normal">/day</span></p>
                {car.deposit_amount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">Deposit: {formatCurrency(car.deposit_amount)}</p>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1.5">
                {car.weekly_rate && <p>Weekly: {formatCurrency(car.weekly_rate)}</p>}
                {car.monthly_rate && <p>Monthly: {formatCurrency(car.monthly_rate)}</p>}
              </div>

              <Button className="w-full" size="lg" disabled={!car.is_available || applied || applying} onClick={() => setShowApply(true)}>
                {applied ? 'Application Sent' : car.is_available ? 'Apply to Rent' : 'Unavailable'}
              </Button>

              {carBookings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Rental History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {carBookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="text-xs text-muted-foreground flex items-center justify-between py-1 border-b last:border-0">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(b.start_date)}</span>
                        <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to Rent</DialogTitle>
            <DialogDescription>
              You are applying to rent {car.brand} {car.model} at {formatCurrency(car.daily_rate)}/day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowApply(false)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              Cancel
            </button>
            <button disabled={applying} onClick={handleApply} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              {applying ? 'Sending...' : 'Send Application'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (user && !KYC_REQUIRED.includes(user.verification_status)) {
    return (
      <KYCLock feature="car applications">
        {detailContent}
      </KYCLock>
    )
  }

  return detailContent
}
