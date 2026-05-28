import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Car, CalendarCheck, DollarSign, Clock,
  ShieldAlert, ShieldEllipsis, XCircle,
  ArrowRight, PlusCircle, List, Eye, Landmark,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ownersApi } from './ownerApi'
import { usersApi } from '@/api'
import { useAuth } from '@/providers'
import { isKycApproved, normalizeVerificationStatus } from '@/constants'
import type { OwnerDashboardStats } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

function KYCAlert({ status }: { status: string }) {
  const normalizedStatus = normalizeVerificationStatus(status)
  if (isKycApproved(normalizedStatus)) return null

  const config: Record<string, { icon: React.ReactNode; color: string; title: string; desc: string }> = {
    unverified: {
      icon: <ShieldAlert className="w-5 h-5" />,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      title: 'KYC Verification Required',
      desc: 'Please upload your documents to start posting cars and receiving bookings.',
    },
    pending: {
      icon: <ShieldEllipsis className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      title: 'KYC Under Review',
      desc: 'Your documents are being reviewed. You will be able to post cars once verified.',
    },
    rejected: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'bg-red-50 border-red-200 text-red-800',
      title: 'KYC Verification Rejected',
      desc: 'Some documents were rejected. Please re-upload them.',
    },
  }

  const c = config[normalizedStatus] || config.unverified

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-start gap-3 ${c.color}`}
    >
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{c.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{c.desc}</p>
        <Link to="/owner/documents">
          <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs font-medium">
            Go to KYC <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

const DEFAULT_AGENCY_COMMISSION_RATE = 0.1

function calculateBookingProfit(totalAmount: number, rate = DEFAULT_AGENCY_COMMISSION_RATE) {
  const agencyProfit = Math.round(totalAmount * rate)
  return {
    driverPaid: totalAmount,
    agencyProfit,
    ownerEarning: totalAmount - agencyProfit,
  }
}

export function OwnerDashboardPage() {
  const { user, updateUser } = useAuth()
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    syncOwnerKycStatus()
  }, [])

  const syncOwnerKycStatus = async () => {
    if (!user) return

    try {
      const profile = await usersApi.getOwnerProfile()
      const nextStatus = normalizeVerificationStatus(profile.admin_approval_status)

      if (nextStatus !== user.verification_status) {
        updateUser({ ...user, verification_status: nextStatus as any })
      }
    } catch {
      // Keep the cached user if the profile endpoint is unavailable.
    }
  }

  const loadStats = async () => {
    try {
      const data = await ownersApi.getDashboard()
      const driverTotalPaid = data.driver_total_paid ?? data.recent_bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)
      const agencyRate = data.agency_commission_rate ?? DEFAULT_AGENCY_COMMISSION_RATE
      const agencyProfit = data.agency_profit ?? Math.round(driverTotalPaid * agencyRate)

      setStats({
        ...data,
        agency_commission_rate: agencyRate,
        driver_total_paid: driverTotalPaid,
        agency_profit: agencyProfit,
        owner_net_earning: data.owner_net_earning ?? driverTotalPaid - agencyProfit,
      })
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton type="detail" count={3} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.name?.split(' ')[0] || 'Owner'}
        </p>
      </div>

      {user && <KYCAlert status={user.verification_status} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Cars"
          value={stats?.total_cars ?? 0}
          icon={<Car className="w-5 h-5" />}
          description={`${stats?.verified_cars ?? 0} verified`}
        />
        <StatsCard
          title="Active Rentals"
          value={stats?.active_rentals ?? 0}
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Pending Bookings"
          value={stats?.pending_bookings ?? 0}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatsCard
          title="Owner Earning"
          value={formatCurrency(stats?.owner_net_earning ?? stats?.total_earnings ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          description={`${Math.round((1 - (stats?.agency_commission_rate ?? DEFAULT_AGENCY_COMMISSION_RATE)) * 100)}% after commission`}
        />
        <StatsCard
          title="Agency Profit"
          value={formatCurrency(stats?.agency_profit ?? 0)}
          icon={<Landmark className="w-5 h-5" />}
          description={`${Math.round((stats?.agency_commission_rate ?? DEFAULT_AGENCY_COMMISSION_RATE) * 100)}% commission`}
        />
      </div>

      {(stats?.driver_total_paid ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="font-semibold text-sm">Profit Split</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Calculated from driver payments using {Math.round((stats?.agency_commission_rate ?? DEFAULT_AGENCY_COMMISSION_RATE) * 100)}% agency commission.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Driver Paid</p>
                <p className="text-lg font-semibold">{formatCurrency(stats?.driver_total_paid ?? 0)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Agency Gets</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(stats?.agency_profit ?? 0)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Owner Gets</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(stats?.owner_net_earning ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recent Bookings</h2>
              <Link to="/owner/bookings">
                <Button size="sm" variant="ghost" className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {stats?.recent_bookings && stats.recent_bookings.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.car?.brand} {booking.car?.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </p>
                      {(() => {
                        const split = calculateBookingProfit(booking.total_amount, stats?.agency_commission_rate)
                        return (
                          <p className="text-xs text-muted-foreground">
                            Owner {formatCurrency(split.ownerEarning)} / Agency {formatCurrency(split.agencyProfit)}
                          </p>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatCurrency(booking.total_amount)}</span>
                      <StatusBadge status={booking.status} type="booking" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent bookings</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-semibold text-sm mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/owner/cars/new">
                <Button variant="outline" className="w-full h-20 flex-col gap-1 text-xs">
                  <PlusCircle className="w-5 h-5" />
                  Post Car
                </Button>
              </Link>
              <Link to="/owner/cars">
                <Button variant="outline" className="w-full h-20 flex-col gap-1 text-xs">
                  <List className="w-5 h-5" />
                  My Posts
                </Button>
              </Link>
              <Link to="/owner/bookings">
                <Button variant="outline" className="w-full h-20 flex-col gap-1 text-xs">
                  <Eye className="w-5 h-5" />
                  View Bookings
                </Button>
              </Link>
              <Link to="/owner/documents">
                <Button variant="outline" className="w-full h-20 flex-col gap-1 text-xs">
                  <ShieldAlert className="w-5 h-5" />
                  KYC
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.monthly_earnings && stats.monthly_earnings.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-semibold text-sm mb-4">Monthly Earnings</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
              {stats.monthly_earnings.map((m) => (
                <div key={m.month} className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{m.month}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(m.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
