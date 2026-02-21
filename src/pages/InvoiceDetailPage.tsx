import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import Modal from '../components/ui/Modal'
import { PageSkeleton } from '../components/ui'
import { billingApi } from '../api'
import type { Invoice, Payment } from '../types'
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

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

export default function InvoiceDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])

    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('credit_card')
    const [paymentReference, setPaymentReference] = useState('')
    const [isSendingEmail, setIsSendingEmail] = useState(false)

    // Fetch invoice detail
    useEffect(() => {
        if (!id) return
        const load = async () => {
            setIsLoading(true)
            try {
                const [inv, paymentsRes] = await Promise.all([
                    billingApi.getInvoice(id),
                    billingApi.getPayments({ invoice_id: id }),
                ])
                setInvoice(inv)
                setPayments(paymentsRes.results)
            } catch (err: any) {
                toast.error(err?.response?.data?.detail || 'Failed to load invoice')
                navigate('/billing')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [id, navigate])

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            paid: { label: 'Paid', className: 'status-badge status-completed' },
            partial: { label: 'Partially Paid', className: 'status-badge status-pending' },
            pending: { label: 'Pending', className: 'status-badge status-draft' },
            overdue: { label: 'Overdue', className: 'status-badge status-cancelled' },
            cancelled: { label: 'Cancelled', className: 'status-badge status-cancelled' }
        }
        return statusMap[status] || statusMap.pending
    }

    const handleRecordPayment = async () => {
        if (!invoice || !paymentAmount) return
        const amount = parseFloat(paymentAmount)
        if (amount <= 0) {
            toast.error('Amount must be greater than zero')
            return
        }

        try {
            await billingApi.recordPayment({
                invoice_id: invoice.id,
                amount,
                payment_method: paymentMethod as any,
                notes: paymentReference || undefined,
            })
            toast.success(`Payment of ${formatCurrency(amount)} recorded`)
            setShowPaymentModal(false)
            setPaymentAmount('')
            setPaymentReference('')

            // Refresh invoice data
            const [inv, paymentsRes] = await Promise.all([
                billingApi.getInvoice(invoice.id),
                billingApi.getPayments({ invoice_id: invoice.id }),
            ])
            setInvoice(inv)
            setPayments(paymentsRes.results)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to record payment')
        }
    }

    const handleDownloadPDF = async () => {
        if (!invoice) return
        try {
            await billingApi.downloadPDF(invoice.id, invoice.invoice_number)
            toast.success('Invoice PDF downloaded')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to download PDF')
        }
    }

    const handleEmailInvoice = async () => {
        if (!invoice || !id || isSendingEmail) return

        // Prompt for recipient email, defaulting to client email if available
        const defaultEmail = invoice.client_email || ''
        const toEmail = window.prompt(
            'Send invoice email to:',
            defaultEmail
        )

        // Handle cancel (null) and empty string
        if (!toEmail || !toEmail.trim()) return

        // FIX #8: Client-side email validation before hitting API
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(toEmail.trim())) {
            toast.error('Please enter a valid email address')
            return
        }

        // FIX #3: Prevent double-click / rapid-fire
        setIsSendingEmail(true)
        try {
            await billingApi.emailInvoice(id, toEmail.trim())
            toast.success(`Invoice emailed to ${toEmail.trim()}`)
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to send invoice email'
            toast.error(msg)
        } finally {
            setIsSendingEmail(false)
        }
    }

    const handlePrint = () => {
        window.print()
        toast.success('Printing invoice')
    }

    if (isLoading || !invoice) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    const statusInfo = getStatusBadge(invoice.status)
    const items = invoice.items || []

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
                        <h1>{invoice.invoice_number}</h1>
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
                    <button
                        className="btn-secondary"
                        onClick={handleEmailInvoice}
                        disabled={isSendingEmail}
                        style={{ opacity: isSendingEmail ? 0.6 : 1 }}
                    >
                        <EnvelopeSimple size={18} />
                        {isSendingEmail ? 'Sending...' : 'Email to Client'}
                    </button>
                    {invoice.status !== 'paid' && (
                        <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
                            <CurrencyDollar size={18} />
                            Record Payment
                        </button>
                    )}
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
                                <strong>{invoice.invoice_number}</strong>
                            </div>
                            <div className="invoice-meta-row">
                                <span>Date Issued:</span>
                                <strong>{new Date(invoice.invoice_date).toLocaleDateString()}</strong>
                            </div>
                            {invoice.due_date && (
                                <div className="invoice-meta-row">
                                    <span>Due Date:</span>
                                    <strong>{new Date(invoice.due_date).toLocaleDateString()}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="invoice-detail-billto">
                        <h4>Bill To:</h4>
                        <p><strong>{invoice.client_name || 'N/A'}</strong></p>
                    </div>

                    {/* Line Items */}
                    {items.length > 0 && (
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
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.session_date ? new Date(item.session_date).toLocaleDateString() : 'â€”'}</td>
                                            <td>
                                                <div>
                                                    <strong>{item.service_code}</strong>
                                                    {item.description && <span className="text-muted"> - {item.description}</span>}
                                                </div>
                                            </td>
                                            <td>{item.provider_name || 'â€”'}</td>
                                            <td>{item.units}</td>
                                            <td>{formatCurrency(item.rate)}</td>
                                            <td className="text-right">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="invoice-detail-totals">
                        <div className="invoice-total-row">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.total_amount)}</span>
                        </div>
                        <div className="invoice-total-row">
                            <span>Amount Paid</span>
                            <span className="text-success">-{formatCurrency(invoice.paid_amount)}</span>
                        </div>
                        <div className="invoice-total-row invoice-total-due">
                            <span>Balance Due</span>
                            <span>{formatCurrency(invoice.balance)}</span>
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
                                <span className="value">{formatCurrency(invoice.total_amount)}</span>
                            </div>
                            <div className="invoice-summary-stat">
                                <span className="label">Paid</span>
                                <span className="value text-success">{formatCurrency(invoice.paid_amount)}</span>
                            </div>
                            <div className="invoice-summary-stat highlight">
                                <span className="label">Balance</span>
                                <span className="value">{formatCurrency(invoice.balance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="invoice-detail-card">
                        <h4>
                            <Clock size={20} />
                            Payment History
                        </h4>
                        {payments.length > 0 ? (
                            <div className="invoice-payments-list">
                                {payments.map(payment => (
                                    <div key={payment.id} className="invoice-payment-item">
                                        <div className="payment-icon">
                                            <CreditCard size={18} />
                                        </div>
                                        <div className="payment-details">
                                            <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                                            <span className="payment-method">{payment.payment_method || 'â€”'} {payment.reference_number || ''}</span>
                                            <span className="payment-date">{new Date(payment.payment_date).toLocaleDateString()}</span>
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
                                onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                        </div>
                        <p className="form-hint">Balance due: {formatCurrency(invoice.balance)}</p>
                    </div>

                    <div className="form-group">
                        <label>Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="credit_card">Credit Card</option>
                            <option value="eft">EFT Transfer</option>
                            <option value="check">Check</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
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
