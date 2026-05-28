import apiClient from './client'
import type { Notification } from '@/types'

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const res = await apiClient.get('/notifications')
    return res.data.data
  },

  markAsRead: async (id: string | number): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all')
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/notifications/unread-count')
    return res.data.data
  },
}
