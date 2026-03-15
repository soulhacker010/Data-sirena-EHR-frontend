export type NoteStatus = 'draft' | 'completed' | 'signed' | 'co_signed'

export interface NoteTemplate {
    id: string
    organization_id: string
    name: string
    template_type?: string
    fields: Record<string, unknown>
    required_fields: string[]
    created_by?: string
    created_at: string
}

export interface SessionNote {
    id: string
    appointment_id?: string
    client_id: string
    client_name?: string
    provider_id: string
    provider_name?: string
    template_id?: string
    template_name?: string
    note_data: Record<string, unknown>
    status: NoteStatus
    signature_data?: string
    signed_at?: string
    supervisor_signature?: string
    co_signed_at?: string
    co_signed_by?: string
    co_signer_name?: string
    co_sign_requested_to_id?: string
    co_sign_requested_to_name?: string
    co_sign_requested_at?: string
    co_sign_request_message?: string
    is_pending_co_sign?: boolean
    is_locked: boolean
    version: number
    service_code?: string
    session_date?: string
    created_at: string
    updated_at: string
}

export interface TreatmentPlan {
    id: string
    client_id: string
    provider_id: string
    goals: TreatmentGoal[]
    start_date: string
    review_date?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TreatmentGoal {
    id: string
    description: string
    target_date?: string
    status: 'active' | 'met' | 'discontinued'
    objectives: TreatmentObjective[]
}

export interface TreatmentObjective {
    id: string
    description: string
    baseline?: string
    target?: string
    current_progress?: string
}

export interface CreateNotePayload {
    appointment_id?: string
    client_id: string
    template_id?: string
    note_data: Record<string, unknown>
    service_code?: string
    session_date?: string
}

export interface UpdateNotePayload {
    note_data?: Record<string, unknown>
    status?: NoteStatus
    service_code?: string
    session_date?: string
}

export interface SignNotePayload {
    signature_data: string
}

export interface CoSignRequestPayload {
    supervisor_id: string
    message?: string
}

export interface CoSignNotePayload {
    supervisor_signature: string
}

export interface NoteFilters {
    provider_id?: string
    client_id?: string
    status?: NoteStatus
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
}
