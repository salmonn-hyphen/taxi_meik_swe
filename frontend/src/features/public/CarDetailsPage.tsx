import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Fuel, Users, Gauge, Calendar, DollarSign, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ImageViewer } from '@/components/shared/ImageViewer'
import { carsApi } from '@/api'
import type { Car } from '@/types'
import { formatCurrency } from '@/utils/format'
import { useAuth } from '@/providers'

export function CarDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    if (id) {
      loadCar(Number(id))
    }
  }, [id])

  const loadCar = async (carId: number) => {
    try {
      const data = await carsApi.getById(carId)
      setCar(data)
    } catch {
      navigate('/cars')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8"><LoadingSkeleton type="detail" /></div>
  if (!car) return null

  const photos = car.photos?.map((p) => p.url) || []
  const features = car.features || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Gallery */}
          <div>
            {photos.length > 0 ? (
              <>
                <div className="relative rounded-xl overflow-hidden h-80 cursor-pointer" onClick={() => setGalleryOpen(true)}>
                  <img src={photos[currentImage]} alt="" className="w-full h-full object-cover" />
                  {photos.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImage((i) => (i - 1 + photos.length) % photos.length) }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImage((i) => (i + 1) % photos.length) }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {photos.map((url, i) => (
                      <button key={i} onClick={() => setCurrentImage(i)} className={`w-20 h-16 rounded-lg overflow-hidden border-2 ${i === currentImage ? 'border-primary' : 'border-transparent'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <ImageViewer images={photos} initialIndex={currentImage} open={galleryOpen} onClose={() => setGalleryOpen(false)} />
              </>
            ) : (
              <div className="h-80 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">No photos</div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">{car.brand} {car.model}</h1>
                <p className="text-muted-foreground">{car.year} &middot; {car.color}</p>
              </div>
              <Badge variant={car.is_available ? 'success' : 'secondary'} className="text-sm px-3 py-1">
                {car.is_available ? 'Available' : 'Unavailable'}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span>{car.city}, {car.location}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: <Fuel className="w-4 h-4" />, label: 'Fuel', value: car.fuel_type },
                { icon: <Users className="w-4 h-4" />, label: 'Seats', value: `${car.seat_capacity} seats` },
                { icon: <Gauge className="w-4 h-4" />, label: 'Transmission', value: car.transmission },
                { icon: <Calendar className="w-4 h-4" />, label: 'License Plate', value: car.license_plate },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground">{item.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium capitalize">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="mb-6">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Daily Rate</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(car.daily_rate)}</span>
                </div>
                {car.weekly_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Weekly Rate</span>
                    <span className="font-semibold">{formatCurrency(car.weekly_rate)}</span>
                  </div>
                )}
                {car.monthly_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Rate</span>
                    <span className="font-semibold">{formatCurrency(car.monthly_rate)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm flex items-center gap-1"><Shield className="w-4 h-4" /> Deposit</span>
                  <span className="font-semibold">{formatCurrency(car.deposit_amount)}</span>
                </div>
              </CardContent>
            </Card>

            {car.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{car.description}</p>
              </div>
            )}

            {features.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Features</h3>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <Badge key={f} variant="secondary">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={!car.is_available}
              onClick={() => {
                if (!isAuthenticated) navigate('/login')
                else if (user?.role === 'DRIVER') navigate(`/driver/book?car=${car.id}`)
                else navigate('/register?role=driver')
              }}
            >
              {car.is_available ? 'Book Now' : 'Currently Unavailable'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
