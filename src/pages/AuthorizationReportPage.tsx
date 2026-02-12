import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    ArrowLeft,
    Download,
    FunnelSimple,
    MagnifyingGlass,
    Warning,
    CheckCircle,
    Clock,
    ArrowsClockwise
} from '@phosphor-icons/react'

// Mock authorization data
const mockAuthorizations = [
    {
        id: 1,
        clientName: 'Sarah Johnson',
        clientId: '1',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        payer: 'Blue Cross',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        totalUnits: 480,
        usedUnits: 384,
        remainingUnits: 96,
        percentUsed: 80,
        status: 'active'
    },
    {
        id: 2,
        clientName: 'Michael Chen',
        clientId: '2',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        payer: 'Aetna',
        startDate: '2026-01-15',
        endDate: '2026-07-15',
        totalUnits: 520,
        usedUnits: 494,
        remainingUnits: 26,
        percentUsed: 95,
        status: 'active'
    },
    {
        id: 3,
        clientName: 'Emma Davis',
        clientId: '3',
        serviceCode: '97155',
        serviceName: 'Behavior Modification',
        payer: 'United Healthcare',
        startDate: '2025-12-01',
        endDate: '2026-05-31',
        totalUnits: 400,
        usedUnits: 200,
        remainingUnits: 200,
        percentUsed: 50,
        status: 'active'
    },
    {
        id: 4,
        clientName: 'James Wilson',
        clientId: '4',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        payer: 'Cigna',
        startDate: '2026-02-01',
        endDate: '2026-08-01',
        totalUnits: 600,
        usedUnits: 120,
        remainingUnits: 480,
        percentUsed: 20,
        status: 'active'
    },
    {
        id: 5,
        clientName: 'Olivia Martinez',
        clientId: '5',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        payer: 'Blue Cross',
        startDate: '2025-11-01',
        endDate: '2026-04-30',
        totalUnits: 480,
        usedUnits: 480,
        remainingUnits: 0,
        percentUsed: 100,
        status: 'exhausted'
    },
    {
        id: 6,
        clientName: 'Liam Brown',
        clientId: '6',
        serviceCode: '97156',
        serviceName: 'Family Training',
        payer: 'Medicaid',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        totalUnits: 120,
        usedUnits: 60,
        remainingUnits: 60,
        percentUsed: 50,
        status: 'expiring_soon'
    }
]

