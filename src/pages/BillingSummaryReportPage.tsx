import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { BillingSummaryReport } from '../api/reports'
import {
    ArrowLeft,
    Download,
    Money,
    CreditCard,
    Clock,
    WarningCircle,
    CheckCircle,
    CalendarBlank
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function BillingSummaryReportPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<BillingSummaryReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getBillingSummary({
                start_date: dateFrom || undefined,
                end_date: dateTo || undefined,
            })
            setData(report)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load report')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadReport()
    }, [])

    const handleExportCSV = () => {
        if (!data) return
        const headers = ['Payer', 'Billed', 'Collected', 'Outstanding']
        const rows = data.payer_breakdown.map(p => [
            p.payer_name,
            formatCurrency(p.billed),
            formatCurrency(p.collected),
            formatCurrency(p.outstanding)
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `billing-summary-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
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
                        <Money size={28} weight="duotone" />
                        Billing Summary Report
                    </h1>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV}>
                    <Download size={18} weight="bold" /> Export CSV
                </button>
            </div>

            {/* Date Filters */}
            <div className="filter-bar">
                <div className="date-filter">
                    <CalendarBlank size={16} />
                    <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span>to</span>
                    <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <button className="btn-secondary btn-sm" onClick={loadReport}>Apply Filters</button>
            </div>

            {/* Summary Stats */}
            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <Money size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{formatCurrency(data.total_billed)}</p>
                    <p className="stat-label">Total Billed</p>
                </div>
                <div className="report-stat-card success">
                    <CreditCard size={24} weight="duotone" className="icon-success" />
                    <p className="stat-value">{formatCurrency(data.total_collected)}</p>
                    <p className="stat-label">Total Collected</p>
                </div>
                <div className="report-stat-card warning">
                    <Clock size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{formatCurrency(data.total_outstanding)}</p>
                    <p className="stat-label">Outstanding</p>
                </div>
                <div className="report-stat-card">
                    <CheckCircle size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.collections_rate.toFixed(1)}%</p>
                    <p className="stat-label">Collection Rate</p>
                </div>
            </div>

            {/* Payer Breakdown */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Payer Breakdown</h2>
                </div>
                <div className="card-body p-0">
                    {data.payer_breakdown.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Payer</th>
                                    <th>Billed</th>
                                    <th>Collected</th>
                                    <th>Outstanding</th>
                                    <th>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.payer_breakdown.map((p, i) => {
                                    const rate = p.billed > 0 ? ((p.collected / p.billed) * 100).toFixed(1) : '0.0'
                                    return (
                                        <tr key={i}>
                                            <td className="font-medium">{p.payer_name}</td>
                                            <td>{formatCurrency(p.billed)}</td>
                                            <td className="text-green-600 font-semibold">{formatCurrency(p.collected)}</td>
                                            <td className={p.outstanding > 0 ? 'text-red-500' : ''}>{formatCurrency(p.outstanding)}</td>
                                            <td>
                                                <div className="auth-progress-inline">
                                                    <div className="auth-progress-bar-sm">
                                                        <div className="auth-progress-fill" style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <span>{rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No payer data" description="No payer breakdown available for the selected period." />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
