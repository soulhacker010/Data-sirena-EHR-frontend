// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

// ─── API Errors ──────────────────────────────────────────────────────────────
export interface ApiError {
    detail?: string
    message?: string
    errors?: Record<string, string[]>
    status?: number
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
    total_clients: number
    sessions_this_month: number
    pending_notes: number
    revenue_mtd: number
    upcoming_appointments: DashboardAppointment[]
    recent_activity: ActivityItem[]
    billing_overview: BillingOverview
}

export interface DashboardAppointment {
    id: string
    client_name: string
    provider_name: string
    start_time: string
    end_time: string
    service_code: string
    status: string
}

export interface ActivityItem {
    type: string
    description: string
    user: string
    timestamp: string
}

export interface BillingOverview {
    invoices_pending: number
    claims_submitted: number
    claims_denied: number
    collections_rate: number
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType = 'auth_expiring' | 'missing_note' | 'appointment_reminder' | 'claim_denied' | 'general'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
    id: string
    user_id: string
    organization_id: string
    title: string
    message: string
    type: NotificationType
    priority: NotificationPriority
    is_read: boolean
    action_url?: string
    created_at: string
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLog {
    id: string
    organization_id: string
    user_id: string
    user_name?: string
    action: string
    table_name?: string
    record_id?: string
    ip_address?: string
    user_agent?: string
    changes?: Record<string, unknown>
    timestamp: string
}

export interface AuditLogFilters {
    user_id?: string
    action?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface OrganizationSettings {
    id: string
    name: string
    tax_id?: string
    contact_email?: string
    contact_phone?: string
    address?: string
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface ReportFilters {
    start_date?: string
    end_date?: string
    provider_id?: string
    client_id?: string
    service_code?: string
}

// ─── Locations & NPIs ────────────────────────────────────────────────────────
export interface Location {
    id: string
    organization_id: string
    name: string
    address: string
    city?: string
    state?: string
    zip_code?: string
    is_telehealth: boolean
    is_active: boolean
}

export interface NPI {
    id: string
    organization_id: string
    npi_number: string
    business_name: string
    is_active: boolean
}
