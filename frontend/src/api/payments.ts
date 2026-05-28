import apiClient from './client'
import type { Payment, PaginatedResponse } from '@/types'

export const paymentsApi = {
  submitPayment: async (bookingId: string | number, data: FormData): Promise<Payment> => {
    const res = await apiClient.post(`/bookings/${bookingId}/payments`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  getBookingPayment: async (bookingId: string | number): Promise<Payment> => {
    const res = await apiClient.get(`/bookings/${bookingId}/payments`)
    return res.data.data
  },

  getMyPayments: async (params?: { page?: number }): Promise<PaginatedResponse<Payment>> => {
    const res = await apiClient.get('/driver/payments', { params })
    return res.data
  },

  getOwnerPayments: async (params?: { page?: number }): Promise<PaginatedResponse<Payment>> => {
    const res = await apiClient.get('/owner/payments', { params })
    return res.data
  },

  getPendingPayments: async (): Promise<Payment[]> => {
    const res = await apiClient.get('/admin/payments/pending')
    return res.data.data
  },

  confirmPayment: async (id: string | number, notes?: string): Promise<Payment> => {
    const res = await apiClient.post(`/admin/payments/${id}/confirm`, { notes })
    return res.data.data
  },

  rejectPayment: async (id: string | number, reason: string): Promise<Payment> => {
    const res = await apiClient.post(`/admin/payments/${id}/reject`, { reason })
    return res.data.data
  },
}
