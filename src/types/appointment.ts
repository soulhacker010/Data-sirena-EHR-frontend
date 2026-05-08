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

/** E31 Half A: appointments may now be staff meetings, personal blocks, etc.
 *  When event_type !== 'client_session' the client field is null and `title`
 *  carries the display name instead. */
export type AppointmentEventType =
    | 'client_session'
    | 'staff_meeting'
    | 'personal_block'
    | 'training'
    | 'other'

export interface Appointment {
    id: string
    organization_id: string
    /** Null when this is a non-session calendar block. */
    client: AppointmentClient | null
    provider: AppointmentProvider
    location?: AppointmentLocation
    authorization?: AppointmentAuthorization
    start_time: string
    end_time: string
    service_code?: string
    modifiers?: string
    place_of_service?: string
    units?: number
    status: AppointmentStatus
    notes?: string
    is_recurring: boolean
    recurrence_pattern?: RecurrencePattern
    series_id?: string
    /** E31 Half A */
    event_type: AppointmentEventType
    /** Title used to render non-session events (ignored for client sessions). */
    title?: string
    created_at: string
    updated_at: string
}

export interface CreateAppointmentPayload {
    /** Required iff event_type is 'client_session' (the default). */
    client_id?: string
    provider_id: string
    location_id?: string
    authorization_id?: string
    start_time: string
    end_time: string
    service_code?: string
    modifiers?: string
    place_of_service?: string
    units?: number
    notes?: string
    is_recurring?: boolean
    recurrence_pattern?: RecurrencePattern
    event_type?: AppointmentEventType
    /** Required for non-session events. */
    title?: string
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
    service_code?: string
    location_id?: string
}
