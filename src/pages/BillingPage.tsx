import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { Modal, ActionMenu, EmptyState, PageSkeleton } from '../components/ui'
import { billingApi, clientsApi } from '../api'
import type { Invoice, Claim, Payment, Client } from '../types'
import StripePaymentForm from '../components/billing/StripePaymentForm'
import { BILLING_SERVICE_CATALOG, getBillingServiceDescription } from '../utils/billingServiceCatalog'

import {
    MagnifyingGlass,
    Plus,
    FunnelSimple,
    CaretDown,
    CurrencyDollar,
    FileText,
    Receipt,
    CreditCard,
    CheckCircle,
    Clock,
    XCircle,
    Warning,
    Eye,
    DownloadSimple,
    ArrowClockwise,
    CalendarBlank,
    ChartBar,
    Stack
} from '@phosphor-icons/react'

// Helpers
const formatCurrency = (amount: number | string | null | undefined) => `$${(Number(amount) || 0).toFixed(2)}`
const formatDate = (date: string | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const paymentMethodLabels: Record<string, string> = {
    credit_card: 'Credit Card',
    eft: 'EFT Transfer',
    check: 'Check',
    cash: 'Cash',
    other: 'Other'
}

const getClaimStatusLabel = (status: Claim['status']) => {
    switch (status) {
        case 'created':
            return 'Created (Internal)'
        case 'submitted':
            return 'Submitted'
        case 'resubmitted':
            return 'Resubmitted'
        case 'accepted':
            return 'Accepted'
        case 'paid':
            return 'Paid'
        case 'denied':
            return 'Denied'
        default:
            return status
    }
}

type BillingTab = 'invoices' | 'claims' | 'payments' | 'aging'

const cleanParams = (params: Record<string, string | number | undefined>) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as Record<string, string | number>

const createDefaultInvoiceItem = () => ({
    service_code: '97153',
    description: getBillingServiceDescription('97153'),
    units: 1,
    rate: 0,
    amount: 0,
})

export default function BillingPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [isLoading, setIsLoading] = useState(true)
    const getTabFromParams = (tab: string | null): BillingTab => (
        tab === 'claims' || tab === 'payments' || tab === 'aging' ? tab : 'invoices'
    )
    const [activeTab, setActiveTab] = useState<BillingTab>(getTabFromParams(searchParams.get('tab')))

    // Data state
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [invoiceCount, setInvoiceCount] = useState(0)
    const [claims, setClaims] = useState<Claim[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [clientsList, setClientsList] = useState<Client[]>([])

    // Invoice filters
    const [invoiceSearch, setInvoiceSearch] = useState('')
    const [invoiceStatus, setInvoiceStatus] = useState('all')
    const [invoiceClient, setInvoiceClient] = useState('')
    const [invoiceDateFrom, setInvoiceDateFrom] = useState('')
    const [invoiceDateTo, setInvoiceDateTo] = useState('')

    // Claims filters
    const [claimSearch, setClaimSearch] = useState('')
    const [claimStatus, setClaimStatus] = useState('all')
    const [claimDateFrom, setClaimDateFrom] = useState('')
    const [claimDateTo, setClaimDateTo] = useState('')

    // Payments filter
    const [paymentSearch, setPaymentSearch] = useState('')

    // Modal states
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
    const [isCreateClaimModalOpen, setIsCreateClaimModalOpen] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isBatchInvoiceModalOpen, setIsBatchInvoiceModalOpen] = useState(false)
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
    const [batchDateFrom, setBatchDateFrom] = useState('')
    const [batchDateTo, setBatchDateTo] = useState('')
    const [batchClients, setBatchClients] = useState<'all' | 'selected'>('all')
    const [batchClientIds, setBatchClientIds] = useState<string[]>([])
    const [batchClientSearch, setBatchClientSearch] = useState('')
    const [batchGenerating, setBatchGenerating] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)

    // Create invoice form
    const [createInvoiceForm, setCreateInvoiceForm] = useState({
        clientId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [createDefaultInvoiceItem()] as Array<{ service_code: string; description: string; units: number; rate: number; amount: number }>
    })

    // Payment form
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        paymentMethod: 'credit_card',
        reference: ''
    })
    const [claimFormData, setClaimFormData] = useState({
        invoiceId: '',
        payerName: '',
        payerId: ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
    const [isStripeLoading, setIsStripeLoading] = useState(false)

    // Fetch invoices
    const fetchInvoices = useCallback(async () => {
        try {
            const params = cleanParams({
                status: invoiceStatus !== 'all' ? invoiceStatus : undefined,
                client_id: invoiceClient || undefined,
                start_date: invoiceDateFrom || undefined,
                end_date: invoiceDateTo || undefined,
            })
            const response = await billingApi.getInvoices(params)
            setInvoices(response.results)
            setInvoiceCount(response.count)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load invoices')
        }
    }, [invoiceStatus, invoiceClient, invoiceDateFrom, invoiceDateTo])

    // Fetch claims
    const fetchClaims = useCallback(async () => {
        try {
            const params = cleanParams({
                status: claimStatus !== 'all' ? claimStatus : undefined,
                start_date: claimDateFrom || undefined,
                end_date: claimDateTo || undefined,
            })
            const response = await billingApi.getClaims(params)
            setClaims(response.results)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load claims')
        }
    }, [claimStatus, claimDateFrom, claimDateTo])

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const [invoicesRes, claimsRes, clientsRes, paymentsRes] = await Promise.all([
                    billingApi.getInvoices({}),
                    billingApi.getClaims({}),
                    clientsApi.getAll({ page_size: 500 }),
                    billingApi.getPayments({}),
                ])
                setInvoices(invoicesRes.results)
                setInvoiceCount(invoicesRes.count)
                setClaims(claimsRes.results)
                setClientsList(clientsRes.results)
                setPayments(paymentsRes.results)
            } catch (err: any) {
                toast.error('Failed to load billing data')
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    // Re-fetch invoices when filters change
    useEffect(() => {
        if (!isLoading) fetchInvoices()
    }, [fetchInvoices, isLoading])

    // Re-fetch claims when filters change
    useEffect(() => {
        if (!isLoading) fetchClaims()
    }, [fetchClaims, isLoading])

    useEffect(() => {
        const nextTab = getTabFromParams(searchParams.get('tab'))
        if (nextTab !== activeTab) {
            setActiveTab(nextTab)
        }
    }, [activeTab, searchParams])

    const handleTabChange = (tab: BillingTab) => {
        setActiveTab(tab)
        const nextParams = new URLSearchParams(searchParams)
        if (tab === 'invoices') {
            nextParams.delete('tab')
        } else {
            nextParams.set('tab', tab)
        }
        setSearchParams(nextParams, { replace: true })
    }

    // Computed totals
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const totalOutstanding = invoices
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + parseFloat(String(i.balance || 0)), 0)
    // PAID MTD: sum payments from the current month
    const totalPaid = payments
        .filter(p => {
            const d = new Date(p.payment_date)
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0)
    const pendingClaims = claims.filter(c => c.status === 'created' || c.status === 'submitted').length
    const claimedInvoiceIds = new Set(claims.map(claim => claim.invoice_id))
    const claimableInvoices = invoices.filter(invoice => !claimedInvoiceIds.has(invoice.id) && invoice.status !== 'cancelled')
    const filteredBatchClients = clientsList.filter(client => {
        const query = batchClientSearch.trim().toLowerCase()
        if (!query) return true
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase()
        return fullName.includes(query) || (client.email || '').toLowerCase().includes(query)
    })

    // Filter invoices by search locally
    const filteredInvoices = invoices.filter(inv => {
        if (!invoiceSearch) return true
        const q = invoiceSearch.toLowerCase()
        return (inv.client_name || '').toLowerCase().includes(q) ||
            inv.invoice_number.toLowerCase().includes(q)
    })

    // Filter claims by search locally
    const filteredClaims = claims.filter(claim => {
        if (!claimSearch) return true
        const q = claimSearch.toLowerCase()
        return (claim.claim_number || '').toLowerCase().includes(q) ||
            claim.payer_name.toLowerCase().includes(q)
    })

    // Filter payments by search locally
    const filteredPayments = payments.filter(pmt => {
        if (!paymentSearch) return true
        const q = paymentSearch.toLowerCase()
        return (pmt.reference_number || '').toLowerCase().includes(q) ||
            pmt.invoice_id.toLowerCase().includes(q)
    })

    // Aging report data computed from invoices
    const agingData = {
        current: invoices.filter(i => {
            if (!i.due_date) return i.status !== 'paid'
            const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days <= 0
        }).reduce((sum, i) => sum + i.balance, 0),
        days1to30: invoices.filter(i => {
            if (!i.due_date) return false
            const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 0 && days <= 30
        }).reduce((sum, i) => sum + i.balance, 0),
        days31to60: invoices.filter(i => {
            if (!i.due_date) return false
            const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 30 && days <= 60
        }).reduce((sum, i) => sum + i.balance, 0),
        days61to90: invoices.filter(i => {
            if (!i.due_date) return false
            const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 60 && days <= 90
        }).reduce((sum, i) => sum + i.balance, 0),
        over90: invoices.filter(i => {
            if (!i.due_date) return false
            const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 90
        }).reduce((sum, i) => sum + i.balance, 0)
    }

    // Handlers
    const handleViewInvoice = async (invoice: Invoice) => {
        try {
            // Fetch full invoice detail with items
            const detail = await billingApi.getInvoice(invoice.id)
            setSelectedInvoice(detail)
            setIsInvoiceModalOpen(true)
            // Also fetch payments for this invoice
            if (detail.payments) {
                setPayments(detail.payments)
            }
        } catch {
            setSelectedInvoice(invoice)
            setIsInvoiceModalOpen(true)
        }
    }

    const handleRecordPayment = async () => {
        if (isSaving) return
        if (!selectedInvoice || !paymentFormData.amount) return
        const amount = parseFloat(paymentFormData.amount)
        setIsSaving(true)
        try {
            await billingApi.recordPayment({
                invoice_id: selectedInvoice.id,
                amount,
                payment_method: paymentFormData.paymentMethod as any,
                notes: paymentFormData.reference || undefined,
            })
            toast.success(`Payment of ${formatCurrency(amount)} recorded`)
            setIsPaymentModalOpen(false)
            setIsInvoiceModalOpen(false)
            setPaymentFormData({ amount: '', paymentMethod: 'credit_card', reference: '' })
            fetchInvoices()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to record payment')
        } finally {
            setIsSaving(false)
        }
    }

    const handleStripePayment = async () => {
        if (!selectedInvoice || !paymentFormData.amount) return
        const amount = parseFloat(paymentFormData.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount')
            return
        }
        setIsStripeLoading(true)
        try {
            const { client_secret } = await billingApi.createStripePayment({
                invoice_id: selectedInvoice.id,
                amount,
            })
            setStripeClientSecret(client_secret)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to initialize payment')
        } finally {
            setIsStripeLoading(false)
        }
    }

    const handleStripeSuccess = async () => {
        toast.success('Payment successful!')
        setStripeClientSecret(null)
        setIsPaymentModalOpen(false)
        setIsInvoiceModalOpen(false)
        setPaymentFormData({ amount: '', paymentMethod: 'credit_card', reference: '' })
        fetchInvoices()
        // Also refresh payments list so Payments tab + PAID MTD update
        try {
            const paymentsRes = await billingApi.getPayments({})
            setPayments(paymentsRes.results)
        } catch { /* silent */ }
    }

    const getClientName = (clientId: string) => {
        const client = clientsList.find(entry => entry.id === clientId)
        return client ? `${client.first_name} ${client.last_name}` : '—'
    }

    const getDefaultPayerName = (invoiceId: string) => {
        const invoice = invoices.find(entry => entry.id === invoiceId)
        if (!invoice) return ''
        const client = clientsList.find(entry => entry.id === invoice.client_id)
        return client?.insurance_primary_name || ''
    }

    const resetClaimForm = () => {
        setClaimFormData({ invoiceId: '', payerName: '', payerId: '' })
    }

    const openCreateClaimModal = (invoice?: Invoice) => {
        const initialInvoice = invoice ?? claimableInvoices[0]
        setClaimFormData({
            invoiceId: initialInvoice?.id || '',
            payerName: initialInvoice ? getDefaultPayerName(initialInvoice.id) : '',
            payerId: ''
        })
        setIsCreateClaimModalOpen(true)
    }

    const handleClaimInvoiceChange = (invoiceId: string) => {
        setClaimFormData(prev => {
            const previousDefaultPayer = prev.invoiceId ? getDefaultPayerName(prev.invoiceId) : ''
            const nextDefaultPayer = getDefaultPayerName(invoiceId)
            const nextPayerName = !prev.payerName || prev.payerName === previousDefaultPayer
                ? nextDefaultPayer
                : prev.payerName

            return {
                ...prev,
                invoiceId,
                payerName: nextPayerName,
            }
        })
    }

    const handleCreateClaim = async () => {
        if (isSaving) return
        if (!claimFormData.invoiceId) {
            toast.error('Select an invoice to create a claim')
            return
        }
        if (!claimFormData.payerName.trim()) {
            toast.error('Payer name is required')
            return
        }

        setIsSaving(true)
        try {
            await billingApi.submitClaim({
                invoice_id: claimFormData.invoiceId,
                payer_name: claimFormData.payerName.trim(),
                payer_id: claimFormData.payerId.trim() || undefined,
            })
            toast.success('Claim created successfully')
            setIsCreateClaimModalOpen(false)
            resetClaimForm()
            fetchClaims()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create claim')
        } finally {
            setIsSaving(false)
        }
    }

    const handleViewClaim = (claim: Claim) => {
        setSelectedClaim(claim)
        setIsClaimModalOpen(true)
    }

    const handleResubmitClaim = async (claim: Claim) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await billingApi.resubmitClaim(claim.id)
            toast.success('Claim resubmitted')
            setIsClaimModalOpen(false)
            fetchClaims()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to resubmit claim')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSubmitClaim = async (claim: Claim) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await billingApi.markClaimSubmitted(claim.id)
            toast.success('Claim marked as submitted')
            setIsClaimModalOpen(false)
            fetchClaims()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to submit claim')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDownloadPDF = async (invoice: Invoice) => {
        try {
            await billingApi.downloadPDF(invoice.id, invoice.invoice_number)
            toast.success('Invoice PDF downloaded')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to download PDF')
        }
    }

    const handleBatchGenerate = async () => {
        if (!batchDateFrom || !batchDateTo) return
        if (new Date(batchDateFrom) > new Date(batchDateTo)) {
            toast.error('From date must be on or before the to date')
            return
        }
        if (batchClients === 'selected' && batchClientIds.length === 0) {
            toast.error('Select at least one client for batch invoice generation')
            return
        }
        setBatchGenerating(true)
        try {
            await billingApi.batchGenerate({
                start_date: batchDateFrom,
                end_date: batchDateTo,
                client_ids: batchClients === 'selected' ? batchClientIds : undefined,
            })
            toast.success('Batch invoices generated')
            setIsBatchInvoiceModalOpen(false)
            setBatchDateFrom('')
            setBatchDateTo('')
            setBatchClients('all')
            setBatchClientIds([])
            setBatchClientSearch('')
            fetchInvoices()
        } catch (err: any) {
            const message = err?.response?.data?.message
                || (typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : '')
                || 'Failed to generate invoices'
            toast.error(message)
        } finally {
            setBatchGenerating(false)
        }
    }

    const toggleBatchClient = (clientId: string) => {
        setBatchClientIds(prev => (
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        ))
    }

    // Invoice actions
    const getInvoiceActions = (invoice: Invoice) => {
        const actions: { label: string; icon: React.ReactElement; onClick: () => void }[] = [
            { label: 'View Invoice', icon: <Eye size={16} />, onClick: () => { handleViewInvoice(invoice) } }
        ]
        if (!claimedInvoiceIds.has(invoice.id) && invoice.status !== 'cancelled') {
            actions.push({ label: 'Create Claim', icon: <FileText size={16} />, onClick: () => { openCreateClaimModal(invoice) } })
        }
        if (invoice.status !== 'paid') {
            actions.push({ label: 'Record Payment', icon: <CreditCard size={16} />, onClick: () => { setSelectedInvoice(invoice); setIsPaymentModalOpen(true) } })
        }
        actions.push({ label: 'Download PDF', icon: <DownloadSimple size={16} />, onClick: () => { handleDownloadPDF(invoice) } })
        return actions
    }

    // Claim actions
    const getClaimActions = (claim: Claim) => {
        const actions = [
            { label: 'View Claim', icon: <Eye size={16} />, onClick: () => handleViewClaim(claim) }
        ]
        if (claim.status === 'created') {
            actions.push({ label: 'Submit Claim', icon: <CheckCircle size={16} />, onClick: () => handleSubmitClaim(claim) })
        }
        if (claim.status === 'denied') {
            actions.push({ label: 'Resubmit Claim', icon: <ArrowClockwise size={16} />, onClick: () => handleResubmitClaim(claim) })
        }
        return actions
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Billing</h1>
                    <p className="page-subtitle">Manage invoices, claims, and payments</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={() => setIsBatchInvoiceModalOpen(true)}>
                        <Stack size={18} weight="bold" />
                        Generate Invoices
                    </button>
                    <button className="btn-primary" onClick={() => {
                        setCreateInvoiceForm({
                            clientId: '',
                            invoiceDate: new Date().toISOString().split('T')[0],
                            dueDate: '',
                            items: [createDefaultInvoiceItem()]
                        })
                        setIsCreateInvoiceOpen(true)
                    }}>
                        <Plus size={18} weight="bold" />
                        New Invoice
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="billing-summary">
                <div className="summary-card">
                    <div className="summary-icon outstanding">
                        <CurrencyDollar size={24} weight="duotone" />
                    </div>
                    <div className="summary-content">
                        <p className="summary-label">Outstanding</p>
                        <p className="summary-value">{formatCurrency(totalOutstanding)}</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon paid">
                        <CheckCircle size={24} weight="duotone" />
                    </div>
                    <div className="summary-content">
                        <p className="summary-label">Paid (MTD)</p>
                        <p className="summary-value">{formatCurrency(totalPaid)}</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon pending">
                        <Clock size={24} weight="duotone" />
                    </div>
                    <div className="summary-content">
                        <p className="summary-label">Pending Claims</p>
                        <p className="summary-value">{pendingClaims}</p>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon invoices">
                        <FileText size={24} weight="duotone" />
                    </div>
                    <div className="summary-content">
                        <p className="summary-label">Total Invoices</p>
                        <p className="summary-value">{invoiceCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="billing-tabs">
                <button
                    className={`billing-tab ${activeTab === 'invoices' ? 'active' : ''}`}
                    onClick={() => handleTabChange('invoices')}
                >
                    <Receipt size={18} weight="duotone" />
                    Invoices
                </button>
                <button
                    className={`billing-tab ${activeTab === 'claims' ? 'active' : ''}`}
                    onClick={() => handleTabChange('claims')}
                >
                    <FileText size={18} weight="duotone" />
                    Claims
                </button>
                <button
                    className={`billing-tab ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => handleTabChange('payments')}
                >
                    <CreditCard size={18} weight="duotone" />
                    Payments
                </button>
                <button
                    className={`billing-tab ${activeTab === 'aging' ? 'active' : ''}`}
                    onClick={() => handleTabChange('aging')}
                >
                    <ChartBar size={18} weight="duotone" />
                    Aging Reports
                </button>
            </div>

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <>
                    <div className="filters-bar">
                        <div className="search-input">
                            <MagnifyingGlass size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                value={invoiceSearch}
                                onChange={(e) => setInvoiceSearch(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <FunnelSimple size={18} />
                            <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className="filter-select">
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                                <option value="overdue">Overdue</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group">
                            <select value={invoiceClient} onChange={(e) => setInvoiceClient(e.target.value)} className="filter-select">
                                <option value="">All Clients</option>
                                {clientsList.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group date-range">
                            <CalendarBlank size={18} weight="regular" />
                            <input
                                type="date"
                                value={invoiceDateFrom}
                                onChange={(e) => setInvoiceDateFrom(e.target.value)}
                                className="date-input"
                            />
                            <span className="date-separator">to</span>
                            <input
                                type="date"
                                value={invoiceDateTo}
                                onChange={(e) => setInvoiceDateTo(e.target.value)}
                                className="date-input"
                            />
                        </div>
                    </div>

                    <div className="card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '12%' }}>Invoice #</th>
                                    <th style={{ width: '18%' }}>Client</th>
                                    <th>Date</th>
                                    <th>Due Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'right' }}>Paid</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ width: '5%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(invoice => (
                                    <tr key={invoice.id} onClick={() => handleViewInvoice(invoice)} className="clickable-row">
                                        <td><span className="invoice-number">{invoice.invoice_number}</span></td>
                                        <td>{invoice.client_name || '—'}</td>
                                        <td>{formatDate(invoice.invoice_date)}</td>
                                        <td>{formatDate(invoice.due_date)}</td>
                                        <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(invoice.total_amount)}</span></td>
                                        <td style={{ textAlign: 'right' }}><span className="amount-paid">{formatCurrency(invoice.paid_amount)}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge badge-invoice-${invoice.status}`}>
                                                {invoice.status === 'paid' && <CheckCircle size={12} weight="bold" />}
                                                {invoice.status === 'overdue' && <Warning size={12} weight="bold" />}
                                                {invoice.status === 'partial' && <Clock size={12} weight="bold" />}
                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <ActionMenu items={getInvoiceActions(invoice)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredInvoices.length === 0 && (
                            <EmptyState
                                variant="no-results"
                                title="No invoices found"
                                description="Try adjusting your filters to see more results."
                            />
                        )}
                    </div>
                </>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && (
                <>
                    <div className="filters-bar">
                        <div className="search-input">
                            <MagnifyingGlass size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search claims..."
                                value={claimSearch}
                                onChange={(e) => setClaimSearch(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <FunnelSimple size={18} />
                            <select value={claimStatus} onChange={(e) => setClaimStatus(e.target.value)} className="filter-select">
                                <option value="all">All Status</option>
                                <option value="created">Created</option>
                                <option value="submitted">Submitted</option>
                                <option value="accepted">Accepted</option>
                                <option value="denied">Denied</option>
                                <option value="paid">Paid</option>
                                <option value="resubmitted">Resubmitted</option>
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group date-range">
                            <CalendarBlank size={18} weight="regular" />
                            <input
                                type="date"
                                value={claimDateFrom}
                                onChange={(e) => setClaimDateFrom(e.target.value)}
                                className="date-input"
                            />
                            <span className="date-separator">to</span>
                            <input
                                type="date"
                                value={claimDateTo}
                                onChange={(e) => setClaimDateTo(e.target.value)}
                                className="date-input"
                            />
                        </div>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => openCreateClaimModal()}
                            disabled={claimableInvoices.length === 0}
                        >
                            <Plus size={18} weight="bold" />
                            Create Claim
                        </button>
                    </div>

                    <div className="card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '12%' }}>Claim #</th>
                                    <th style={{ width: '16%' }}>Payer</th>
                                    <th>Service Date</th>
                                    <th>Submitted</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ width: '5%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClaims.map(claim => (
                                    <tr key={claim.id} onClick={() => handleViewClaim(claim)} className="clickable-row">
                                        <td><span className="claim-number">{claim.claim_number || '—'}</span></td>
                                        <td>{claim.payer_name}</td>
                                        <td>{formatDate(claim.session_date)}</td>
                                        <td>{formatDate(claim.submitted_at)}</td>
                                        <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(claim.billed_amount)}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge badge-claim-${claim.status}`}>
                                                {claim.status === 'paid' && <CheckCircle size={12} weight="bold" />}
                                                {claim.status === 'denied' && <XCircle size={12} weight="bold" />}
                                                {(claim.status === 'created' || claim.status === 'submitted') && <Clock size={12} weight="bold" />}
                                                {getClaimStatusLabel(claim.status)}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <ActionMenu items={getClaimActions(claim)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredClaims.length === 0 && (
                            <EmptyState
                                variant="no-results"
                                title="No claims found"
                                description="Try adjusting your filters to see more results."
                            />
                        )}
                        {claims.length === 0 && claimableInvoices.length > 0 && (
                            <div className="billing-empty-action">
                                <p>Create a claim from an invoice to start tracking payer submissions and insurance payments.</p>
                                <button type="button" className="btn-primary" onClick={() => openCreateClaimModal()}>
                                    <Plus size={18} weight="bold" />
                                    Create Your First Claim
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <>
                    <div className="filters-bar">
                        <div className="search-input">
                            <MagnifyingGlass size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search payments..."
                                value={paymentSearch}
                                onChange={(e) => setPaymentSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '12%' }}>Invoice</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'center' }}>Method</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(payment => (
                                    <tr key={payment.id}>
                                        <td><span className="invoice-number">{(payment as any).invoice_number || payment.invoice_id}</span></td>
                                        <td><span className="amount success">{formatCurrency(payment.amount)}</span></td>
                                        <td>{formatDate(payment.payment_date)}</td>
                                        <td>
                                            <span className={`payment-method ${payment.payment_method || ''}`}>
                                                {paymentMethodLabels[payment.payment_method || ''] || payment.payment_method || '—'}
                                            </span>
                                        </td>
                                        <td><span className="reference">{payment.reference_number || '—'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredPayments.length === 0 && (
                            <div className="empty-state">
                                <CreditCard size={48} weight="duotone" className="empty-state-icon" />
                                <h3>No payments found</h3>
                                <p>Try adjusting your search</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Aging Reports Tab */}
            {activeTab === 'aging' && (
                <>
                    <div className="aging-report">
                        <div className="aging-header">
                            <h3>Accounts Receivable Aging Summary</h3>
                            <p className="aging-subtitle">Outstanding balances by age</p>
                        </div>

                        <div className="aging-buckets">
                            <div className="aging-bucket current">
                                <div className="bucket-label">Current</div>
                                <div className="bucket-amount">{formatCurrency(agingData.current)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${totalOutstanding > 0 ? Math.min((agingData.current / totalOutstanding) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-30">
                                <div className="bucket-label">1-30 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days1to30)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${totalOutstanding > 0 ? Math.min((agingData.days1to30 / totalOutstanding) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-60">
                                <div className="bucket-label">31-60 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days31to60)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${totalOutstanding > 0 ? Math.min((agingData.days31to60 / totalOutstanding) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-90">
                                <div className="bucket-label">61-90 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days61to90)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${totalOutstanding > 0 ? Math.min((agingData.days61to90 / totalOutstanding) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket over-90">
                                <div className="bucket-label">Over 90 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.over90)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${totalOutstanding > 0 ? Math.min((agingData.over90 / totalOutstanding) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="aging-total">
                            <span>Total Outstanding</span>
                            <span className="aging-total-amount">{formatCurrency(totalOutstanding)}</span>
                        </div>

                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ padding: '1rem 1.5rem', margin: 0, borderBottom: '1px solid var(--border-color)' }}>Overdue Invoices</h4>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>Invoice #</th>
                                        <th style={{ width: '25%' }}>Client</th>
                                        <th>Due Date</th>
                                        <th style={{ textAlign: 'center' }}>Days Overdue</th>
                                        <th style={{ textAlign: 'right' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.filter(i => i.status === 'overdue' || (i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date())).map(inv => {
                                        const daysOverdue = inv.due_date ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
                                        return (
                                            <tr key={inv.id} onClick={() => handleViewInvoice(inv)} className="clickable-row">
                                                <td><span className="invoice-number">{inv.invoice_number}</span></td>
                                                <td>{inv.client_name || '—'}</td>
                                                <td>{formatDate(inv.due_date)}</td>
                                                <td style={{ textAlign: 'center' }}><span className={`days-overdue ${daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'warning' : ''}`}>{daysOverdue} days</span></td>
                                                <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(inv.balance)}</span></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Invoice Detail Modal */}
            <Modal
                isOpen={isInvoiceModalOpen}
                onClose={() => { setIsInvoiceModalOpen(false); setSelectedInvoice(null) }}
                title={`Invoice ${selectedInvoice?.invoice_number || ''}`}
                size="lg"
            >
                {selectedInvoice && (
                    <div className="invoice-detail">
                        <div className="invoice-header-info">
                            <div>
                                <p className="label">Client</p>
                                <p className="value">{selectedInvoice.client_name || '—'}</p>
                            </div>
                            <div>
                                <p className="label">Invoice Date</p>
                                <p className="value">{formatDate(selectedInvoice.invoice_date)}</p>
                            </div>
                            <div>
                                <p className="label">Due Date</p>
                                <p className="value">{formatDate(selectedInvoice.due_date)}</p>
                            </div>
                            <div>
                                <p className="label">Status</p>
                                <span className={`badge badge-invoice-${selectedInvoice.status}`}>
                                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                            <div className="invoice-items">
                                <h4>Line Items</h4>
                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '15%' }}>CPT Code</th>
                                            <th style={{ width: '35%' }}>Description</th>
                                            <th style={{ textAlign: 'center' }}>Units</th>
                                            <th style={{ textAlign: 'right' }}>Rate</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.service_code}</td>
                                                <td>{item.description || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>{item.units}</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="invoice-totals">
                            <div className="total-row">
                                <span>Total</span>
                                <span className="total-amount">{formatCurrency(selectedInvoice.total_amount)}</span>
                            </div>
                            <div className="total-row">
                                <span>Paid</span>
                                <span className="paid-amount">{formatCurrency(selectedInvoice.paid_amount)}</span>
                            </div>
                            <div className="total-row balance">
                                <span>Balance Due</span>
                                <span>{formatCurrency(selectedInvoice.balance)}</span>
                            </div>
                        </div>

                        <div className="invoice-actions">
                            {selectedInvoice.status !== 'paid' && (
                                <button className="btn-primary" onClick={() => { setIsPaymentModalOpen(true) }}>
                                    <CreditCard size={16} weight="bold" />
                                    Record Payment
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => handleDownloadPDF(selectedInvoice)}>
                                <DownloadSimple size={16} weight="bold" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Invoice Modal */}
            <Modal
                isOpen={isCreateInvoiceOpen}
                onClose={() => setIsCreateInvoiceOpen(false)}
                title="New Invoice"
                size="lg"
            >
                <form className="invoice-create-form" onSubmit={async (e) => {
                    e.preventDefault()
                    if (isSaving || !createInvoiceForm.clientId) return
                    // Validate: every line item must have a rate > 0
                    const invalidItems = createInvoiceForm.items.filter(item => !item.rate || item.rate <= 0)
                    if (invalidItems.length > 0) {
                        toast.error('All line items must have a rate greater than $0.00')
                        return
                    }
                    const totalAmount = createInvoiceForm.items.reduce((sum, item) => sum + (item.units * item.rate), 0)
                    if (totalAmount <= 0) {
                        toast.error('Invoice total must be greater than $0.00')
                        return
                    }
                    setIsSaving(true)
                    try {
                        await billingApi.createInvoice({
                            client_id: createInvoiceForm.clientId,
                            invoice_date: createInvoiceForm.invoiceDate,
                            due_date: createInvoiceForm.dueDate || undefined,
                            items: createInvoiceForm.items.map(item => ({
                                service_code: item.service_code,
                                description: item.description || undefined,
                                units: item.units,
                                rate: item.rate,
                                amount: item.units * item.rate,
                            })),
                        })
                        toast.success('Invoice created successfully')
                        setIsCreateInvoiceOpen(false)
                        fetchInvoices()
                    } catch (err: any) {
                        toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create invoice')
                    } finally {
                        setIsSaving(false)
                    }
                }}>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Client *</label>
                            <select
                                value={createInvoiceForm.clientId}
                                onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, clientId: e.target.value }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="">Select client</option>
                                {clientsList.map(c => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Invoice Date *</label>
                            <input
                                type="date"
                                value={createInvoiceForm.invoiceDate}
                                onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                                className="form-input-basic"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Due Date</label>
                            <input
                                type="date"
                                value={createInvoiceForm.dueDate}
                                onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="form-input-basic"
                            />
                        </div>
                    </div>

                    <h4 style={{ margin: '1rem 0 0.5rem' }}>Line Items</h4>
                    <table className="data-table" style={{ marginBottom: '0.5rem' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '20%' }}>CPT Code</th>
                                <th style={{ width: '30%' }}>Description</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Units</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Rate ($)</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                                <th style={{ width: '8%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {createInvoiceForm.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <select
                                            value={item.service_code}
                                            onChange={(e) => {
                                                const items = [...createInvoiceForm.items]
                                                const serviceCode = e.target.value
                                                items[idx] = {
                                                    ...items[idx],
                                                    service_code: serviceCode,
                                                    description: getBillingServiceDescription(serviceCode),
                                                }
                                                setCreateInvoiceForm(prev => ({ ...prev, items }))
                                            }}
                                            className="form-input-basic"
                                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                                        >
                                            {BILLING_SERVICE_CATALOG.map(entry => (
                                                <option key={entry.code} value={entry.code}>{entry.code}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => {
                                                const items = [...createInvoiceForm.items]
                                                items[idx] = { ...items[idx], description: e.target.value }
                                                setCreateInvoiceForm(prev => ({ ...prev, items }))
                                            }}
                                            className="form-input-basic"
                                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                                            placeholder="Service description"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.units}
                                            onChange={(e) => {
                                                const items = [...createInvoiceForm.items]
                                                const units = parseInt(e.target.value) || 1
                                                items[idx] = { ...items[idx], units, amount: units * items[idx].rate }
                                                setCreateInvoiceForm(prev => ({ ...prev, items }))
                                            }}
                                            className="form-input-basic"
                                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem', textAlign: 'center' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={item.rate || ''}
                                            onChange={(e) => {
                                                const items = [...createInvoiceForm.items]
                                                const rate = parseFloat(e.target.value) || 0
                                                items[idx] = { ...items[idx], rate, amount: items[idx].units * rate }
                                                setCreateInvoiceForm(prev => ({ ...prev, items }))
                                            }}
                                            className="form-input-basic"
                                            style={{ padding: '0.375rem 0.5rem', fontSize: '0.85rem', textAlign: 'right', borderColor: item.rate <= 0 ? '#fca5a5' : '' }}
                                            placeholder="Required *"
                                            required
                                        />
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {formatCurrency(item.units * item.rate)}
                                    </td>
                                    <td>
                                        {createInvoiceForm.items.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn-ghost"
                                                onClick={() => {
                                                    const items = createInvoiceForm.items.filter((_, i) => i !== idx)
                                                    setCreateInvoiceForm(prev => ({ ...prev, items }))
                                                }}
                                                style={{ padding: '0.25rem', color: '#dc2626' }}
                                            >
                                                <XCircle size={16} weight="bold" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setCreateInvoiceForm(prev => ({
                            ...prev,
                            items: [...prev.items, createDefaultInvoiceItem()]
                        }))}
                        style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '1rem' }}
                    >
                        <Plus size={14} weight="bold" /> Add Line Item
                    </button>

                    <div className="invoice-totals" style={{ marginBottom: '1rem' }}>
                        <div className="total-row balance">
                            <span>Total</span>
                            <span>{formatCurrency(createInvoiceForm.items.reduce((sum, item) => sum + (item.units * item.rate), 0))}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setIsCreateInvoiceOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSaving || !createInvoiceForm.clientId}>
                            {isSaving ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Claim Detail Modal */}
            <Modal
                isOpen={isClaimModalOpen}
                onClose={() => { setIsClaimModalOpen(false); setSelectedClaim(null) }}
                title={`Claim ${selectedClaim?.claim_number || ''}`}
                size="lg"
            >
                {selectedClaim && (
                    <div className="claim-modal-content">
                        <div className="claim-modal-header">
                            <div className="claim-info-row">
                                <span className="claim-info-label">Claim #:</span>
                                <span className="claim-info-value">{selectedClaim.claim_number || '—'}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Payer:</span>
                                <span className="claim-info-value">{selectedClaim.payer_name}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Service Date:</span>
                                <span className="claim-info-value">{formatDate(selectedClaim.session_date)}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Submitted:</span>
                                <span className="claim-info-value">{formatDate(selectedClaim.submitted_at)}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Billed Amount:</span>
                                <span className="claim-info-value">{formatCurrency(selectedClaim.billed_amount)}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Insurance Paid:</span>
                                <span className="claim-info-value">{formatCurrency(selectedClaim.insurance_paid)}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Status:</span>
                                <span className={`status-badge status-${selectedClaim.status}`}>
                                    {getClaimStatusLabel(selectedClaim.status)}
                                </span>
                            </div>
                        </div>

                        {selectedClaim.status === 'created' && (
                            <div className="claim-status-note">
                                <strong>Internal claim only.</strong>
                                <span>This claim is saved in Sirena but has not been sent to a clearinghouse or payer yet.</span>
                            </div>
                        )}

                        {selectedClaim.status === 'denied' && selectedClaim.denial_reason && (
                            <div className="denial-reason-box">
                                <div className="denial-reason-header">
                                    <Warning size={20} weight="fill" />
                                    <strong>Denial Reason</strong>
                                </div>
                                <p className="denial-reason-text">{selectedClaim.denial_reason}</p>
                            </div>
                        )}

                        {selectedClaim.status === 'denied' && (
                            <div className="corrective-actions-section">
                                <h4>Corrective Actions</h4>
                                <div className="form-group">
                                    <label className="form-label">Notes / Changes Made</label>
                                    <textarea
                                        placeholder="Describe what was corrected before resubmission..."
                                        className="form-input-basic"
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Supporting Documentation</label>
                                    <div className="file-upload-zone">
                                        <DownloadSimple size={24} />
                                        <span>Drop files here or click to upload</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setIsClaimModalOpen(false)}
                            >
                                Close
                            </button>
                            {selectedClaim.status === 'created' && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleSubmitClaim(selectedClaim)}
                                    disabled={isSaving}
                                >
                                    <CheckCircle size={18} />
                                    Submit Claim
                                </button>
                            )}
                            {selectedClaim.status === 'denied' && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleResubmitClaim(selectedClaim)}
                                    disabled={isSaving}
                                >
                                    <ArrowClockwise size={18} />
                                    Resubmit Claim
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Record Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => { setIsPaymentModalOpen(false); setStripeClientSecret(null); setPaymentFormData({ amount: '', paymentMethod: 'credit_card', reference: '' }) }}
                title="Record Payment"
                size="sm"
            >
                {stripeClientSecret && selectedInvoice ? (
                    <StripePaymentForm
                        clientSecret={stripeClientSecret}
                        amount={parseFloat(paymentFormData.amount)}
                        invoiceNumber={selectedInvoice.invoice_number}
                        onSuccess={handleStripeSuccess}
                        onCancel={() => setStripeClientSecret(null)}
                    />
                ) : (
                <form className="payment-form" onSubmit={(e) => { e.preventDefault(); paymentFormData.paymentMethod === 'credit_card' ? handleStripePayment() : handleRecordPayment() }}>
                    {selectedInvoice && (
                        <div className="payment-invoice-info">
                            <p>Invoice: <strong>{selectedInvoice.invoice_number}</strong></p>
                            <p>Balance Due: <strong>{formatCurrency(selectedInvoice.balance)}</strong></p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Amount *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={paymentFormData.amount}
                            onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                            className="form-input-basic"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <select
                            value={paymentFormData.paymentMethod}
                            onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                            className="form-input-basic"
                        >
                            <option value="credit_card">Credit Card (Stripe)</option>
                            <option value="eft">EFT Transfer</option>
                            <option value="check">Check</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {paymentFormData.paymentMethod !== 'credit_card' && (
                    <div className="form-group">
                        <label className="form-label">Reference #</label>
                        <input
                            type="text"
                            value={paymentFormData.reference}
                            onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference: e.target.value }))}
                            className="form-input-basic"
                            placeholder="Check #, Transaction ID, etc."
                        />
                    </div>
                    )}

                    <div className="payment-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isStripeLoading || isSaving}>
                            {paymentFormData.paymentMethod === 'credit_card' ? (
                                isStripeLoading ? (
                                    <><span className="spinner-sm" /> Loading...</>
                                ) : (
                                    <><CreditCard size={16} weight="bold" /> Pay with Card</>
                                )
                            ) : (
                                <><CheckCircle size={16} weight="bold" /> Record Payment</>
                            )}
                        </button>
                    </div>
                </form>
                )}
            </Modal>

            <Modal
                isOpen={isCreateClaimModalOpen}
                onClose={() => {
                    setIsCreateClaimModalOpen(false)
                    resetClaimForm()
                }}
                title="Create Claim"
                size="sm"
            >
                <form
                    className="payment-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleCreateClaim()
                    }}
                >
                    <div className="form-group">
                        <label className="form-label">Invoice *</label>
                        <select
                            value={claimFormData.invoiceId}
                            onChange={(e) => handleClaimInvoiceChange(e.target.value)}
                            className="form-input-basic"
                            required
                        >
                            <option value="">Select invoice</option>
                            {claimableInvoices.map(invoice => (
                                <option key={invoice.id} value={invoice.id}>
                                    {invoice.invoice_number} · {getClientName(invoice.client_id)} · {formatCurrency(invoice.total_amount)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {claimFormData.invoiceId && (
                        <div className="payment-invoice-info">
                            <p>Client: <strong>{getClientName(invoices.find(invoice => invoice.id === claimFormData.invoiceId)?.client_id || '')}</strong></p>
                            <p>Invoice Amount: <strong>{formatCurrency(invoices.find(invoice => invoice.id === claimFormData.invoiceId)?.total_amount)}</strong></p>
                        </div>
                    )}

                    <div className="claim-status-note">
                        <strong>Creates an internal claim record.</strong>
                        <span>You can submit it afterward to mark it as sent. Clearinghouse delivery is not automated here yet.</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payer Name *</label>
                        <input
                            type="text"
                            value={claimFormData.payerName}
                            onChange={(e) => setClaimFormData(prev => ({ ...prev, payerName: e.target.value }))}
                            className="form-input-basic"
                            placeholder="Insurance payer name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payer ID</label>
                        <input
                            type="text"
                            value={claimFormData.payerId}
                            onChange={(e) => setClaimFormData(prev => ({ ...prev, payerId: e.target.value }))}
                            className="form-input-basic"
                            placeholder="Optional payer identifier"
                        />
                    </div>

                    <div className="payment-form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setIsCreateClaimModalOpen(false)
                                resetClaimForm()
                            }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving || claimableInvoices.length === 0}>
                            {isSaving ? (
                                <><span className="spinner-sm" /> Saving...</>
                            ) : (
                                <><FileText size={16} weight="bold" /> Create Claim</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Batch Invoice Generation Modal */}
            <Modal
                isOpen={isBatchInvoiceModalOpen}
                onClose={() => {
                    setIsBatchInvoiceModalOpen(false)
                    setBatchDateFrom('')
                    setBatchDateTo('')
                    setBatchClients('all')
                    setBatchClientIds([])
                    setBatchClientSearch('')
                }}
                title="Generate Batch Invoices"
                size="lg"
            >
                <div className="batch-invoice-content">
                    <div className="batch-modal-hero">
                        <p className="batch-description">
                            Create invoices from attended appointments in the selected date range. Batch invoicing uses each appointment&apos;s CPT code and units, then resolves the rate from your existing billing history. The batch is blocked if service codes, units, or rates are missing.
                        </p>
                        <div className="batch-preview-box">
                            <strong>Scope</strong>
                            <p>
                                {batchClients === 'all'
                                    ? 'All clients with attended appointments will be included.'
                                    : `${batchClientIds.length} selected client${batchClientIds.length === 1 ? '' : 's'} will be included.`}
                            </p>
                        </div>
                    </div>

                    <div className="form-row-2">
                        <div className="form-group">
                            <label className="form-label">From Date *</label>
                            <input
                                type="date"
                                value={batchDateFrom}
                                onChange={(e) => setBatchDateFrom(e.target.value)}
                                className="form-input-basic"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To Date *</label>
                            <input
                                type="date"
                                value={batchDateTo}
                                onChange={(e) => setBatchDateTo(e.target.value)}
                                className="form-input-basic"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Clients</label>
                        <div className="batch-scope-grid">
                            <label className={`radio-label batch-scope-card ${batchClients === 'all' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="batchClients"
                                    checked={batchClients === 'all'}
                                    onChange={() => setBatchClients('all')}
                                />
                                <span>
                                    <strong>All clients</strong>
                                    <small>Use every client with attended appointments in the selected date range.</small>
                                </span>
                            </label>
                            <label className={`radio-label batch-scope-card ${batchClients === 'selected' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="batchClients"
                                    checked={batchClients === 'selected'}
                                    onChange={() => setBatchClients('selected')}
                                />
                                <span>
                                    <strong>Selected clients only</strong>
                                    <small>Pick a smaller client set when you need a more controlled batch run.</small>
                                </span>
                            </label>
                        </div>
                    </div>

                    {batchClients === 'selected' && (
                        <div className="batch-client-picker">
                            <div className="search-input">
                                <MagnifyingGlass size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={batchClientSearch}
                                    onChange={(e) => setBatchClientSearch(e.target.value)}
                                />
                            </div>

                            <div className="batch-client-list">
                                {filteredBatchClients.map(client => {
                                    const checked = batchClientIds.includes(client.id)
                                    return (
                                        <label key={client.id} className={`batch-client-option ${checked ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleBatchClient(client.id)}
                                            />
                                            <span className="batch-client-copy">
                                                <strong>{client.first_name} {client.last_name}</strong>
                                                <small>{client.email || client.insurance_primary_name || 'No additional client info'}</small>
                                            </span>
                                        </label>
                                    )
                                })}
                                {filteredBatchClients.length === 0 && (
                                    <div className="batch-client-empty">No clients match your search.</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setIsBatchInvoiceModalOpen(false)
                                setBatchDateFrom('')
                                setBatchDateTo('')
                                setBatchClients('all')
                                setBatchClientIds([])
                                setBatchClientSearch('')
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={!batchDateFrom || !batchDateTo || batchGenerating}
                            onClick={handleBatchGenerate}
                        >
                            {batchGenerating ? (
                                <>Generating...</>
                            ) : (
                                <>
                                    <Stack size={18} />
                                    Generate Invoices
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}



