import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import Modal from '../components/ui/Modal'
import { PageSkeleton } from '../components/ui'
import { paymentSchema } from '../lib/validationSchemas'
import {
    ArrowLeft,
    Printer,
    EnvelopeSimple,
    Download,
    CurrencyDollar,
    CheckCircle,
    Clock,
    Receipt,
    CreditCard,
    Plus
} from '@phosphor-icons/react'

// Mock invoice data
const mockInvoice = {
    id: 'INV-2026-0042',
    status: 'partially_paid',
    clientId: '1',
    clientName: 'Sarah Johnson',
    clientEmail: 'sarah.j@email.com',
    clientPhone: '(555) 123-4567',
    clientAddress: '123 Main Street, Austin, TX 78701',
    dateIssued: '2026-02-01',
    dateDue: '2026-02-28',
    subtotal: 1200.00,
    adjustments: 0,
    amountPaid: 400.00,
    balanceDue: 800.00,
    lineItems: [
        {
            id: 1,
            date: '2026-01-15',
            serviceCode: '97153',
            serviceName: 'Adaptive Behavior Treatment',
            provider: 'Dr. Amanda Wilson',
            units: 8,
            rate: 50.00,
            amount: 400.00
        },
        {
            id: 2,
            date: '2026-01-22',
            serviceCode: '97153',
            serviceName: 'Adaptive Behavior Treatment',
            provider: 'Dr. Amanda Wilson',
            units: 8,
            rate: 50.00,
            amount: 400.00
        },
        {
            id: 3,
            date: '2026-01-29',
            serviceCode: '97153',
            serviceName: 'Adaptive Behavior Treatment',
            provider: 'Dr. Amanda Wilson',
            units: 8,
            rate: 50.00,
            amount: 400.00
        }
    ],
    payments: [
        {
            id: 1,
            date: '2026-02-05',
            method: 'Credit Card',
            reference: '**** 4242',
            amount: 400.00
        }
    ]
}

