import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Fuel, Gauge } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/utils/format'

interface CarCardProps {
  car: any
  onView?: (id: string | number) => void
  onBook?: (id: string | number) => void
}

export function CarCard({ car, onView, onBook }: CarCardProps) {
  const photos = car.photos || []
  const [imgIdx, setImgIdx] = useState(0)

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setImgIdx((i) => (i - 1 + photos.length) % photos.length)
  }
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setImgIdx((i) => (i + 1) % photos.length)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group rounded-xl border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={photos[imgIdx]?.url || '/placeholder-car.jpg'}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {photos.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextImg} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_: unknown, i: number) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-base truncate">{car.brand} {car.model}</h3>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> {car.fuel_type}</span>
          <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {car.transmission}</span>
        </div>

        <div className="pt-2 border-t flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-primary">{formatCurrency(car.daily_rate)}<span className="text-xs text-muted-foreground font-normal">/d</span></p>
            {car.deposit_amount > 0 && (
              <p className="text-xs text-muted-foreground">Deposit: {formatCurrency(car.deposit_amount)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onView?.(car.id)}>View</Button>
            {car.is_available && car.status === 'verified' && (
              <Button size="sm" onClick={() => onBook?.(car.id)}>Apply</Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
