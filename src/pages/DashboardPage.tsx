import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    UsersThree,
    CalendarCheck,
    FileText,
    Warning,
    TrendUp,
    TrendDown,
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

// Mock data - Sessions trend (smooth line chart)
const sessionTrendData = [
    { month: 'Jan', sessions: 320 },
    { month: 'Feb', sessions: 380 },
    { month: 'Mar', sessions: 420 },
    { month: 'Apr', sessions: 390 },
    { month: 'May', sessions: 480 },
    { month: 'Jun', sessions: 520 },
    { month: 'Jul', sessions: 490 },
    { month: 'Aug', sessions: 550 },
]

// Today's appointments
const todayAppointments = [
    { id: 1, name: 'Sarah Johnson', service: 'Therapy Session', time: '9:00 AM', color: 'bg-teal-100 text-teal-700' },
    { id: 2, name: 'Michael Chen', service: 'OT Evaluation', time: '10:30 AM', color: 'bg-blue-100 text-blue-700' },
    { id: 3, name: 'Emily Davis', service: 'ABA Treatment', time: '1:00 PM', color: 'bg-purple-100 text-purple-700' },
    { id: 4, name: 'James Wilson', service: 'Speech Therapy', time: '3:00 PM', color: 'bg-amber-100 text-amber-700' },
]

// Calendar data
const calendarDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const calendarDates = [
    { day: 29, otherMonth: true }, { day: 30, otherMonth: true }, { day: 31, otherMonth: true },
    { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 },
    { day: 5 }, { day: 6 }, { day: 7 }, { day: 8, today: true }, { day: 9 }, { day: 10 }, { day: 11 },
    { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }, { day: 18 },
    { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 },
    { day: 26 }, { day: 27 }, { day: 28 }, { day: 1, otherMonth: true }, { day: 2, otherMonth: true }, { day: 3, otherMonth: true }, { day: 4, otherMonth: true },
]

// Pending notes
const pendingNotes = [
    { id: 1, client: 'Michael Chen', date: 'Feb 5, 2026', overdue: 3 },
    { id: 2, client: 'Lisa Thompson', date: 'Feb 4, 2026', overdue: 4 },
    { id: 3, client: 'David Brown', date: 'Feb 6, 2026', overdue: 2 },
]

// Auth alerts
const authAlerts = [
    { id: 1, client: 'Sarah Johnson', service: 'ABA Therapy', used: 32, total: 40 },
    { id: 2, client: 'Emily Davis', service: 'Speech Therapy', used: 22, total: 24 },
]

