import apiClient from './client'
import type {
    Client,
    ClientDetail,
    CreateClientPayload,
    UpdateClientPayload,
    Authorization,
    CreateAuthorizationPayload,
    PaginatedResponse,
} from '../types'

export const clientsApi = {
    getAll: async (params?: {
        search?: string
        status?: string
        page?: number
        page_size?: number
    }): Promise<PaginatedResponse<Client>> => {
        const { data } = await apiClient.get<PaginatedResponse<Client>>('/clients/', { params })
        return data
    },

    getById: async (id: string): Promise<ClientDetail> => {
        const { data } = await apiClient.get<ClientDetail>(`/clients/${id}/`)
        return data
    },

    create: async (payload: CreateClientPayload): Promise<Client> => {
        const { data } = await apiClient.post<Client>('/clients/', payload)
        return data
    },

    update: async (id: string, payload: UpdateClientPayload): Promise<Client> => {
        const { data } = await apiClient.put<Client>(`/clients/${id}/`, payload)
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/clients/${id}/`)
    },

    // ─── Authorizations ──────────────────────────────────────────────────
    getAuthorizations: async (clientId: string): Promise<Authorization[]> => {
        const { data } = await apiClient.get<Authorization[]>(`/clients/${clientId}/authorizations/`)
        return data
    },

    createAuthorization: async (payload: CreateAuthorizationPayload): Promise<Authorization> => {
        const { data } = await apiClient.post<Authorization>('/authorizations/', payload)
        return data
    },

    updateAuthorization: async (id: string, payload: Partial<CreateAuthorizationPayload>): Promise<Authorization> => {
        const { data } = await apiClient.put<Authorization>(`/authorizations/${id}/`, payload)
        return data
    },

    // ─── Documents ────────────────────────────────────────────────────────
    uploadDocument: async (clientId: string, file: File, documentType?: string): Promise<{ id: string; file_name: string }> => {
        const formData = new FormData()
        formData.append('file', file)
        if (documentType) formData.append('document_type', documentType)

        const { data } = await apiClient.post(`/clients/${clientId}/documents/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },

    deleteDocument: async (clientId: string, documentId: string): Promise<void> => {
        await apiClient.delete(`/clients/${clientId}/documents/${documentId}/`)
    },

    // ─── Import ───────────────────────────────────────────────────────────
    importCSV: async (file: File): Promise<{ imported: number; errors: number }> => {
        const formData = new FormData()
        formData.append('file', file)

        const { data } = await apiClient.post('/clients/import/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },
}
