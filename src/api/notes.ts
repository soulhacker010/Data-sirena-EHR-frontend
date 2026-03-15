import apiClient from './client'
import type {
    SessionNote,
    NoteTemplate,
    CreateNotePayload,
    UpdateNotePayload,
    SignNotePayload,
    CoSignRequestPayload,
    CoSignNotePayload,
    NoteFilters,
    PaginatedResponse,
} from '../types'

export const notesApi = {
    getAll: async (filters?: NoteFilters): Promise<PaginatedResponse<SessionNote>> => {
        const { data } = await apiClient.get<PaginatedResponse<SessionNote>>('/notes/', { params: filters })
        return data
    },

    getById: async (id: string): Promise<SessionNote> => {
        const { data } = await apiClient.get<SessionNote>(`/notes/${id}/`)
        return data
    },

    create: async (payload: CreateNotePayload): Promise<SessionNote> => {
        const { data } = await apiClient.post<SessionNote>('/notes/', payload)
        return data
    },

    update: async (id: string, payload: UpdateNotePayload): Promise<SessionNote> => {
        const { data } = await apiClient.put<SessionNote>(`/notes/${id}/`, payload)
        return data
    },

    sign: async (id: string, payload: SignNotePayload): Promise<SessionNote> => {
        const { data } = await apiClient.post<SessionNote>(`/notes/${id}/sign/`, payload)
        return data
    },

    requestCoSign: async (id: string, payload: CoSignRequestPayload): Promise<SessionNote> => {
        const { data } = await apiClient.post<SessionNote>(`/notes/${id}/cosign/`, payload)
        return data
    },

    coSign: async (id: string, payload: CoSignNotePayload): Promise<SessionNote> => {
        const { data } = await apiClient.post<SessionNote>(`/notes/${id}/cosign/`, payload)
        return data
    },

    // ─── Templates ────────────────────────────────────────────────────────
    getTemplates: async (): Promise<NoteTemplate[]> => {
        const { data } = await apiClient.get<NoteTemplate[]>('/notes/templates/')
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/notes/${id}/`)
    },
}
