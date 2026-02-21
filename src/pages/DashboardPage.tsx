import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { useAuth } from '../context'
import { dashboardApi } from '../api'
import toast from 'react-hot-toast'
import type { DashboardStats, DashboardAppointment } from '../types'
import {
    UsersThree,
    CalendarCheck,
    FileText,
    Warning,
    TrendUp,
    Clock,
    CalendarPlus,
    UserPlus,
    NotePencil,
    PaperPlaneTilt,
    CurrencyDollar,
    Receipt,
    CheckCircle
} from '@phosphor-icons/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageSkeleton } from '../components/ui'

// Calendar data (static, UI only)
const calendarDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getCalendarDates() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7 // Monday=0
    const dates: { day: number; otherMonth?: boolean; today?: boolean }[] = []

    // Previous month fill
    const prevLast = new Date(year, month, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
        dates.push({ day: prevLast - i, otherMonth: true })
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        dates.push({ day: d, today: d === now.getDate() })
    }
    // Next month fill
    const remainder = 7 - (dates.length % 7)
    if (remainder < 7) {
        for (let d = 1; d <= remainder; d++) {
            dates.push({ day: d, otherMonth: true })
        }
    }
    return dates
}

function getMonthName() {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Format time from ISO string
function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Appointment avatar colors
const avatarColors = [
    'bg-teal-100 text-teal-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
]

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await dashboardApi.getStats()
                setStats(data)
            } catch (err: any) {
                const message = err?.response?.data?.detail || 'Failed to load dashboard data'
                setError(message)
                toast.error(message)
            } finally {
                setIsLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    if (error || !stats) {
        return (
            <DashboardLayout>
                <div className="page-header">
                    <h1 className="page-title">Dashboard</h1>
                </div>
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Warning size={48} weight="fill" style={{ color: '#DC2626', margin: '0 auto 1rem' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748B' }}>
                            {error || 'Unable to load dashboard data'}
                        </p>
                        <button
                            className="auth-submit-btn"
                            style={{ marginTop: '1rem', maxWidth: '200px' }}
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    const calendarDates = getCalendarDates()
    const billing = stats.billing_overview

    return (
        <DashboardLayout>
            {/* Welcome Header */}
            <div className="page-header">
                <h1 className="page-title">
                    Welcome back{user ? `, ${user.first_name}` : ''}
                </h1>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/clients')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Total Clients</p>
                        <p className="stat-card-value">{stats.total_clients}</p>
                        <div className="stat-card-trend up">
                            <TrendUp size={14} weight="bold" />
                            <span>Active</span>
                        </div>
                    </div>
                    <div className="stat-card-icon teal">
                        <UsersThree size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Sessions This Month</p>
                        <p className="stat-card-value">{stats.sessions_this_month}</p>
                        <div className="stat-card-trend up">
                            <TrendUp size={14} weight="bold" />
                            <span>This month</span>
                        </div>
                    </div>
                    <div className="stat-card-icon yellow">
                        <CalendarCheck size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/notes')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Pending Notes</p>
                        <p className="stat-card-value">{stats.pending_notes}</p>
                        <div className="stat-card-trend down">
                            <Clock size={14} weight="fill" />
                            <span>Needs attention</span>
                        </div>
                    </div>
                    <div className="stat-card-icon blue">
                        <FileText size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/billing')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Revenue MTD</p>
                        <p className="stat-card-value">${stats.revenue_mtd.toLocaleString()}</p>
                        <div className="stat-card-trend up">
                            <CurrencyDollar size={14} weight="bold" />
                            <span>This month</span>
                        </div>
                    </div>
                    <div className="stat-card-icon purple">
                        <CurrencyDollar size={22} weight="fill" />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => navigate('/calendar')}>
                    <CalendarPlus size={20} weight="fill" />
                    <span>New Appointment</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/clients?action=add')}>
                    <UserPlus size={20} weight="fill" />
                    <span>Add Client</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/notes/new')}>
                    <NotePencil size={20} weight="fill" />
                    <span>Create Note</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/billing?tab=claims')}>
                    <PaperPlaneTilt size={20} weight="fill" />
                    <span>Submit Claims</span>
                </button>
            </div>

            {/* Main Grid - Chart + Calendar/Appointments */}
            <div className="dashboard-grid">
                {/* Left: Billing Summary */}
                <div className="space-y-6">
                    {/* Billing Summary */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Billing Summary</h2>
                            <span className="text-sm text-gray-500 font-semibold">This Month</span>
                        </div>
                        <div className="card-body">
                            <div className="billing-grid">
                                <div className="billing-item" onClick={() => navigate('/billing')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon teal">
                                        <CurrencyDollar size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Revenue MTD</p>
                                        <p className="billing-item-value">${stats.revenue_mtd.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=claims')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon yellow">
                                        <Receipt size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Invoices Pending</p>
                                        <p className="billing-item-value">{billing.invoices_pending}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=claims')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon green">
                                        <CheckCircle size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Claims Submitted</p>
                                        <p className="billing-item-value">{billing.claims_submitted}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=claims')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon red">
                                        <Warning size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Claims Denied</p>
                                        <p className="billing-item-value">{billing.claims_denied}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Collections Rate */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Collections Rate</h2>
                        </div>
                        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0D9488' }}>
                                {billing.collections_rate}%
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>
                                of billed amount collected this month
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Calendar + Appointments */}
                <div className="space-y-6">
                    {/* Mini Calendar */}
                    <div className="card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
                        <div className="card-body">
                            <p className="mini-calendar-header">{getMonthName()}</p>
                            <div className="mini-calendar-grid">
                                {calendarDays.map((day, i) => (
                                    <div key={i} className="mini-calendar-day-label">{day}</div>
                                ))}
                                {calendarDates.map((date, i) => (
                                    <div
                                        key={i}
                                        className={`mini-calendar-day ${date.today ? 'today' : ''} ${date.otherMonth ? 'other-month' : ''}`}
                                    >
                                        {date.day}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Appointments */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Upcoming Appointments</h2>
                        </div>
                        <div className="card-body pt-0">
                            {stats.upcoming_appointments.length === 0 ? (
                                <p style={{ color: '#94A3B8', fontWeight: 600, textAlign: 'center', padding: '2rem 0' }}>
                                    No upcoming appointments
                                </p>
                            ) : (
                                stats.upcoming_appointments.map((apt: DashboardAppointment, idx: number) => (
                                    <div
                                        key={apt.id}
                                        className="appointment-item"
                                        onClick={() => navigate('/calendar')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className={`appointment-avatar ${avatarColors[idx % avatarColors.length]}`}>
                                            {apt.client_name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="appointment-info">
                                            <p className="appointment-name">{apt.client_name}</p>
                                            <p className="appointment-service">{apt.service_code} — {apt.provider_name}</p>
                                        </div>
                                        <span className="appointment-time">• {formatTime(apt.start_time)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
