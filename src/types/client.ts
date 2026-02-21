export interface Client {
    id: string
    organization_id: string
    first_name: string
    last_name: string
    date_of_birth: string
    age?: number
    gender?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    phone?: string
    email?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    insurance_primary_name?: string
    insurance_primary_id?: string
    insurance_primary_group?: string
    insurance_secondary_name?: string
    insurance_secondary_id?: string
    insurance_secondary_group?: string
    diagnosis_codes: string[]
    is_active: boolean
    next_appointment?: string
    sessions_this_month?: number
    created_at: string
    updated_at: string
}

export interface ClientDetail extends Client {
    authorizations: Authorization[]
    recent_sessions: RecentSession[]
    documents: ClientDocument[]
    treatment_plan?: TreatmentPlanSummary
}

export interface Authorization {
    id: string
    client_id: string
    insurance_name: string
    authorization_number?: string
    service_code?: string
    units_approved: number
    units_used: number
    start_date: string
    end_date: string
    created_by?: string
    created_at: string
    updated_at: string
}

export interface RecentSession {
    id: string
    date: string
    provider_name: string
    service_code: string
    status: string
}

export interface ClientDocument {
    id: string
    file_name: string
    file_type: string
    file_size: number
    file_path: string
    document_type?: string
    is_signed: boolean
    created_at: string
}

export interface TreatmentPlanSummary {
    id: string
    goals: Record<string, unknown>[]
    start_date: string
    review_date?: string
}

export interface CreateClientPayload {
    first_name: string
    last_name: string
    date_of_birth: string
    gender?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    insurance_primary_name?: string
    insurance_primary_id?: string
    insurance_primary_group?: string
    insurance_secondary_name?: string
    insurance_secondary_id?: string
    insurance_secondary_group?: string
    diagnosis_codes?: string[]
}

export type UpdateClientPayload = Partial<CreateClientPayload> & {
    is_active?: boolean
}

export interface CreateAuthorizationPayload {
    client_id: string
    insurance_name: string
    authorization_number?: string
    service_code?: string
    units_approved: number
    start_date: string
    end_date: string
}
