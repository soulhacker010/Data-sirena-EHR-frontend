import apiClient from './client'
import type { User, PaginatedResponse } from '../types'

export interface CreateUserPayload {
    email: string
    first_name: string
    last_name: string
    role: string
    password: string
    organization_id: string
    phone?: string
    /** Array of state license identifiers (model: ArrayField). */
    licenses?: string[]
    /** Free-text credentials line (model: CharField max 255), e.g. "PsyD, ABPP". */
    credentials?: string
    /** E5: provider's individual (Type 1) NPI; 10 digits, Luhn-validated server-side. */
    npi?: string
}

export interface UpdateUserPayload {
    first_name?: string
    last_name?: string
    email?: string
    role?: string
    phone?: string
    is_active?: boolean
    licenses?: string[]
    credentials?: string
    npi?: string
}

export const usersApi = {
    getAll: async (params?: {
        search?: string
        role?: string
        is_active?: boolean
        page?: number
        page_size?: number
    }): Promise<PaginatedResponse<User>> => {
        const { data } = await apiClient.get<PaginatedResponse<User>>('/auth/users/', { params })
        return data
    },

    getById: async (id: string): Promise<User> => {
        const { data } = await apiClient.get<User>(`/auth/users/${id}/`)
        return data
    },

    create: async (payload: CreateUserPayload): Promise<User> => {
        const { data } = await apiClient.post<User>('/auth/users/', payload)
        return data
    },

    update: async (id: string, payload: UpdateUserPayload): Promise<User> => {
        const { data } = await apiClient.put<User>(`/auth/users/${id}/`, payload)
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/auth/users/${id}/`)
    },

    /** Admin sends a password reset link to this user's email. (B12) */
    sendResetLink: async (id: string): Promise<{ detail: string; email: string }> => {
        const { data } = await apiClient.post<{ detail: string; email: string }>(
            `/auth/users/${id}/send-reset-link/`,
        )
        return data
    },
}
