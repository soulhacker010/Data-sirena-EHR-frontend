import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    ArrowLeft,
    Download,
    FunnelSimple,
    Money,
    CreditCard,
    Clock,
    WarningCircle,
    CheckCircle
} from '@phosphor-icons/react'

// Mock billing summary data
const mockBillingData = {
    totalBilled: 125600,
    totalCollected: 98400,
    totalOutstanding: 27200,
    totalWriteOffs: 3200,
    collectionRate: 78.3,
    avgDaysToPayment: 28
}

const mockPayerBreakdown = [
    { payer: 'Blue Cross Blue Shield', billed: 45000, collected: 38250, outstanding: 6750, rate: 85 },
    { payer: 'Aetna', billed: 32000, collected: 24000, outstanding: 8000, rate: 75 },
    { payer: 'United Healthcare', billed: 28600, collected: 22880, outstanding: 5720, rate: 80 },
    { payer: 'Cigna', billed: 12000, collected: 8400, outstanding: 3600, rate: 70 },
    { payer: 'Medicaid', billed: 8000, collected: 4870, outstanding: 3130, rate: 61 }
]

const mockAgingReport = [
    { range: '0-30 days', count: 24, amount: 12400 },
    { range: '31-60 days', count: 12, amount: 6800 },
    { range: '61-90 days', count: 8, amount: 4500 },
    { range: '90+ days', count: 5, amount: 3500 }
]

export default function BillingSummaryReportPage() {
    const navigate = useNavigate()
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterPayer, setFilterPayer] = useState('all')

    const payers = ['all', ...mockPayerBreakdown.map(p => p.payer)]

    const handleExportCSV = () => {
        const headers = ['Payer', 'Billed', 'Collected', 'Outstanding', 'Collection Rate']
        const rows = mockPayerBreakdown.map(p => [
            p.payer,
            `$${p.billed.toLocaleString()}`,
            `$${p.collected.toLocaleString()}`,
            `$${p.outstanding.toLocaleString()}`,
            `${p.rate}%`
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `billing_summary_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const getAgingColor = (range: string) => {
        if (range === '0-30 days') return 'aging-current'
        if (range === '31-60 days') return 'aging-warning'
        if (range === '61-90 days') return 'aging-danger'
        return 'aging-critical'
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-content">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} />
                        Back to Reports
                    </button>
                    <h1 className="page-title">Billing Summary Report</h1>
                    <p className="page-subtitle">Revenue, collections, and accounts receivable overview</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="report-filters">
                <div className="filter-group">
                    <label className="filter-label">From:</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="form-input-basic filter-date"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">To:</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="form-input-basic filter-date"
                    />
                </div>
                <div className="filter-group">
                    <FunnelSimple size={18} />
                    <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)}>
                        <option value="all">All Payers</option>
                        {payers.filter(p => p !== 'all').map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="report-summary-grid-4">
                <div className="report-stat-card">
                    <div className="report-stat-icon blue">
                        <Money size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{formatCurrency(mockBillingData.totalBilled)}</span>
                        <span className="report-stat-label">Total Billed</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon green">
                        <CheckCircle size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{formatCurrency(mockBillingData.totalCollected)}</span>
                        <span className="report-stat-label">Total Collected</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon orange">
                        <Clock size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{formatCurrency(mockBillingData.totalOutstanding)}</span>
                        <span className="report-stat-label">Outstanding</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon teal">
                        <CreditCard size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{mockBillingData.collectionRate}%</span>
                        <span className="report-stat-label">Collection Rate</span>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="report-two-cols">
                {/* Payer Breakdown */}
                <div className="card report-section">
                    <h3 className="report-section-title">By Payer</h3>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Payer</th>
                                <th>Billed</th>
                                <th>Collected</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockPayerBreakdown.map(payer => (
                                <tr key={payer.payer}>
                                    <td><strong>{payer.payer}</strong></td>
                                    <td>{formatCurrency(payer.billed)}</td>
                                    <td className="text-success">{formatCurrency(payer.collected)}</td>
                                    <td>
                                        <span className={`rate-badge ${payer.rate >= 80 ? 'rate-good' : payer.rate >= 70 ? 'rate-ok' : 'rate-poor'}`}>
                                            {payer.rate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Aging Report */}
                <div className="card report-section">
                    <h3 className="report-section-title">Accounts Receivable Aging</h3>
                    <div className="aging-list">
                        {mockAgingReport.map(aging => (
                            <div key={aging.range} className={`aging-item ${getAgingColor(aging.range)}`}>
                                <div className="aging-header">
                                    <span className="aging-range">{aging.range}</span>
                                    <span className="aging-count">{aging.count} invoices</span>
                                </div>
                                <div className="aging-amount">{formatCurrency(aging.amount)}</div>
                                <div className="aging-bar-container">
                                    <div
                                        className="aging-bar"
                                        style={{ width: `${(aging.amount / mockBillingData.totalOutstanding) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="aging-total">
                        <div className="aging-total-row">
                            <WarningCircle size={18} />
                            <span>Total Outstanding:</span>
                            <strong>{formatCurrency(mockBillingData.totalOutstanding)}</strong>
                        </div>
                        <div className="aging-avg-days">
                            Average days to payment: <strong>{mockBillingData.avgDaysToPayment} days</strong>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