// Billing data
const billingData = {
    monthlyRevenue: 48750,
    pendingClaims: 12,
    paidThisMonth: 32,
    rejectedClaims: 2
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            {/* Welcome Header */}
            <div className="page-header">
                <h1 className="page-title">Welcome back, Dr. Smith</h1>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/clients')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Total Clients</p>
                        <p className="stat-card-value">127</p>
                        <div className="stat-card-trend up">
                            <TrendUp size={14} weight="bold" />
                            <span>4.6%</span>
                            <span className="text-gray-400 font-normal ml-1">vs last week</span>
                        </div>
                    </div>
                    <div className="stat-card-icon teal">
                        <UsersThree size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Today's Appointments</p>
                        <p className="stat-card-value">{todayAppointments.length}</p>
                        <div className="stat-card-trend up">
                            <TrendUp size={14} weight="bold" />
                            <span>11.6%</span>
                            <span className="text-gray-400 font-normal ml-1">scheduled</span>
                        </div>
                    </div>
                    <div className="stat-card-icon yellow">
                        <CalendarCheck size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/notes')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Pending Notes</p>
                        <p className="stat-card-value">{pendingNotes.length}</p>
                        <div className="stat-card-trend down">
                            <TrendDown size={14} weight="bold" />
                            <span>3 overdue</span>
                        </div>
                    </div>
                    <div className="stat-card-icon blue">
                        <FileText size={22} weight="fill" />
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/reports/authorizations')} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-content">
                        <p className="stat-card-label">Auth Alerts</p>
                        <p className="stat-card-value">{authAlerts.length}</p>
                        <div className="stat-card-trend down">
                            <Warning size={14} weight="fill" />
                            <span>Running low</span>
                        </div>
                    </div>
                    <div className="stat-card-icon purple">
                        <Warning size={22} weight="fill" />
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
                {/* Left: Chart + Billing */}
                <div className="space-y-6">
                    {/* Sessions Trend Chart */}
                    <div className="card" onClick={() => navigate('/reports/session-summary')} style={{ cursor: 'pointer' }}>
                        <div className="card-header">
                            <h2 className="card-title">Session Trend</h2>
                            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white" onClick={(e) => e.stopPropagation()}>
                                <option>Last 8 months</option>
                                <option>Last 12 months</option>
                                <option>This year</option>
                            </select>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sessionTrendData}>
                                        <defs>
                                            <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'white',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                fontWeight: 600
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sessions"
                                            stroke="#0D9488"
                                            strokeWidth={3}
                                            fill="url(#sessionGradient)"
                                            name="Sessions"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

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
                                        <p className="billing-item-label">Monthly Revenue</p>
                                        <p className="billing-item-value">${billingData.monthlyRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=claims')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon yellow">
                                        <Receipt size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Pending Claims</p>
                                        <p className="billing-item-value">{billingData.pendingClaims}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=payments')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon green">
                                        <CheckCircle size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Paid This Month</p>
                                        <p className="billing-item-value">{billingData.paidThisMonth}</p>
                                    </div>
                                </div>
                                <div className="billing-item" onClick={() => navigate('/billing?tab=claims')} style={{ cursor: 'pointer' }}>
                                    <div className="billing-item-icon red">
                                        <Warning size={20} weight="fill" />
                                    </div>
                                    <div>
                                        <p className="billing-item-label">Rejected Claims</p>
                                        <p className="billing-item-value">{billingData.rejectedClaims}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Calendar + Appointments */}
                <div className="space-y-6">
                    {/* Mini Calendar */}
                    <div className="card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
                        <div className="card-body">
                            <p className="mini-calendar-header">February 2026</p>
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
                            {todayAppointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className="appointment-item"
                                    onClick={() => navigate(`/clients/${apt.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={`appointment-avatar ${apt.color}`}>
                                        {apt.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="appointment-info">
                                        <p className="appointment-name">{apt.name}</p>
                                        <p className="appointment-service">{apt.service}</p>
                                    </div>
                                    <span className="appointment-time">• {apt.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid - Pending Notes + Auth Alerts */}
            <div className="dashboard-grid-full">
                {/* Pending Notes */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Pending Notes</h2>
                        <span className="badge badge-warning">{pendingNotes.length} Overdue</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Session Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingNotes.map((note) => (
                                <tr key={note.id} onClick={() => navigate(`/clients/${note.id}`)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {note.client.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span className="font-semibold text-teal-600 hover:text-teal-700">{note.client}</span>
                                        </div>
                                    </td>
                                    <td className="font-medium">{note.date}</td>
                                    <td>
                                        <div className="flex items-center gap-1 text-amber-600 font-bold text-xs">
                                            <Clock size={14} weight="fill" />
                                            {note.overdue}d overdue
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="text-teal-600 font-bold text-sm hover:text-teal-700"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/notes/new?client=${note.client}`); }}
                                        >
                                            Complete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Auth Alerts */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Authorization Alerts</h2>
                        <span className="badge badge-error">{authAlerts.length} Critical</span>
                    </div>
                    <div className="card-body">
                        {authAlerts.map((auth) => {
                            const percent = Math.round((auth.used / auth.total) * 100)
                            return (
                                <div
                                    key={auth.id}
                                    className="mb-5 last:mb-0"
                                    onClick={() => navigate(`/clients/${auth.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="font-bold text-teal-600 hover:text-teal-700">{auth.client}</p>
                                            <p className="text-xs text-gray-500 font-medium">{auth.service}</p>
                                        </div>
                                        <span className={`text-sm font-bold ${percent >= 80 ? 'text-red-500' : 'text-teal-600'}`}>
                                            {percent}% used
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${percent >= 80 ? 'bg-red-500' : 'bg-teal-500'}`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-semibold">
                                        <span>{auth.used} / {auth.total} units</span>
                                        <span>{auth.total - auth.used} remaining</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
