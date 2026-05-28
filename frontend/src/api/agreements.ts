import apiClient from './client'
import type { Booking } from '@/types'

export interface Agreement extends Booking {
  agreement_sent_at: string | null
  owner_agreement_agreed_at: string | null
  driver_agreement_agreed_at: string | null
}

export const agreementsApi = {
  list: async (): Promise<Agreement[]> => {
    const res = await apiClient.get('/agreements')
    return res.data.data
  },
}
