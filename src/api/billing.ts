import apiClient from './client'
import type {
    Invoice,
    Payment,
    Claim,
    CreateInvoicePayload,
    BatchInvoicePayload,
    RecordPaymentPayload,
    SubmitClaimPayload,
    PostClaimPaymentPayload,
    WriteOffPayload,
    InvoiceFilters,
    ClaimFilters,
    PaginatedResponse,
} from '../types'

export const billingApi = {
    // ─── Invoices ─────────────────────────────────────────────────────────
    getInvoices: async (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => {
        const { data } = await apiClient.get<PaginatedResponse<Invoice>>('/invoices/', { params: filters })
        return data
    },

    getInvoice: async (id: string): Promise<Invoice> => {
        const { data } = await apiClient.get<Invoice>(`/invoices/${id}/`)
        return data
    },

    createInvoice: async (payload: CreateInvoicePayload): Promise<Invoice> => {
        const { data } = await apiClient.post<Invoice>('/invoices/', payload)
        return data
    },

    batchGenerate: async (payload: BatchInvoicePayload): Promise<{ created: number; invoices: Invoice[] }> => {
        const { data } = await apiClient.post('/invoices/batch/', payload)
        return data
    },

    emailInvoice: async (id: string, toEmail: string): Promise<{ status: string; to_email: string }> => {
        const { data } = await apiClient.post(`/invoices/${id}/email/`, { to_email: toEmail })
        return data
    },

    downloadPDF: async (id: string, invoiceNumber?: string): Promise<void> => {
        const { data } = await apiClient.get(`/invoices/${id}/download-pdf/`, {
            responseType: 'blob',
        })
        const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice_${invoiceNumber || id}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    },

    // ─── Payments ─────────────────────────────────────────────────────────
    getPayments: async (filters?: { invoice_id?: string; client_id?: string; page?: number }): Promise<PaginatedResponse<Payment>> => {
        const { data } = await apiClient.get<PaginatedResponse<Payment>>('/payments/', { params: filters })
        return data
    },

    recordPayment: async (payload: RecordPaymentPayload): Promise<Payment> => {
        const { data } = await apiClient.post<Payment>('/payments/', payload)
        return data
    },


    // ─── Claims ───────────────────────────────────────────────────────────
    getClaims: async (filters?: ClaimFilters): Promise<PaginatedResponse<Claim>> => {
        const { data } = await apiClient.get<PaginatedResponse<Claim>>('/claims/', { params: filters })
        return data
    },

    submitClaim: async (payload: SubmitClaimPayload): Promise<Claim> => {
        const { data } = await apiClient.post<Claim>('/claims/', payload)
        return data
    },

    markClaimSubmitted: async (id: string): Promise<Claim> => {
        const { data } = await apiClient.post<Claim>(`/claims/${id}/submit/`)
        return data
    },

    resubmitClaim: async (id: string, notes?: string): Promise<Claim> => {
        const body = notes ? { resubmission_notes: notes } : {}
        const { data } = await apiClient.post<Claim>(`/claims/${id}/submit/`, body)
        return data
    },

    // ─── Client-scoped Claims ─────────────────────────────────────────────
    getClientClaims: async (clientId: string): Promise<Claim[]> => {
        const { data } = await apiClient.get<Claim[]>(`/clients/${clientId}/claims/`)
        return data
    },

    postClaimPayment: async (claimId: string, payload: PostClaimPaymentPayload): Promise<Claim> => {
        const { data } = await apiClient.post<Claim>(`/claims/${claimId}/post-payment/`, payload)
        return data
    },

    writeOffClaim: async (claimId: string, payload: WriteOffPayload): Promise<Claim> => {
        const { data } = await apiClient.post<Claim>(`/claims/${claimId}/write-off/`, payload)
        return data
    },

    // BUILD 6.1: CPT code suggestions
    getCPTSuggestions: async (params: {
        specialty?: string
        duration?: number
        service_type?: string
        is_initial?: boolean
    }): Promise<CPTSuggestion[]> => {
        const { data } = await apiClient.get<CPTSuggestion[]>('/cpt-suggestions/', { params })
        return data
    },

    // BUILD 6.2: Modifier suggestions
    getModifierSuggestions: async (params: {
        code: string
        is_telehealth?: boolean
        telehealth_type?: 'default' | 'audio_only' | 'store_forward' | 'cms'
        provider_type?: string
        is_assistant?: boolean
    }): Promise<{ modifiers: string[] }> => {
        const { data } = await apiClient.get<{ modifiers: string[] }>('/modifier-suggestions/', { params })
        return data
    },
}

export interface CPTSuggestion {
    code: string
    description: string
    specialty: string[]
    duration_min: number
    duration_max: number
    type: string
    typical_units: number
    modifiers: string[]
    initial_only?: boolean
}
