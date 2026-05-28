import apiClient from './client'
import type {
  User,
  Car,
  Booking,
  AdminAction,
  AdminDashboardStats,
  OwnerDocument,
  DriverDocument,
  CarDocument,
} from '@/types'

export const adminApi = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const res = await apiClient.get('/admin/dashboard')
    return res.data.data
  },

  getUsers: async (role?: string): Promise<User[]> => {
    const res = await apiClient.get('/admin/users', { params: { role } })
    return res.data.data
  },

  getUser: async (id: string | number): Promise<User> => {
    const res = await apiClient.get(`/admin/users/${id}`)
    return res.data.data
  },

  suspendUser: async (id: string | number, reason: string): Promise<User> => {
    const res = await apiClient.post(`/admin/users/${id}/suspend`, { reason })
    return res.data.data
  },

  unsuspendUser: async (id: string | number): Promise<User> => {
    const res = await apiClient.post(`/admin/users/${id}/unsuspend`)
    return res.data.data
  },

  // Owner verifications
  getPendingOwners: async (): Promise<User[]> => {
    const res = await apiClient.get('/admin/verifications/owners')
    return res.data.data
  },

  verifyOwner: async (userId: string | number, status: string, notes?: string): Promise<User> => {
    const res = await apiClient.post(`/admin/verifications/owners/${userId}`, { status, notes })
    return res.data.data
  },

  getOwnerDocuments: async (userId: string | number): Promise<OwnerDocument[]> => {
    const res = await apiClient.get(`/admin/users/${userId}/owner-documents`)
    return res.data.data
  },

  // Driver KYC verifications
  getPendingDrivers: async (): Promise<any[]> => {
    const res = await apiClient.get('/admin/verifications/drivers')
    return res.data.data
  },

  getKYCHistory: async (): Promise<any[]> => {
    const res = await apiClient.get('/admin/verifications/drivers/history')
    return res.data.data
  },

  reviewDriverKYC: async (driverProfileId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any> => {
    const res = await apiClient.put(`/admin/verifications/drivers/${driverProfileId}`, { status, rejectionReason })
    return res.data.data
  },

  verifyDriver: async (userId: string | number, status: string, notes?: string): Promise<User> => {
    const res = await apiClient.post(`/admin/verifications/drivers/${userId}`, { status, notes })
    return res.data.data
  },

  getDriverDocuments: async (userId: string | number): Promise<DriverDocument[]> => {
    const res = await apiClient.get(`/admin/users/${userId}/driver-documents`)
    return res.data.data
  },

  // Car verifications
  getPendingCars: async (): Promise<Car[]> => {
    const res = await apiClient.get('/admin/verifications/cars')
    return res.data.data
  },

  verifyCar: async (carId: string | number, status: string, notes?: string): Promise<Car> => {
    const res = await apiClient.post(`/admin/verifications/cars/${carId}`, { status, notes })
    return res.data.data
  },

  getCarDocuments: async (carId: string | number): Promise<CarDocument[]> => {
    const res = await apiClient.get(`/admin/cars/${carId}/documents`)
    return res.data.data
  },

  // Document management
  approveDocument: async (type: string, id: number, notes?: string): Promise<void> => {
    await apiClient.post(`/admin/documents/${type}/${id}/approve`, { notes })
  },

  rejectDocument: async (type: string, id: number, reason: string): Promise<void> => {
    await apiClient.post(`/admin/documents/${type}/${id}/reject`, { reason })
  },

  // Audit log
  getAuditLog: async (): Promise<AdminAction[]> => {
    const res = await apiClient.get('/admin/audit-log')
    return res.data.data
  },
}
