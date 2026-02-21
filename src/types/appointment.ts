export type AppointmentStatus = 'scheduled' | 'attended' | 'cancelled' | 'no_show'

export interface RecurrencePattern {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    end_date?: string
    occurrences?: number
}

export interface AppointmentProvider {
    id: string
    first_name: string
    last_name: string
}

export interface AppointmentClient {
    id: string
    first_name: string
    last_name: string
}

export interface AppointmentLocation {
    id: string
    name: string
}

export interface AppointmentAuthorization {
    id: string
    authorization_number?: string
    units_remaining: number
}

export interface Appointment {
    id: string
    organization_id: string
    client: AppointmentClient
    provider: AppointmentProvider
    location?: AppointmentLocation
    authorization?: AppointmentAuthorization
    start_time: string
    end_time: string
    service_code?: string
    units?: number
    status: AppointmentStatus
    notes?: string
    is_recurring: boolean
    recurrence_pattern?: RecurrencePattern
    created_at: string
    updated_at: string
}

export interface CreateAppointmentPayload {
    client_id: string
    provider_id: string
    location_id?: string
    authorization_id?: string
    start_time: string
    end_time: string
    service_code?: string
    units?: number
    notes?: string
    is_recurring?: boolean
    recurrence_pattern?: RecurrencePattern
}

export interface UpdateAppointmentPayload extends Partial<CreateAppointmentPayload> {
    status?: AppointmentStatus
}

export interface AppointmentFilters {
    start_date: string
    end_date: string
    provider_id?: string
    client_id?: string
    status?: AppointmentStatus
}
