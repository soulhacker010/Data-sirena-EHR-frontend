import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { PaymentsReport } from '../api/reports'
import {
    ArrowLeft,
    Download,
    CreditCard,
    Money,
    ArrowCounterClockwise,
    Receipt,
    CalendarBlank,
    TrendUp,
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const paymentMethodLabel = (value: string) => {
    if (value === 'credit_card' || value === 'stripe') return 'Card / Stripe'
    if (value === 'eft') return 'EFT Transfer'
    if (value === 'check') return 'Check'
    if (value === 'cash') return 'Cash'
    if (value === 'other') return 'Other'
    return 'Unknown'
}

const paymentTypeLabel = (value: string) => {
    if (value === 'payment') return 'Payment'
    if (value === 'refund') return 'Refund'
    if (value === 'write_off') return 'Write-off'
    if (value === 'adjustment') return 'Adjustment'
    return value
}

const paymentTypeBadgeClass = (value: string) => {
    if (value === 'payment') return 'badge badge-success'
    if (value === 'refund') return 'badge badge-warning'
    if (value === 'adjustment') return 'badge badge-info'
    return 'badge badge-default'
}

const paymentMethodBadgeClass = (value: string) => {
    if (value === 'credit_card' || value === 'stripe') return 'badge badge-info'
    if (value === 'eft') return 'badge badge-success'
    if (value === 'check') return 'badge badge-warning'
    return 'badge badge-default'
}

export default function PaymentsReportPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<PaymentsReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getPaymentsReport({
                start_date: dateFrom || undefined,
                end_date: dateTo || undefined,
            })
            setData(report)
        } catch {
            toast.error('Failed to load report')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadReport()
    }, [])

    const handleExportCSV = () => {
        if (!data) return
        const headers = ['Invoice', 'Client', 'Type', 'Method', 'Amount', 'Date', 'Reference']
        const rows = data.transactions.map((item) => [
            item.invoice_number,
            item.client_name,
            paymentTypeLabel(item.payment_type),
            paymentMethodLabel(item.payment_method),
            formatCurrency(item.amount),
            formatDate(item.payment_date),
            item.reference_number || '',
        ])
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `payments-report-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Report exported')
    }

    if (isLoading || !data) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} /> Back to Reports
                    </button>
                    <h1 className="page-title">
                        <CreditCard size={28} weight="duotone" />
                        Payments Report
                    </h1>
                    <p className="page-subtitle">Track collections, refunds, payment methods, and recent transaction activity</p>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV}>
                    <Download size={18} weight="bold" /> Export CSV
                </button>
            </div>

            <div className="filter-bar">
                <div className="date-filter">
                    <CalendarBlank size={16} />
                    <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span>to</span>
                    <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <button className="btn-secondary btn-sm" onClick={loadReport}>Apply Filters</button>
            </div>

            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <Receipt size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.total_transactions}</p>
                    <p className="stat-label">Transactions</p>
                </div>
                <div className="report-stat-card success">
                    <Money size={24} weight="duotone" className="icon-success" />
                    <p className="stat-value">{formatCurrency(data.total_collected)}</p>
                    <p className="stat-label">Collected</p>
                </div>
                <div className="report-stat-card warning">
                    <ArrowCounterClockwise size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{formatCurrency(data.total_refunded)}</p>
                    <p className="stat-label">Refunded</p>
                </div>
                <div className="report-stat-card">
                    <CreditCard size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{formatCurrency(data.net_collected)}</p>
                    <p className="stat-label">Net Collected</p>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Payments Overview</h2>
                        <p className="text-secondary" style={{ margin: 0 }}>
                            Recent invoice payment activity including Stripe card payments, manual entries, and refunds.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-success">
                            <Money size={14} />
                            {formatCurrency(data.total_collected)} collected
                        </span>
                        <span className="badge badge-warning">
                            <ArrowCounterClockwise size={14} />
                            {formatCurrency(data.total_refunded)} refunded
                        </span>
                        <span className="badge badge-info">
                            <TrendUp size={14} />
                            {formatCurrency(data.net_collected)} net
                        </span>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Payment Method Breakdown</h2>
                </div>
                <div className="card-body p-0">
                    {data.method_breakdown.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Transactions</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.method_breakdown.map((method) => (
                                    <tr key={method.payment_method}>
                                        <td>
                                            <span className={paymentMethodBadgeClass(method.payment_method)}>
                                                {paymentMethodLabel(method.payment_method)}
                                            </span>
                                        </td>
                                        <td>{method.transactions}</td>
                                        <td>{formatCurrency(method.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No payment methods" description="No payment activity was found for the selected period." />
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Recent Transactions</h2>
                </div>
                <div className="card-body p-0">
                    {data.transactions.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Client</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.transactions.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-medium">{item.invoice_number}</td>
                                        <td>{item.client_name}</td>
                                        <td>
                                            <span className={paymentTypeBadgeClass(item.payment_type)}>
                                                {paymentTypeLabel(item.payment_type)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={paymentMethodBadgeClass(item.payment_method)}>
                                                {paymentMethodLabel(item.payment_method)}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(item.amount)}</td>
                                        <td>{formatDate(item.payment_date)}</td>
                                        <td>{item.reference_number || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No transactions" description="No payment transactions were found for the selected period." />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
