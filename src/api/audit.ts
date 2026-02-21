import apiClient from './client'
import type { AuditLog, PaginatedResponse } from '../types'

export const auditApi = {
    getAll: async (params?: {
        search?: string
        action?: string
        user?: string
        start_date?: string
        end_date?: string
        page?: number
        page_size?: number
    }): Promise<PaginatedResponse<AuditLog>> => {
        const { data } = await apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/', { params })
        return data
    },
}
