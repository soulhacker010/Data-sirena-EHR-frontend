import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { Modal, ActionMenu, EmptyState, PageSkeleton } from '../components/ui'
import { billingApi, clientsApi } from '../api'
import type { Invoice, Claim, Payment, Client } from '../types'
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
    PaperPlaneTilt,
    ArrowClockwise,
    CalendarBlank,
    ChartBar,
    Stack
} from '@phosphor-icons/react'

// Helpers
const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
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

export default function BillingPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'invoices' | 'claims' | 'payments' | 'aging'>('invoices')

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
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isBatchInvoiceModalOpen, setIsBatchInvoiceModalOpen] = useState(false)
    const [batchDateFrom, setBatchDateFrom] = useState('')
    const [batchDateTo, setBatchDateTo] = useState('')
    const [batchClients, setBatchClients] = useState<'all' | 'selected'>('all')
    const [batchGenerating, setBatchGenerating] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)

    // Payment form
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        paymentMethod: 'credit_card',
        reference: ''
    })
    const [isSaving, setIsSaving] = useState(false)

    // Fetch invoices
    const fetchInvoices = useCallback(async () => {
        try {
            const params: Record<string, string | number> = {}
            if (invoiceStatus !== 'all') params.status = invoiceStatus
            if (invoiceClient) params.client_id = invoiceClient
            if (invoiceDateFrom) params.start_date = invoiceDateFrom
            if (invoiceDateTo) params.end_date = invoiceDateTo
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
            const params: Record<string, string | number> = {}
            if (claimStatus !== 'all') params.status = claimStatus
            if (claimDateFrom) params.start_date = claimDateFrom
            if (claimDateTo) params.end_date = claimDateTo
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
                const [invoicesRes, claimsRes, clientsRes] = await Promise.all([
                    billingApi.getInvoices({}),
                    billingApi.getClaims({}),
                    clientsApi.getAll({ page_size: 500 }),
                ])
                setInvoices(invoicesRes.results)
                setInvoiceCount(invoicesRes.count)
                setClaims(claimsRes.results)
                setClientsList(clientsRes.results)
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

    // Computed totals
    const totalOutstanding = invoices
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.balance, 0)
    const totalPaid = invoices.reduce((sum, i) => sum + i.paid_amount, 0)
    const pendingClaims = claims.filter(c => c.status === 'created' || c.status === 'submitted').length

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
        setBatchGenerating(true)
        try {
            await billingApi.batchGenerate({
                start_date: batchDateFrom,
                end_date: batchDateTo,
            })
            toast.success('Batch invoices generated')
            setIsBatchInvoiceModalOpen(false)
            fetchInvoices()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to generate invoices')
        } finally {
            setBatchGenerating(false)
        }
    }

    // Invoice actions
    const getInvoiceActions = (invoice: Invoice) => {
        const actions = [
            { label: 'View Invoice', icon: <Eye size={16} />, onClick: () => handleViewInvoice(invoice) }
        ]
        if (invoice.status !== 'paid') {
            actions.push({ label: 'Record Payment', icon: <CreditCard size={16} />, onClick: () => { setSelectedInvoice(invoice); setIsPaymentModalOpen(true) } })
        }
        actions.push({ label: 'Download PDF', icon: <DownloadSimple size={16} />, onClick: () => handleDownloadPDF(invoice) })
        return actions
    }

    // Claim actions
    const getClaimActions = (claim: Claim) => {
        const actions = [
            { label: 'View Claim', icon: <Eye size={16} />, onClick: () => handleViewClaim(claim) }
        ]
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
                    <button className="btn-primary" onClick={() => setIsInvoiceModalOpen(true)}>
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
                    onClick={() => setActiveTab('invoices')}
                >
                    <Receipt size={18} weight="duotone" />
                    Invoices
                </button>
                <button
                    className={`billing-tab ${activeTab === 'claims' ? 'active' : ''}`}
                    onClick={() => setActiveTab('claims')}
                >
                    <FileText size={18} weight="duotone" />
                    Claims
                </button>
                <button
                    className={`billing-tab ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    <CreditCard size={18} weight="duotone" />
                    Payments
                </button>
                <button
                    className={`billing-tab ${activeTab === 'aging' ? 'active' : ''}`}
                    onClick={() => setActiveTab('aging')}
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
                                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
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
                                        <td><span className="invoice-number">{payment.invoice_id}</span></td>
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
                                    {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                                </span>
                            </div>
                        </div>

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
                            {selectedClaim.status === 'denied' && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleResubmitClaim(selectedClaim)}
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
                onClose={() => { setIsPaymentModalOpen(false); setPaymentFormData({ amount: '', paymentMethod: 'credit_card', reference: '' }) }}
                title="Record Payment"
                size="sm"
            >
                <form className="payment-form" onSubmit={(e) => { e.preventDefault(); handleRecordPayment() }}>
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
                            <option value="credit_card">Credit Card</option>
                            <option value="eft">EFT Transfer</option>
                            <option value="check">Check</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

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

                    <div className="payment-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            <CheckCircle size={16} weight="bold" />
                            Record Payment
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Batch Invoice Generation Modal */}
            <Modal
                isOpen={isBatchInvoiceModalOpen}
                onClose={() => setIsBatchInvoiceModalOpen(false)}
                title="Generate Batch Invoices"
                size="lg"
            >
                <div className="batch-invoice-content">
                    <p className="batch-description">
                        Create invoices for all billable sessions within a date range.
                        Sessions must have completed notes to be invoiced.
                    </p>

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
                        <div className="radio-group">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="batchClients"
                                    checked={batchClients === 'all'}
                                    onChange={() => setBatchClients('all')}
                                />
                                All clients with billable sessions
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="batchClients"
                                    checked={batchClients === 'selected'}
                                    onChange={() => setBatchClients('selected')}
                                />
                                Selected clients only
                            </label>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setIsBatchInvoiceModalOpen(false)}
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
