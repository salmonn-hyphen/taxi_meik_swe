import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Eye, Edit, Trash2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { KYCLock } from '@/components/shared/KYCLock'
import { carsApi } from '@/api'
import type { Car } from '@/types'
import { formatCurrency } from '@/utils/format'

export function OwnerCarsPage() {
  return (
    <KYCLock feature="My Post">
      <OwnerCarsContent />
    </KYCLock>
  )
}

function OwnerCarsContent() {
  const navigate = useNavigate()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadCars()
  }, [])

  const loadCars = async () => {
    try {
      const data = await carsApi.getOwnerCars()
      setCars(data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await carsApi.delete(deleteId)
      setCars((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } catch {
      // handle
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleAvailability = async (id: string) => {
    try {
      const updated = await carsApi.toggleAvailability(id)
      setCars((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch {
      // handle
    }
  }

  const canEditCar = (car: Car) => car.status !== 'verified' && car.admin_approval_status !== 'APPROVED'

  if (loading) return <LoadingSkeleton type="card" count={3} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Post</h1>
          <p className="text-muted-foreground">Manage your car listings</p>
        </div>
        <Link to="/owner/cars/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Add Car</Button>
        </Link>
      </div>

      {cars.length === 0 ? (
        <EmptyState
          title="No cars listed yet"
          description="Add your first car to start earning."
          action={<Link to="/owner/cars/new"><Button><Plus className="w-4 h-4 mr-2" /> Add Car</Button></Link>}
        />
      ) : (
        <div className="grid gap-4">
          {cars.map((car) => (
            <motion.div key={car.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                      {car.photos?.[0] ? (
                        <img src={car.photos[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{car.brand} {car.model} ({car.year})</h3>
                          <p className="text-sm text-muted-foreground">{car.city} &middot; {car.license_plate}</p>
                        </div>
                        <StatusBadge status={car.status} type="verification" />
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="font-semibold text-primary">{formatCurrency(car.daily_rate)}<span className="text-xs text-muted-foreground">/day</span></span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${car.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {car.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/cars/${car.id}`)}><Eye className="w-3 h-3 mr-1" /> View</Button>
                        {canEditCar(car) ? (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/owner/cars/${car.id}/edit`)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled><Edit className="w-3 h-3 mr-1" /> Approved</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleToggleAvailability(car.id)}>
                          <Power className="w-3 h-3 mr-1" /> {car.is_available ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteId(car.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Car"
        description="Are you sure you want to delete this car? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
