import apiClient from './client'
import type { LoginRequest, LoginResponse, AuthUser, ChangePasswordRequest, TokenRefreshResponse } from '../types'

export const authApi = {
    login: async (payload: LoginRequest): Promise<LoginResponse> => {
        const { data } = await apiClient.post<LoginResponse>('/auth/login/', payload)
        localStorage.setItem('sirena_access_token', data.access)
        localStorage.setItem('sirena_refresh_token', data.refresh)
        localStorage.setItem('sirena_auth', 'true')
        return data
    },

    logout: async (): Promise<void> => {
        try {
            await apiClient.post('/auth/logout/')
        } finally {
            localStorage.removeItem('sirena_access_token')
            localStorage.removeItem('sirena_refresh_token')
            localStorage.removeItem('sirena_auth')
        }
    },

    getMe: async (): Promise<AuthUser> => {
        const { data } = await apiClient.get<AuthUser>('/auth/me/')
        return data
    },

    refreshToken: async (refresh: string): Promise<TokenRefreshResponse> => {
        const { data } = await apiClient.post<TokenRefreshResponse>('/auth/token/refresh/', { refresh })
        localStorage.setItem('sirena_access_token', data.access)
        return data
    },

    changePassword: async (payload: ChangePasswordRequest): Promise<{ message: string }> => {
        const { data } = await apiClient.put<{ message: string }>('/auth/password/', payload)
        return data
    },
}
