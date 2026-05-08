/**
 * Contact notes (E19) — non-billable client contact log.
 *
 *   GET    /api/v1/contact-notes/?client={id}  → list (filterable)
 *   POST   /api/v1/contact-notes/              → create
 *   PUT    /api/v1/contact-notes/{id}/         → update (author only)
 *   DELETE /api/v1/contact-notes/{id}/         → delete (author or admin)
 */
import apiClient from './client'
import type { PaginatedResponse } from '../types'

export type ContactType =
    | 'phone_outbound'
    | 'phone_inbound'
    | 'voicemail_left'
    | 'email'
    | 'text_message'
    | 'missed_outreach'
    | 'in_person_brief'
    | 'collateral'
    | 'other'

export interface ContactNote {
    id: string
    client_id: string
    client_name: string
    provider_id: string
    provider_name: string
    contact_date: string
    contact_type: ContactType
    contact_type_display: string
    summary: string
    duration_minutes: number | null
    created_at: string
    updated_at: string
}

export interface CreateContactNotePayload {
    client_id: string
    contact_date: string
    contact_type: ContactType
    summary: string
    duration_minutes?: number | null
}

export type UpdateContactNotePayload = Partial<Omit<CreateContactNotePayload, 'client_id'>>

export interface ContactNoteFilters {
    client?: string
    provider?: string
    contact_type?: ContactType
    page?: number
    page_size?: number
}

const URL = '/contact-notes/'

export const contactNotesApi = {
    list: async (filters?: ContactNoteFilters): Promise<PaginatedResponse<ContactNote>> => {
        const { data } = await apiClient.get<PaginatedResponse<ContactNote>>(URL, { params: filters })
        return data
    },

    getById: async (id: string): Promise<ContactNote> => {
        const { data } = await apiClient.get<ContactNote>(`${URL}${id}/`)
        return data
    },

    create: async (payload: CreateContactNotePayload): Promise<ContactNote> => {
        const { data } = await apiClient.post<ContactNote>(URL, payload)
        return data
    },

    update: async (id: string, payload: UpdateContactNotePayload): Promise<ContactNote> => {
        const { data } = await apiClient.patch<ContactNote>(`${URL}${id}/`, payload)
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${URL}${id}/`)
    },
}

export const CONTACT_TYPE_OPTIONS: Array<{ value: ContactType; label: string }> = [
    { value: 'phone_outbound', label: 'Phone (Outbound)' },
    { value: 'phone_inbound', label: 'Phone (Inbound)' },
    { value: 'voicemail_left', label: 'Voicemail Left' },
    { value: 'email', label: 'Email' },
    { value: 'text_message', label: 'Text Message' },
    { value: 'missed_outreach', label: 'Missed-Appointment Outreach' },
    { value: 'in_person_brief', label: 'In-Person (Brief)' },
    { value: 'collateral', label: 'Collateral Contact' },
    { value: 'other', label: 'Other' },
]
