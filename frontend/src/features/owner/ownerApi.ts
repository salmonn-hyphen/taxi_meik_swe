import apiClient from '@/api/client'
import type { OwnerDashboardStats } from '@/types'

const AGENCY_COMMISSION_RATE = 0.1

function withProfit(stats: Omit<OwnerDashboardStats, 'agency_commission_rate' | 'agency_profit' | 'driver_total_paid' | 'owner_net_earning'>): OwnerDashboardStats {
  const driverTotalPaid = stats.recent_bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)
  const agencyProfit = Math.round(driverTotalPaid * AGENCY_COMMISSION_RATE)

  return {
    ...stats,
    agency_commission_rate: AGENCY_COMMISSION_RATE,
    driver_total_paid: driverTotalPaid,
    agency_profit: agencyProfit,
    owner_net_earning: driverTotalPaid - agencyProfit,
  }
}

export const ownersApi = {
  getDashboard: async (): Promise<OwnerDashboardStats> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    return withProfit({
      total_cars: 4,
      verified_cars: 3,
      active_rentals: 0,
      pending_bookings: 0,
      total_earnings: 0,
      monthly_earnings: [
        { month: 'Jan', amount: 0 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 0 },
        { month: 'Apr', amount: 0 },
        { month: 'May', amount: 0 },
        { month: 'Jun', amount: 0 },
      ],
      recent_bookings: [],
    })
  },

  getEarnings: async (): Promise<{ total: number; monthly: { month: string; amount: number }[] }> => {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      total: 1250000,
      monthly: [
        { month: 'Jan', amount: 350000 },
        { month: 'Feb', amount: 420000 },
        { month: 'Mar', amount: 310000 },
        { month: 'Apr', amount: 580000 },
        { month: 'May', amount: 480000 },
        { month: 'Jun', amount: 620000 },
      ]
    }
  },
}
