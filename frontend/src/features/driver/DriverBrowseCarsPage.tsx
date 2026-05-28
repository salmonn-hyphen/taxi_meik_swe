import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CarCard } from '@/components/shared/CarCard'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { carsApi } from '@/api'
import type { Car } from '@/types'

const PER_PAGE_DESKTOP = 12
const PER_PAGE_MOBILE = 6

export function DriverBrowseCarsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const perPage = isMobile ? PER_PAGE_MOBILE : PER_PAGE_DESKTOP

  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await carsApi.list({ verified_only: true })
        setCars(response.data || [])
      } catch (err: any) {
        setCars([])
        setError(err.response?.data?.error || 'Failed to load cars.')
      } finally {
        setLoading(false)
      }
    }

    loadCars()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return cars.filter((c) => {
      if (!q) return true
      return c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q)
    })
  }, [cars, search])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handlePage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Cars</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find the perfect car for your next rental</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by brand or model..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={8} />
      ) : error ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Could not load cars</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No cars found</p>
          <p className="text-sm">Only admin-approved, available cars from verified owners appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {paginated.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onView={(id) => navigate(`/driver/cars/${id}`)}
                onBook={(id) => navigate(`/driver/bookings?car=${id}`)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePage(page - 1)}>Previous</Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={page === i + 1 ? 'default' : 'outline'}
                  onClick={() => handlePage(i + 1)}
                  className="min-w-[36px]"
                >
                  {i + 1}
                </Button>
              ))}
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
