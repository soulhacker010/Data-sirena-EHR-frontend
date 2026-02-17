import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { Modal, ActionMenu, EmptyState, PageSkeleton } from '../components/ui'
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

// Types
interface Invoice {
    id: string
    invoiceNumber: string
    clientId: number
    clientName: string
    dateOfService: string
    dueDate: string
    totalAmount: number
    paidAmount: number
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial'
    items: InvoiceItem[]
    createdAt: string
}

interface InvoiceItem {
    id: string
    cptCode: string
    description: string
    units: number
    rate: number
    amount: number
}

interface Claim {
    id: string
    claimNumber: string
    clientId: number
    clientName: string
    payerName: string
    dateOfService: string
    submittedDate: string
    amount: number
    status: 'pending' | 'submitted' | 'accepted' | 'denied' | 'paid'
    denialReason?: string
}

interface Payment {
    id: string
    invoiceId: string
    invoiceNumber: string
    clientName: string
    amount: number
    paymentDate: string
    paymentMethod: 'credit_card' | 'ach' | 'check' | 'cash' | 'insurance'
    reference: string
}

// Mock Data
const mockInvoices: Invoice[] = [
    {
        id: '1', invoiceNumber: 'INV-2026-001', clientId: 1, clientName: 'Sarah Johnson',
        dateOfService: '2026-02-07', dueDate: '2026-03-07', totalAmount: 450.00, paidAmount: 450.00,
        status: 'paid', createdAt: '2026-02-07',
        items: [{ id: '1', cptCode: '97153', description: 'Adaptive Behavior Treatment', units: 8, rate: 56.25, amount: 450.00 }]
    },
    {
        id: '2', invoiceNumber: 'INV-2026-002', clientId: 2, clientName: 'Michael Chen',
        dateOfService: '2026-02-08', dueDate: '2026-03-08', totalAmount: 337.50, paidAmount: 0,
        status: 'sent', createdAt: '2026-02-08',
        items: [{ id: '1', cptCode: '97156', description: 'Family Training', units: 6, rate: 56.25, amount: 337.50 }]
    },
    {
        id: '3', invoiceNumber: 'INV-2026-003', clientId: 3, clientName: 'Emily Davis',
        dateOfService: '2026-02-04', dueDate: '2026-03-04', totalAmount: 225.00, paidAmount: 100.00,
        status: 'partial', createdAt: '2026-02-04',
        items: [{ id: '1', cptCode: '97153', description: 'Adaptive Behavior Treatment', units: 4, rate: 56.25, amount: 225.00 }]
    },
    {
        id: '4', invoiceNumber: 'INV-2026-004', clientId: 5, clientName: 'Lisa Thompson',
        dateOfService: '2026-01-20', dueDate: '2026-02-20', totalAmount: 675.00, paidAmount: 0,
        status: 'overdue', createdAt: '2026-01-20',
        items: [{ id: '1', cptCode: '97151', description: 'Behavior Assessment', units: 12, rate: 56.25, amount: 675.00 }]
    },
    {
        id: '5', invoiceNumber: 'INV-2026-005', clientId: 4, clientName: 'James Wilson',
        dateOfService: '2026-02-09', dueDate: '2026-03-09', totalAmount: 281.25, paidAmount: 0,
        status: 'draft', createdAt: '2026-02-09',
        items: [{ id: '1', cptCode: '97153', description: 'Adaptive Behavior Treatment', units: 5, rate: 56.25, amount: 281.25 }]
    }
]

