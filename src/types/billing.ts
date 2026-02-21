export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
export type ClaimStatus = 'created' | 'submitted' | 'accepted' | 'paid' | 'denied' | 'resubmitted'
export type PaymentMethod = 'credit_card' | 'check' | 'cash' | 'eft' | 'other'
export type PaymentType = 'payment' | 'write_off' | 'adjustment'
export type PayerType = 'insurance' | 'patient'

export interface Invoice {
    id: string
    organization_id: string
    client_id: string
    client_name?: string
    client_email?: string
    invoice_number: string
    invoice_date: string
    total_amount: number
    paid_amount: number
    balance: number
    status: InvoiceStatus
    due_date?: string
    items?: InvoiceItem[]
    payments?: Payment[]
    created_at: string
    updated_at: string
}

export interface InvoiceItem {
    id: string
    invoice_id: string
    appointment_id?: string
    service_code: string
    description?: string
    units: number
    rate: number
    amount: number
    session_date?: string
    provider_name?: string
    created_at: string
}

export interface Payment {
    id: string
    invoice_id: string
    claim_id?: string
    client_id: string
    amount: number
    payment_type: PaymentType
    payer_type?: PayerType
    payment_method?: PaymentMethod
    stripe_payment_id?: string
    payment_date: string
    reference_number?: string
    notes?: string
}

export interface Claim {
    id: string
    invoice_id: string
    client_id: string
    claim_number?: string
    payer_name: string
    payer_id?: string
    status: ClaimStatus
    billed_amount: number
    allowed_amount?: number
    insurance_paid: number
    patient_responsibility: number
    write_off_amount: number
    submitted_at?: string
    response_data?: Record<string, unknown>
    denial_reason?: string
    resubmission_count: number
    paid_at?: string
    service_code?: string
    session_date?: string
    created_at: string
    updated_at: string
}

export interface CreateInvoicePayload {
    client_id: string
    invoice_date: string
    due_date?: string
    items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]
}

export interface BatchInvoicePayload {
    start_date: string
    end_date: string
    client_ids?: string[]
}

export interface RecordPaymentPayload {
    invoice_id: string
    amount: number
    payment_method: PaymentMethod
    notes?: string
}

export interface StripePaymentPayload {
    invoice_id: string
    amount: number
}

export interface SubmitClaimPayload {
    invoice_id: string
    payer_name: string
    payer_id?: string
}

export interface InvoiceFilters {
    status?: InvoiceStatus
    client_id?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
}

export interface PostClaimPaymentPayload {
    insurance_paid: number
    patient_responsibility: number
    write_off_amount: number
    reference_number?: string
    notes?: string
}

export interface WriteOffPayload {
    amount: number
    reason: string
    notes?: string
}

export interface ClaimFilters {
    status?: ClaimStatus
    payer_name?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
}
