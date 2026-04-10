import apiClient from './client'

export interface IntakeAssessment {
    id: string
    client_id: string
    client_name: string
    provider_id: string
    provider_name: string
    assessment_date: string
    intake_data: Record<string, unknown>
    status: 'draft' | 'completed' | 'signed' | 'co_signed'
    is_locked: boolean
    signature_data: string
    signed_at: string | null
    co_signed_by: string | null
    co_signer_name: string | null
    co_signed_at: string | null
    supervisor_signature: string
    client_signature: string
    client_signed_at: string | null
    version: number
    created_at: string
    updated_at: string
}

export interface IntakeListItem {
    id: string
    client_id: string
    client_name: string
    provider_name: string
    assessment_date: string
    status: string
    is_locked: boolean
    created_at: string
}

export interface PaginatedIntakes {
    count: number
    next: string | null
    previous: string | null
    results: IntakeListItem[]
}

export interface IntakeFilters {
    client?: string
    provider?: string
    status?: string
    page?: number
}

export const intakesApi = {
    getAll: async (filters?: IntakeFilters): Promise<PaginatedIntakes> => {
        const { data } = await apiClient.get<PaginatedIntakes>('/intakes/', { params: filters })
        return data
    },

    getById: async (id: string): Promise<IntakeAssessment> => {
        const { data } = await apiClient.get<IntakeAssessment>(`/intakes/${id}/`)
        return data
    },

    create: async (payload: { client_id: string; assessment_date: string; intake_data: Record<string, unknown> }): Promise<IntakeAssessment> => {
        const { data } = await apiClient.post<IntakeAssessment>('/intakes/', payload)
        return data
    },

    update: async (id: string, payload: { intake_data: Record<string, unknown>; assessment_date?: string }): Promise<IntakeAssessment> => {
        const { data } = await apiClient.put<IntakeAssessment>(`/intakes/${id}/`, payload)
        return data
    },

    sign: async (id: string, signatureData: string): Promise<IntakeAssessment> => {
        const { data } = await apiClient.post<IntakeAssessment>(`/intakes/${id}/sign/`, { signature_data: signatureData })
        return data
    },

    clientSign: async (id: string, signatureData: string): Promise<IntakeAssessment> => {
        const { data } = await apiClient.post<IntakeAssessment>(`/intakes/${id}/client-sign/`, { signature_data: signatureData })
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/intakes/${id}/`)
    },
}