const mockClaims: Claim[] = [
    { id: '1', claimNumber: 'CLM-2026-001', clientId: 1, clientName: 'Sarah Johnson', payerName: 'Blue Cross Blue Shield', dateOfService: '2026-02-07', submittedDate: '2026-02-08', amount: 450.00, status: 'paid' },
    { id: '2', claimNumber: 'CLM-2026-002', clientId: 2, clientName: 'Michael Chen', payerName: 'United Healthcare', dateOfService: '2026-02-08', submittedDate: '2026-02-09', amount: 337.50, status: 'submitted' },
    { id: '3', claimNumber: 'CLM-2026-003', clientId: 3, clientName: 'Emily Davis', payerName: 'Aetna', dateOfService: '2026-02-04', submittedDate: '2026-02-05', amount: 225.00, status: 'denied', denialReason: 'Missing prior authorization' },
    { id: '4', claimNumber: 'CLM-2026-004', clientId: 5, clientName: 'Lisa Thompson', payerName: 'Cigna', dateOfService: '2026-01-20', submittedDate: '2026-01-21', amount: 675.00, status: 'accepted' },
    { id: '5', claimNumber: 'CLM-2026-005', clientId: 4, clientName: 'James Wilson', payerName: 'Medicaid', dateOfService: '2026-02-03', submittedDate: '2026-02-04', amount: 281.25, status: 'pending' }
]

const mockPayments: Payment[] = [
    { id: '1', invoiceId: '1', invoiceNumber: 'INV-2026-001', clientName: 'Sarah Johnson', amount: 450.00, paymentDate: '2026-02-10', paymentMethod: 'insurance', reference: 'EOB-12345' },
    { id: '2', invoiceId: '3', invoiceNumber: 'INV-2026-003', clientName: 'Emily Davis', amount: 100.00, paymentDate: '2026-02-08', paymentMethod: 'credit_card', reference: 'CC-78901' },
    { id: '3', invoiceId: '6', invoiceNumber: 'INV-2026-006', clientName: 'David Brown', amount: 200.00, paymentDate: '2026-02-05', paymentMethod: 'check', reference: 'CHK-4567' },
    { id: '4', invoiceId: '7', invoiceNumber: 'INV-2026-007', clientName: 'Sarah Johnson', amount: 350.00, paymentDate: '2026-02-01', paymentMethod: 'ach', reference: 'ACH-9876' }
]

const clients = [
    { id: 0, name: 'All Clients' },
    { id: 1, name: 'Sarah Johnson' },
    { id: 2, name: 'Michael Chen' },
    { id: 3, name: 'Emily Davis' },
    { id: 4, name: 'James Wilson' },
    { id: 5, name: 'Lisa Thompson' },
    { id: 6, name: 'David Brown' },
]

const payers = [
    { id: 0, name: 'All Payers' },
    { id: 1, name: 'Blue Cross Blue Shield' },
    { id: 2, name: 'United Healthcare' },
    { id: 3, name: 'Aetna' },
    { id: 4, name: 'Cigna' },
    { id: 5, name: 'Medicaid' },
]

// Helpers
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const paymentMethodLabels: Record<string, string> = {
    credit_card: 'Credit Card',
    ach: 'ACH Transfer',
    check: 'Check',
    cash: 'Cash',
    insurance: 'Insurance'
}

