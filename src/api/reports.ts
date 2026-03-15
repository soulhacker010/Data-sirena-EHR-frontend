import apiClient from './client'

export interface SessionSummaryReport {
    total_sessions: number
    total_hours: number
    total_units: number
    unique_clients: number
    provider_breakdown: Array<{
        provider_name: string
        sessions: number
        hours: number
        units: number
    }>
    service_breakdown: Array<{
        service_code: string
        description: string
        sessions: number
        units: number
    }>
}

export interface AuthorizationReport {
    authorizations: Array<{
        id: string
        client_name: string
        insurance_name: string
        authorization_number: string
        service_code: string
        units_approved: number
        units_used: number
        units_remaining: number
        start_date: string
        end_date: string
        utilization_percent: number
        is_expired: boolean
    }>
}

export interface BillingSummaryReport {
    total_billed: number
    total_collected: number
    total_outstanding: number
    collections_rate: number
    payer_breakdown: Array<{
        payer_name: string
        billed: number
        collected: number
        outstanding: number
    }>
}

export interface MissingNotesReport {
    missing_notes: Array<{
        id: string
        client_id: string
        client_name: string
        provider_name: string
        session_date: string
        service_code: string
        days_overdue: number
    }>
}

export const reportsApi = {
    getSessionSummary: async (params?: {
        start_date?: string
        end_date?: string
        provider_id?: string
    }): Promise<SessionSummaryReport> => {
        const { data } = await apiClient.get<SessionSummaryReport>('/reports/session-summary/', { params })
        return data
    },

    getAuthorizationReport: async (params?: {
        status?: string
        payer?: string
    }): Promise<AuthorizationReport> => {
        const { data } = await apiClient.get<AuthorizationReport>('/reports/authorizations/', { params })
        return data
    },

    getBillingSummary: async (params?: {
        start_date?: string
        end_date?: string
    }): Promise<BillingSummaryReport> => {
        const { data } = await apiClient.get<BillingSummaryReport>('/reports/billing-summary/', { params })
        return data
    },

    getMissingNotes: async (params?: {
        provider_id?: string
    }): Promise<MissingNotesReport> => {
        const { data } = await apiClient.get<MissingNotesReport>('/reports/missing-notes/', { params })
        return data
    },

    getAnalytics: async (params?: {
        start_date?: string
        end_date?: string
    }): Promise<AnalyticsReport> => {
        const { data } = await apiClient.get<AnalyticsReport>('/reports/analytics/', { params })
        return data
    },
}

// ── Analytics Report (client-requested KPIs) ────────────────────────────

export interface AnalyticsReport {
    avg_length_of_care_days: number
    dropout_patterns: {
        no_visit_30_days: number
        no_visit_60_days: number
        no_visit_90_days: number
        total_active_clients: number
    }
    referral_source_roi: Array<{
        source: string
        clients: number
        revenue: number
    }>
    revenue_per_clinical_hour: number
    revenue_per_location: Array<{
        location_name: string
        is_telehealth: boolean
        revenue: number
        sessions: number
    }>
    aba_utilization: {
        total_approved: number
        total_used: number
        utilization_percent: number
        by_client: Array<{
            client_name: string
            authorization_number: string
            approved: number
            used: number
            percent: number
        }>
    }
    payment_summary: {
        current_month: number
        previous_month: number
        year_to_date: number
        monthly_trend: Array<{
            month: string
            total: number
        }>
    }
    active_patients: number
}
