import apiClient from './client'
import type { AuthResponse, LoginRequest, RegisterOwnerRequest, RegisterDriverRequest, User } from '@/types'
import { normalizeVerificationStatus } from '@/constants'

function mapBackendUser(baUser: any): User {
  return {
    id: baUser.id as any,
    name: baUser.name,
    email: baUser.email,
    phone: baUser.phone || '',
    role: baUser.role as any,
    email_verified_at: baUser.emailVerified ? new Date().toISOString() : null,
    verification_status: normalizeVerificationStatus(baUser.verificationStatus) as any,
    suspension_reason: null,
    profile_photo_url: baUser.image || null,
    created_at: baUser.createdAt ? new Date(baUser.createdAt).toISOString() : new Date().toISOString(),
    updated_at: baUser.updatedAt ? new Date(baUser.updatedAt).toISOString() : new Date().toISOString(),
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', {
      email: data.email,
      phone: data.phone,
      password: data.password,
    })

    if (!response.data?.user || !response.data?.accessToken) {
      throw new Error(response.data?.error || 'Login failed')
    }

    return {
      user: mapBackendUser(response.data.user),
      token: response.data.accessToken,
    }
  },

  registerOwner: async (data: RegisterOwnerRequest): Promise<AuthResponse> => {
    throw new Error('Use registerRequest and registerVerify flow instead.')
  },

  registerDriver: async (data: RegisterDriverRequest): Promise<AuthResponse> => {
    throw new Error('Use registerRequest and registerVerify flow instead.')
  },

  registerRequest: async (data: any): Promise<{ success: boolean; tempToken: string; code?: string }> => {
    const response = await apiClient.post('/register-request', data)
    return response.data
  },

  registerVerify: async (tempToken: string, code: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/register-verify', { tempToken, code })
    return response.data
  },

  getEmailByPhone: async (phone: string): Promise<{ email: string }> => {
    const response = await apiClient.get('/get-email-by-phone', { params: { phone } })
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  me: async (): Promise<AuthResponse> => {
    // If a logout just happened, avoid automatic refresh which can immediately re-authenticate
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('skip_refresh') === '1') {
        // consume the flag and behave as unauthenticated without attempting refresh
        sessionStorage.removeItem('skip_refresh')
        throw new Error('Skip refresh after logout')
      }
    } catch (e) {
      // ignore sessionStorage errors in non-browser environments
    }

    try {
      const response = await apiClient.get('/auth/session')
      if (!response.data?.user) {
        throw new Error('Not authenticated')
      }
      return {
        user: mapBackendUser(response.data.user),
        token: response.data.session?.token || response.data.session?.accessToken || '',
      }
    } catch (error: any) {
      const status = error?.response?.status
      if (status !== 401) {
        throw error
      }

      const refreshed = await apiClient.post('/auth/refresh')
      if (!refreshed.data?.user) {
        throw new Error('Not authenticated')
      }

      return {
        user: mapBackendUser(refreshed.data.user),
        token: refreshed.data.session?.token || refreshed.data.accessToken || '',
      }
    }
  },

  forgotPassword: async (_email: string): Promise<void> => {
    throw new Error('Backend under maintenance. Password reset is disabled.')
  },

  resetPassword: async (_data: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> => {
    throw new Error('Backend under maintenance. Password reset is disabled.')
  },

  verifyEmail: async (_id: number, _hash: string): Promise<void> => {
    throw new Error('Backend under maintenance.')
  },

  resendVerification: async (): Promise<void> => {
    throw new Error('Backend under maintenance.')
  },
}