export default function BillingPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'invoices' | 'claims' | 'payments' | 'aging'>('invoices')

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    // Invoices state
    const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
    const [invoiceSearch, setInvoiceSearch] = useState('')
    const [invoiceStatus, setInvoiceStatus] = useState('all')
    const [invoiceClient, setInvoiceClient] = useState(0)
    const [invoiceDateFrom, setInvoiceDateFrom] = useState('')
    const [invoiceDateTo, setInvoiceDateTo] = useState('')

    // Claims state
    const [claims, setClaims] = useState<Claim[]>(mockClaims)
    const [claimSearch, setClaimSearch] = useState('')
    const [claimStatus, setClaimStatus] = useState('all')
    const [claimPayer, setClaimPayer] = useState(0)
    const [claimDateFrom, setClaimDateFrom] = useState('')
    const [claimDateTo, setClaimDateTo] = useState('')

    // Payments state
    const [payments] = useState<Payment[]>(mockPayments)
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

    // Computed totals
    const totalOutstanding = invoices
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0)
    const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0)
    const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'submitted').length

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.clientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
            inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase())
        const matchesStatus = invoiceStatus === 'all' || inv.status === invoiceStatus
        const matchesClient = invoiceClient === 0 || inv.clientId === invoiceClient
        const invDate = new Date(inv.dateOfService)
        const matchesDateFrom = !invoiceDateFrom || invDate >= new Date(invoiceDateFrom)
        const matchesDateTo = !invoiceDateTo || invDate <= new Date(invoiceDateTo)
        return matchesSearch && matchesStatus && matchesClient && matchesDateFrom && matchesDateTo
    })

    // Filter claims
    const filteredClaims = claims.filter(claim => {
        const matchesSearch = claim.clientName.toLowerCase().includes(claimSearch.toLowerCase()) ||
            claim.claimNumber.toLowerCase().includes(claimSearch.toLowerCase())
        const matchesStatus = claimStatus === 'all' || claim.status === claimStatus
        const matchesPayer = claimPayer === 0 || claim.payerName === payers.find(p => p.id === claimPayer)?.name
        const clmDate = new Date(claim.dateOfService)
        const matchesDateFrom = !claimDateFrom || clmDate >= new Date(claimDateFrom)
        const matchesDateTo = !claimDateTo || clmDate <= new Date(claimDateTo)
        return matchesSearch && matchesStatus && matchesPayer && matchesDateFrom && matchesDateTo
    })

    // Aging report data
    const agingData = {
        current: invoices.filter(i => {
            const days = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days <= 0
        }).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
        days1to30: invoices.filter(i => {
            const days = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 0 && days <= 30
        }).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
        days31to60: invoices.filter(i => {
            const days = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 30 && days <= 60
        }).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
        days61to90: invoices.filter(i => {
            const days = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 60 && days <= 90
        }).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
        over90: invoices.filter(i => {
            const days = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return i.status !== 'paid' && days > 90
        }).reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0)
    }

    // Filter payments
    const filteredPayments = payments.filter(pmt =>
        pmt.clientName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        pmt.invoiceNumber.toLowerCase().includes(paymentSearch.toLowerCase())
    )

    // Handlers
    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice)
        setIsInvoiceModalOpen(true)
    }

    const handleSendInvoice = (invoice: Invoice) => {
        setInvoices(prev => prev.map(i =>
            i.id === invoice.id ? { ...i, status: 'sent' as const } : i
        ))
        toast.success('Invoice sent to client')
    }

    const handleRecordPayment = () => {
        if (!selectedInvoice || !paymentFormData.amount) return
        const amount = parseFloat(paymentFormData.amount)
        const newPaid = selectedInvoice.paidAmount + amount
        const newStatus = newPaid >= selectedInvoice.totalAmount ? 'paid' : 'partial'

        setInvoices(prev => prev.map(i =>
            i.id === selectedInvoice.id
                ? { ...i, paidAmount: newPaid, status: newStatus as Invoice['status'] }
                : i
        ))
        setIsPaymentModalOpen(false)
        setIsInvoiceModalOpen(false)
        setPaymentFormData({ amount: '', paymentMethod: 'credit_card', reference: '' })
        toast.success(`Payment of $${amount.toFixed(2)} recorded`)
    }

    const handleViewClaim = (claim: Claim) => {
        setSelectedClaim(claim)
        setIsClaimModalOpen(true)
    }

    const handleResubmitClaim = (claim: Claim) => {
        setClaims(prev => prev.map(c =>
            c.id === claim.id ? { ...c, status: 'submitted' as const, denialReason: undefined } : c
        ))
        setIsClaimModalOpen(false)
        toast.success('Claim resubmitted')
    }

    const handleDownloadPDF = (invoice: Invoice) => {
        // Generate mock PDF content
        const content = `
INVOICE ${invoice.invoiceNumber}
=============================
Client: ${invoice.clientName}
Date of Service: ${invoice.dateOfService}
Due Date: ${invoice.dueDate}
Amount: $${invoice.totalAmount.toFixed(2)}
Paid: $${invoice.paidAmount.toFixed(2)}
Balance Due: $${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}
        `.trim()

        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${invoice.invoiceNumber}.txt`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Invoice downloaded')
    }

    // Invoice actions
    const getInvoiceActions = (invoice: Invoice) => {
        const actions = [
            { label: 'View Invoice', icon: <Eye size={16} />, onClick: () => handleViewInvoice(invoice) }
        ]
        if (invoice.status === 'draft') {
            actions.push({ label: 'Send Invoice', icon: <PaperPlaneTilt size={16} />, onClick: () => handleSendInvoice(invoice) })
        }
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
                        <p className="summary-value">{invoices.length}</p>
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
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                                <option value="overdue">Overdue</option>
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group">
                            <select value={invoiceClient} onChange={(e) => setInvoiceClient(Number(e.target.value))} className="filter-select">
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group date-range">
                            <CalendarBlank
                                size={18}
                                weight="regular"
                                onClick={() => {
                                    const inputs = document.querySelectorAll('.filter-group.date-range input[type="date"]');
                                    if (inputs[0]) (inputs[0] as HTMLInputElement).showPicker?.();
                                }}
                            />
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
                                        <td><span className="invoice-number">{invoice.invoiceNumber}</span></td>
                                        <td>{invoice.clientName}</td>
                                        <td>{formatDate(invoice.dateOfService)}</td>
                                        <td>{formatDate(invoice.dueDate)}</td>
                                        <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(invoice.totalAmount)}</span></td>
                                        <td style={{ textAlign: 'right' }}><span className="amount-paid">{formatCurrency(invoice.paidAmount)}</span></td>
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
                                <option value="pending">Pending</option>
                                <option value="submitted">Submitted</option>
                                <option value="accepted">Accepted</option>
                                <option value="denied">Denied</option>
                                <option value="paid">Paid</option>
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group">
                            <select value={claimPayer} onChange={(e) => setClaimPayer(Number(e.target.value))} className="filter-select">
                                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                        <div className="filter-group date-range">
                            <CalendarBlank
                                size={18}
                                weight="regular"
                                onClick={() => {
                                    const inputs = document.querySelectorAll('.filter-group.date-range input[type="date"]');
                                    const claimsTab = document.querySelector('#claims-tab');
                                    if (claimsTab && inputs[0]) {
                                        (inputs[0] as HTMLInputElement).showPicker?.();
                                    }
                                }}
                            />
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
                                    <th style={{ width: '16%' }}>Client</th>
                                    <th>Payer</th>
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
                                        <td><span className="claim-number">{claim.claimNumber}</span></td>
                                        <td>{claim.clientName}</td>
                                        <td>{claim.payerName}</td>
                                        <td>{formatDate(claim.dateOfService)}</td>
                                        <td>{formatDate(claim.submittedDate)}</td>
                                        <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(claim.amount)}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge badge-claim-${claim.status}`}>
                                                {claim.status === 'paid' && <CheckCircle size={12} weight="bold" />}
                                                {claim.status === 'denied' && <XCircle size={12} weight="bold" />}
                                                {claim.status === 'pending' && <Clock size={12} weight="bold" />}
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
                                    <th style={{ width: '12%' }}>Invoice #</th>
                                    <th style={{ width: '20%' }}>Client</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'center' }}>Method</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(payment => (
                                    <tr key={payment.id}>
                                        <td><span className="invoice-number">{payment.invoiceNumber}</span></td>
                                        <td>{payment.clientName}</td>
                                        <td><span className="amount success">{formatCurrency(payment.amount)}</span></td>
                                        <td>{formatDate(payment.paymentDate)}</td>
                                        <td>
                                            <span className={`payment-method ${payment.paymentMethod}`}>
                                                {paymentMethodLabels[payment.paymentMethod]}
                                            </span>
                                        </td>
                                        <td><span className="reference">{payment.reference}</span></td>
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
                                    <div className="bucket-fill" style={{ width: `${Math.min((agingData.current / totalOutstanding) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-30">
                                <div className="bucket-label">1-30 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days1to30)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${Math.min((agingData.days1to30 / totalOutstanding) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-60">
                                <div className="bucket-label">31-60 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days31to60)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${Math.min((agingData.days31to60 / totalOutstanding) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket days-90">
                                <div className="bucket-label">61-90 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.days61to90)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${Math.min((agingData.days61to90 / totalOutstanding) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="aging-bucket over-90">
                                <div className="bucket-label">Over 90 Days</div>
                                <div className="bucket-amount">{formatCurrency(agingData.over90)}</div>
                                <div className="bucket-bar">
                                    <div className="bucket-fill" style={{ width: `${Math.min((agingData.over90 / totalOutstanding) * 100, 100)}%` }} />
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
                                    {invoices.filter(i => i.status === 'overdue' || (i.status !== 'paid' && new Date(i.dueDate) < new Date())).map(inv => {
                                        const daysOverdue = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                                        return (
                                            <tr key={inv.id} onClick={() => handleViewInvoice(inv)} className="clickable-row">
                                                <td><span className="invoice-number">{inv.invoiceNumber}</span></td>
                                                <td>{inv.clientName}</td>
                                                <td>{formatDate(inv.dueDate)}</td>
                                                <td style={{ textAlign: 'center' }}><span className={`days-overdue ${daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'warning' : ''}`}>{daysOverdue} days</span></td>
                                                <td style={{ textAlign: 'right' }}><span className="amount">{formatCurrency(inv.totalAmount - inv.paidAmount)}</span></td>
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
                title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
                size="lg"
            >
                {selectedInvoice && (
                    <div className="invoice-detail">
                        <div className="invoice-header-info">
                            <div>
                                <p className="label">Client</p>
                                <p className="value">{selectedInvoice.clientName}</p>
                            </div>
                            <div>
                                <p className="label">Service Date</p>
                                <p className="value">{formatDate(selectedInvoice.dateOfService)}</p>
                            </div>
                            <div>
                                <p className="label">Due Date</p>
                                <p className="value">{formatDate(selectedInvoice.dueDate)}</p>
                            </div>
                            <div>
                                <p className="label">Status</p>
                                <span className={`badge badge-invoice-${selectedInvoice.status}`}>
                                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                                </span>
                            </div>
                        </div>

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
                                            <td>{item.cptCode}</td>
                                            <td>{item.description}</td>
                                            <td style={{ textAlign: 'center' }}>{item.units}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="invoice-totals">
                            <div className="total-row">
                                <span>Total</span>
                                <span className="total-amount">{formatCurrency(selectedInvoice.totalAmount)}</span>
                            </div>
                            <div className="total-row">
                                <span>Paid</span>
                                <span className="paid-amount">{formatCurrency(selectedInvoice.paidAmount)}</span>
                            </div>
                            <div className="total-row balance">
                                <span>Balance Due</span>
                                <span>{formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}</span>
                            </div>
                        </div>

                        <div className="invoice-actions">
                            {selectedInvoice.status !== 'paid' && (
                                <button className="btn-primary" onClick={() => { setIsPaymentModalOpen(true) }}>
                                    <CreditCard size={16} weight="bold" />
                                    Record Payment
                                </button>
                            )}
                            <button className="btn-secondary">
                                <DownloadSimple size={16} weight="bold" />
                                Download PDF
                            </button>
                            {selectedInvoice.status === 'draft' && (
                                <button className="btn-secondary" onClick={() => handleSendInvoice(selectedInvoice)}>
                                    <PaperPlaneTilt size={16} weight="bold" />
                                    Send Invoice
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Claim Detail Modal */}
            <Modal
                isOpen={isClaimModalOpen}
                onClose={() => { setIsClaimModalOpen(false); setSelectedClaim(null) }}
                title={`Claim ${selectedClaim?.claimNumber || ''}`}
                size="md"
            >
                {selectedClaim && (
                    <div className="claim-detail">
                        <div className="claim-info-grid">
                            <div><p className="label">Client</p><p className="value">{selectedClaim.clientName}</p></div>
                            <div><p className="label">Payer</p><p className="value">{selectedClaim.payerName}</p></div>
                            <div><p className="label">Service Date</p><p className="value">{formatDate(selectedClaim.dateOfService)}</p></div>
                            <div><p className="label">Submitted</p><p className="value">{formatDate(selectedClaim.submittedDate)}</p></div>
                            <div><p className="label">Amount</p><p className="value">{formatCurrency(selectedClaim.amount)}</p></div>
                            <div>
                                <p className="label">Status</p>
                                <span className={`badge badge-claim-${selectedClaim.status}`}>
                                    {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {selectedClaim.denialReason && (
                            <div className="denial-reason">
                                <Warning size={20} weight="fill" />
                                <div>
                                    <p className="denial-title">Denial Reason</p>
                                    <p className="denial-text">{selectedClaim.denialReason}</p>
                                </div>
                            </div>
                        )}

                        <div className="claim-actions">
                            {selectedClaim.status === 'denied' && (
                                <button className="btn-primary" onClick={() => handleResubmitClaim(selectedClaim)}>
                                    <ArrowClockwise size={16} weight="bold" />
                                    Resubmit Claim
                                </button>
                            )}
                            <button className="btn-secondary">
                                <DownloadSimple size={16} weight="bold" />
                                Download EOB
                            </button>
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
                            <p>Invoice: <strong>{selectedInvoice.invoiceNumber}</strong></p>
                            <p>Balance Due: <strong>{formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}</strong></p>
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
                            <option value="ach">ACH Transfer</option>
                            <option value="check">Check</option>
                            <option value="cash">Cash</option>
                            <option value="insurance">Insurance</option>
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

                    {batchDateFrom && batchDateTo && (
                        <div className="batch-preview-box">
                            <strong>Preview:</strong>
                            <p>12 sessions found • 6 clients • Est. $5,400 total</p>
                        </div>
                    )}

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
                            onClick={() => {
                                setBatchGenerating(true)
                                setTimeout(() => {
                                    setBatchGenerating(false)
                                    setIsBatchInvoiceModalOpen(false)
                                }, 2000)
                            }}
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

            {/* Claim Denial Resubmission Modal */}
            <Modal
                isOpen={isClaimModalOpen && selectedClaim !== null}
                onClose={() => setIsClaimModalOpen(false)}
                title="Claim Details"
                size="lg"
            >
                {selectedClaim && (
                    <div className="claim-modal-content">
                        {/* Claim Header */}
                        <div className="claim-modal-header">
                            <div className="claim-info-row">
                                <span className="claim-info-label">Claim #:</span>
                                <span className="claim-info-value">{selectedClaim.claimNumber}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Client:</span>
                                <span className="claim-info-value">{selectedClaim.clientName}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Payer:</span>
                                <span className="claim-info-value">{selectedClaim.payerName}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">DOS:</span>
                                <span className="claim-info-value">{new Date(selectedClaim.dateOfService).toLocaleDateString()}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Amount:</span>
                                <span className="claim-info-value">${selectedClaim.amount.toFixed(2)}</span>
                            </div>
                            <div className="claim-info-row">
                                <span className="claim-info-label">Status:</span>
                                <span className={`status-badge status-${selectedClaim.status}`}>
                                    {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Denial Reason Box */}
                        {selectedClaim.status === 'denied' && selectedClaim.denialReason && (
                            <div className="denial-reason-box">
                                <div className="denial-reason-header">
                                    <Warning size={20} weight="fill" />
                                    <strong>Denial Reason</strong>
                                </div>
                                <p className="denial-reason-text">{selectedClaim.denialReason}</p>
                            </div>
                        )}

                        {/* Corrective Actions - Show only for denied claims */}
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

                        {/* Actions */}
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
        </DashboardLayout>
    )
}