export default function InvoiceDetailPage() {
    const { id: _id } = useParams()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const [invoice] = useState(mockInvoice)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('credit_card')
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            paid: { label: 'Paid', className: 'status-badge status-completed' },
            partially_paid: { label: 'Partially Paid', className: 'status-badge status-pending' },
            unpaid: { label: 'Unpaid', className: 'status-badge status-draft' },
            overdue: { label: 'Overdue', className: 'status-badge status-cancelled' }
        }
        return statusMap[status] || statusMap.unpaid
    }

    const handleRecordPayment = () => {
        const result = paymentSchema.safeParse({
            amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
            method: paymentMethod,
            reference: paymentReference
        })
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setPaymentErrors(fieldErrors)
            return
        }

        setShowPaymentModal(false)
        setPaymentAmount('')
        setPaymentReference('')
        setPaymentErrors({})
        toast.success(`Payment of $${paymentAmount} recorded successfully`)
    }

    const handleDownloadPDF = () => {
        const content = `
INVOICE: ${invoice.id}
Status: ${invoice.status}
Client: ${invoice.clientName}
Email: ${invoice.clientEmail}
=============================
${invoice.lineItems.map(item => `${item.serviceCode} ${item.serviceName} - Units: ${item.units} x $${item.rate.toFixed(2)} = $${item.amount.toFixed(2)}`).join('\n')}
=============================
Subtotal: $${invoice.subtotal.toFixed(2)}
Amount Paid: $${invoice.amountPaid.toFixed(2)}
Balance Due: $${invoice.balanceDue.toFixed(2)}
        `.trim()

        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${invoice.id}.txt`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Invoice downloaded')
    }

    const handleEmailInvoice = () => {
        // Open mailto with pre-filled invoice info
        const subject = encodeURIComponent(`Invoice ${invoice.id} - Sirena Health`)
        const body = encodeURIComponent(`Dear ${invoice.clientName},\n\nPlease find your invoice ${invoice.id} for the amount of $${invoice.balanceDue.toFixed(2)}.\n\nBalance Due: $${(invoice.balanceDue - invoice.amountPaid).toFixed(2)}\n\nThank you,\nSirena Health`)
        window.open(`mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`)
        toast.success('Email client opened')
    }

    const handlePrint = () => {
        window.print()
        toast.success('Printing invoice')
    }

    const statusInfo = getStatusBadge(invoice.status)

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="invoice-detail-header">
                <div className="invoice-detail-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/billing')}>
                        <ArrowLeft size={20} />
                        Back to Billing
                    </button>
                    <div className="invoice-detail-title">
                        <h1>{invoice.id}</h1>
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                    </div>
                </div>

                <div className="invoice-detail-header-actions">
                    <button className="btn-outline" onClick={handlePrint}>
                        <Printer size={18} />
                        Print
                    </button>
                    <button className="btn-outline" onClick={handleDownloadPDF}>
                        <Download size={18} />
                        Download PDF
                    </button>
                    <button className="btn-secondary" onClick={handleEmailInvoice}>
                        <EnvelopeSimple size={18} />
                        Email to Client
                    </button>
                    <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
                        <CurrencyDollar size={18} />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="invoice-detail-layout">
                {/* Invoice Content */}
                <div className="invoice-detail-main">
                    {/* Invoice Info Header */}
                    <div className="invoice-detail-info-header">
                        <div className="invoice-detail-company">
                            <h2>Sirena Health ABA Center</h2>
                            <p>123 Medical Plaza Dr</p>
                            <p>Austin, TX 78701</p>
                            <p>info@sirenahealthaba.com</p>
                            <p>NPI: 1234567890</p>
                        </div>

                        <div className="invoice-detail-meta">
                            <div className="invoice-meta-row">
                                <span>Invoice Number:</span>
                                <strong>{invoice.id}</strong>
                            </div>
                            <div className="invoice-meta-row">
                                <span>Date Issued:</span>
                                <strong>{new Date(invoice.dateIssued).toLocaleDateString()}</strong>
                            </div>
                            <div className="invoice-meta-row">
                                <span>Due Date:</span>
                                <strong>{new Date(invoice.dateDue).toLocaleDateString()}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="invoice-detail-billto">
                        <h4>Bill To:</h4>
                        <p><strong>{invoice.clientName}</strong></p>
                        <p>{invoice.clientAddress}</p>
                        <p>{invoice.clientEmail}</p>
                        <p>{invoice.clientPhone}</p>
                    </div>

                    {/* Line Items */}
                    <div className="invoice-detail-items">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Service</th>
                                    <th>Provider</th>
                                    <th>Units</th>
                                    <th>Rate</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.lineItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{new Date(item.date).toLocaleDateString()}</td>
                                        <td>
                                            <div>
                                                <strong>{item.serviceCode}</strong>
                                                <span className="text-muted"> - {item.serviceName}</span>
                                            </div>
                                        </td>
                                        <td>{item.provider}</td>
                                        <td>{item.units}</td>
                                        <td>${item.rate.toFixed(2)}</td>
                                        <td className="text-right">${item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="invoice-detail-totals">
                        <div className="invoice-total-row">
                            <span>Subtotal</span>
                            <span>${invoice.subtotal.toFixed(2)}</span>
                        </div>
                        {invoice.adjustments !== 0 && (
                            <div className="invoice-total-row">
                                <span>Adjustments</span>
                                <span>${invoice.adjustments.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="invoice-total-row">
                            <span>Amount Paid</span>
                            <span className="text-success">-${invoice.amountPaid.toFixed(2)}</span>
                        </div>
                        <div className="invoice-total-row invoice-total-due">
                            <span>Balance Due</span>
                            <span>${invoice.balanceDue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment History Sidebar */}
                <div className="invoice-detail-sidebar">
                    <div className="invoice-detail-card">
                        <h4>
                            <Receipt size={20} />
                            Payment Summary
                        </h4>
                        <div className="invoice-summary-stats">
                            <div className="invoice-summary-stat">
                                <span className="label">Total</span>
                                <span className="value">${invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="invoice-summary-stat">
                                <span className="label">Paid</span>
                                <span className="value text-success">${invoice.amountPaid.toFixed(2)}</span>
                            </div>
                            <div className="invoice-summary-stat highlight">
                                <span className="label">Balance</span>
                                <span className="value">${invoice.balanceDue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="invoice-detail-card">
                        <h4>
                            <Clock size={20} />
                            Payment History
                        </h4>
                        {invoice.payments.length > 0 ? (
                            <div className="invoice-payments-list">
                                {invoice.payments.map(payment => (
                                    <div key={payment.id} className="invoice-payment-item">
                                        <div className="payment-icon">
                                            <CreditCard size={18} />
                                        </div>
                                        <div className="payment-details">
                                            <span className="payment-amount">${payment.amount.toFixed(2)}</span>
                                            <span className="payment-method">{payment.method} {payment.reference}</span>
                                            <span className="payment-date">{new Date(payment.date).toLocaleDateString()}</span>
                                        </div>
                                        <CheckCircle size={18} weight="fill" className="text-success" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted text-center">No payments recorded</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Record Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Payment"
            >
                <div className="payment-modal-form">
                    <div className="form-group">
                        <label>Payment Amount</label>
                        <div className="input-with-prefix">
                            <span className="input-prefix">$</span>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={paymentAmount}
                                onChange={(e) => {
                                    setPaymentAmount(e.target.value)
                                    if (paymentErrors.amount) {
                                        setPaymentErrors(prev => {
                                            const next = { ...prev }
                                            delete next.amount
                                            return next
                                        })
                                    }
                                }}
                                className={paymentErrors.amount ? 'input-error' : ''}
                            />
                        </div>
                        {paymentErrors.amount && <span className="field-error">{paymentErrors.amount}</span>}
                        <p className="form-hint">Balance due: ${invoice.balanceDue.toFixed(2)}</p>
                    </div>

                    <div className="form-group">
                        <label>Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="credit_card">Credit Card</option>
                            <option value="debit_card">Debit Card</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="insurance">Insurance Payment</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Reference / Notes</label>
                        <input
                            type="text"
                            placeholder="e.g., Check #1234, Last 4 digits, etc."
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                        />
                    </div>

                    <div className="modal-actions">
                        <button className="btn-outline" onClick={() => setShowPaymentModal(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleRecordPayment}
                            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                        >
                            <Plus size={18} />
                            Record Payment
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
