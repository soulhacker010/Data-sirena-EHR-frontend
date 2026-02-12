import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    ArrowLeft,
    Download,
    FunnelSimple,
    ChartBar,
    Clock,
    Users,
    CalendarCheck
} from '@phosphor-icons/react'

// Mock session summary data
const mockSessionData = {
    totalSessions: 156,
    totalHours: 312,
    totalUnits: 1248,
    uniqueClients: 24,
    completedNotes: 142,
    averageSessionLength: 2.0
}

const mockProviderBreakdown = [
    { provider: 'Dr. Amanda Wilson', sessions: 48, hours: 96, units: 384, clients: 8, completionRate: 94 },
    { provider: 'Jessica Martinez', sessions: 42, hours: 84, units: 336, clients: 7, completionRate: 88 },
    { provider: 'Dr. Robert Kim', sessions: 36, hours: 72, units: 288, clients: 6, completionRate: 97 },
    { provider: 'Maria Santos', sessions: 30, hours: 60, units: 240, clients: 5, completionRate: 90 }
]

const mockServiceBreakdown = [
    { code: '97153', name: 'Adaptive Behavior Treatment', sessions: 98, hours: 196, units: 784 },
    { code: '97155', name: 'Behavior Modification', sessions: 32, hours: 64, units: 256 },
    { code: '97156', name: 'Family Training', sessions: 18, hours: 36, units: 144 },
    { code: '97151', name: 'Assessment', sessions: 8, hours: 16, units: 64 }
]

const providers = ['All Providers', 'Dr. Amanda Wilson', 'Jessica Martinez', 'Dr. Robert Kim', 'Maria Santos']
const locations = ['All Locations', 'Main Office', 'North Clinic', 'South Branch']

export default function SessionSummaryReportPage() {
    const navigate = useNavigate()
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterProvider, setFilterProvider] = useState('All Providers')
    const [filterLocation, setFilterLocation] = useState('All Locations')

    const handleExportCSV = () => {
        const headers = ['Provider', 'Sessions', 'Hours', 'Units', 'Clients', 'Completion Rate']
        const rows = mockProviderBreakdown.map(p => [
            p.provider,
            p.sessions,
            p.hours,
            p.units,
            p.clients,
            `${p.completionRate}%`
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session_summary_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-content">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} />
                        Back to Reports
                    </button>
                    <h1 className="page-title">Session Summary Report</h1>
                    <p className="page-subtitle">Overview of sessions, hours, and provider productivity</p>
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
                    <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
                        {providers.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                        {locations.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="report-summary-grid-4">
                <div className="report-stat-card">
                    <div className="report-stat-icon blue">
                        <CalendarCheck size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{mockSessionData.totalSessions}</span>
                        <span className="report-stat-label">Total Sessions</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon teal">
                        <Clock size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{mockSessionData.totalHours}</span>
                        <span className="report-stat-label">Total Hours</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon green">
                        <ChartBar size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{mockSessionData.totalUnits}</span>
                        <span className="report-stat-label">Total Units</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon purple">
                        <Users size={24} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <span className="report-stat-value">{mockSessionData.uniqueClients}</span>
                        <span className="report-stat-label">Unique Clients</span>
                    </div>
                </div>
            </div>

            {/* Provider Breakdown */}
            <div className="card report-section">
                <h3 className="report-section-title">By Provider</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Provider</th>
                            <th>Sessions</th>
                            <th>Hours</th>
                            <th>Units</th>
                            <th>Clients</th>
                            <th>Note Completion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockProviderBreakdown.map(provider => (
                            <tr key={provider.provider}>
                                <td><strong>{provider.provider}</strong></td>
                                <td>{provider.sessions}</td>
                                <td>{provider.hours}</td>
                                <td>{provider.units}</td>
                                <td>{provider.clients}</td>
                                <td>
                                    <div className="completion-bar-wrapper">
                                        <div className="completion-bar-container">
                                            <div
                                                className={`completion-bar ${provider.completionRate >= 90 ? 'completion-good' : provider.completionRate >= 80 ? 'completion-warning' : 'completion-poor'}`}
                                                style={{ width: `${provider.completionRate}%` }}
                                            />
                                        </div>
                                        <span className="completion-percent">{provider.completionRate}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Service Breakdown */}
            <div className="card report-section">
                <h3 className="report-section-title">By Service Code</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Service Name</th>
                            <th>Sessions</th>
                            <th>Hours</th>
                            <th>Units</th>
                            <th>% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockServiceBreakdown.map(service => (
                            <tr key={service.code}>
                                <td><span className="service-code-badge">{service.code}</span></td>
                                <td>{service.name}</td>
                                <td>{service.sessions}</td>
                                <td>{service.hours}</td>
                                <td>{service.units}</td>
                                <td>
                                    {Math.round((service.sessions / mockSessionData.totalSessions) * 100)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    )
}