export default function AuthorizationReportPage() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPayer, setFilterPayer] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterService, setFilterService] = useState('all')

    // Get unique payers and services for filter dropdowns
    const payers = [...new Set(mockAuthorizations.map(a => a.payer))]
    const services = [...new Set(mockAuthorizations.map(a => a.serviceCode))]

    // Filter authorizations
    const filteredAuths = mockAuthorizations.filter(auth => {
        const matchesSearch = auth.clientName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPayer = filterPayer === 'all' || auth.payer === filterPayer
        const matchesService = filterService === 'all' || auth.serviceCode === filterService
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'critical' && auth.percentUsed >= 95) ||
            (filterStatus === 'warning' && auth.percentUsed >= 80 && auth.percentUsed < 95) ||
            (filterStatus === 'healthy' && auth.percentUsed < 80)

        return matchesSearch && matchesPayer && matchesService && matchesStatus
    })

    const getUsageClass = (percent: number) => {
        if (percent >= 95) return 'usage-critical'
        if (percent >= 80) return 'usage-warning'
        return 'usage-healthy'
    }

    const getStatusIcon = (percent: number) => {
        if (percent >= 95) return <Warning size={16} weight="fill" className="text-error" />
        if (percent >= 80) return <Clock size={16} weight="fill" className="text-warning" />
        return <CheckCircle size={16} weight="fill" className="text-success" />
    }

    const handleExportCSV = () => {
        // Create CSV content
        const headers = ['Client', 'Service Code', 'Service Name', 'Payer', 'Start Date', 'End Date', 'Total Units', 'Used Units', 'Remaining', '% Used']
        const rows = filteredAuths.map(auth => [
            auth.clientName,
            auth.serviceCode,
            auth.serviceName,
            auth.payer,
            auth.startDate,
            auth.endDate,
            auth.totalUnits,
            auth.usedUnits,
            auth.remainingUnits,
            auth.percentUsed + '%'
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `authorization_report_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const handleRenew = (authId: number) => {
        // Navigate to authorization detail/renew page 
        navigate(`/reports/authorizations?renew=${authId}`)
    }

    // Summary stats
    const totalAuths = filteredAuths.length
    const criticalAuths = filteredAuths.filter(a => a.percentUsed >= 95).length
    const warningAuths = filteredAuths.filter(a => a.percentUsed >= 80 && a.percentUsed < 95).length

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-content">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} />
                        Back to Reports
                    </button>
                    <h1 className="page-title">Authorization Usage Report</h1>
                    <p className="page-subtitle">Monitor authorization utilization across all clients</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="report-summary-cards">
                <div className="report-summary-card">
                    <span className="summary-label">Total Authorizations</span>
                    <span className="summary-value">{totalAuths}</span>
                </div>
                <div className="report-summary-card warning">
                    <span className="summary-label">
                        <Clock size={16} weight="fill" />
                        High Usage (80-94%)
                    </span>
                    <span className="summary-value">{warningAuths}</span>
                </div>
                <div className="report-summary-card critical">
                    <span className="summary-label">
                        <Warning size={16} weight="fill" />
                        Critical (95%+)
                    </span>
                    <span className="summary-value">{criticalAuths}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="report-filters">
                <div className="search-box">
                    <MagnifyingGlass size={18} />
                    <input
                        type="text"
                        placeholder="Search by client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <FunnelSimple size={18} />
                    <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)}>
                        <option value="all">All Payers</option>
                        {payers.map(payer => (
                            <option key={payer} value={payer}>{payer}</option>
                        ))}
                    </select>

                    <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
                        <option value="all">All Services</option>
                        {services.map(service => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>

                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="critical">Critical (95%+)</option>
                        <option value="warning">Warning (80-94%)</option>
                        <option value="healthy">Healthy (&lt;80%)</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Client</th>
                            <th>Service</th>
                            <th>Payer</th>
                            <th>Period</th>
                            <th>Total Units</th>
                            <th>Used</th>
                            <th>Remaining</th>
                            <th>Usage</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAuths.map(auth => (
                            <tr key={auth.id} className={getUsageClass(auth.percentUsed)}>
                                <td>{getStatusIcon(auth.percentUsed)}</td>
                                <td>
                                    <a
                                        href={`/clients/${auth.clientId}`}
                                        className="link-primary"
                                    >
                                        {auth.clientName}
                                    </a>
                                </td>
                                <td>
                                    <div>
                                        <strong>{auth.serviceCode}</strong>
                                        <span className="text-muted block">{auth.serviceName}</span>
                                    </div>
                                </td>
                                <td>{auth.payer}</td>
                                <td>
                                    <span className="text-sm">
                                        {new Date(auth.startDate).toLocaleDateString()} - {new Date(auth.endDate).toLocaleDateString()}
                                    </span>
                                </td>
                                <td>{auth.totalUnits}</td>
                                <td>{auth.usedUnits}</td>
                                <td>{auth.remainingUnits}</td>
                                <td>
                                    <div className="usage-bar-container">
                                        <div
                                            className={`usage-bar ${getUsageClass(auth.percentUsed)}`}
                                            style={{ width: `${Math.min(auth.percentUsed, 100)}%` }}
                                        />
                                        <span className="usage-percent">{auth.percentUsed}%</span>
                                    </div>
                                </td>
                                <td>
                                    {auth.percentUsed >= 80 && (
                                        <button
                                            className="btn-sm btn-outline"
                                            onClick={() => handleRenew(auth.id)}
                                        >
                                            <ArrowsClockwise size={14} />
                                            Renew
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredAuths.length === 0 && (
                    <div className="empty-state">
                        <p>No authorizations match your filters</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
