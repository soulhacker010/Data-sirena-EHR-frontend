import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
    Plus,
    CaretLeft,
    CaretRight,
    FunnelSimple,
    CaretDown,
    ArrowsClockwise
} from '@phosphor-icons/react'
import { Modal, ConfirmDialog } from '../components/ui'

// Appointment type
interface Appointment {
    id: string
    title: string
    start: string
    end: string
    clientId: number
    clientName: string
    providerId: number
    providerName: string
    locationId: number
    locationName: string
    type: 'aba_session' | 'parent_training' | 'assessment' | 'supervision'
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    cptCode: string
    units: number
    authorizationId?: number
    notes?: string
    isRecurring?: boolean
    recurringPattern?: string
}

// Generate mock data for current week
const getThisWeekDates = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        return date.toISOString().split('T')[0]
    })
}

const weekDates = getThisWeekDates()

// Mock appointments for this week
const initialAppointments: Appointment[] = [
    {
        id: '1',
        title: 'Sarah Johnson - ABA Session',
        start: `${weekDates[0]}T09:00:00`,
        end: `${weekDates[0]}T11:00:00`,
        clientId: 1,
        clientName: 'Sarah Johnson',
        providerId: 1,
        providerName: 'Dr. Smith',
        locationId: 1,
        locationName: 'Main Office',
        type: 'aba_session',
        status: 'scheduled',
        cptCode: '97153',
        units: 8
    },
    {
        id: '2',
        title: 'Michael Chen - ABA Session',
        start: `${weekDates[0]}T13:00:00`,
        end: `${weekDates[0]}T15:00:00`,
        clientId: 2,
        clientName: 'Michael Chen',
        providerId: 1,
        providerName: 'Dr. Smith',
        locationId: 2,
        locationName: 'North Clinic',
        type: 'aba_session',
        status: 'scheduled',
        cptCode: '97153',
        units: 8
    },
    {
        id: '3',
        title: 'Emily Davis - Parent Training',
        start: `${weekDates[1]}T10:00:00`,
        end: `${weekDates[1]}T11:00:00`,
        clientId: 3,
        clientName: 'Emily Davis',
        providerId: 2,
        providerName: 'Dr. Williams',
        locationId: 1,
        locationName: 'Main Office',
        type: 'parent_training',
        status: 'scheduled',
        cptCode: '97156',
        units: 4
    },
    {
        id: '4',
        title: 'James Wilson - ABA Session',
        start: `${weekDates[1]}T14:00:00`,
        end: `${weekDates[1]}T16:00:00`,
        clientId: 4,
        clientName: 'James Wilson',
        providerId: 1,
        providerName: 'Dr. Smith',
        locationId: 3,
        locationName: 'South Branch',
        type: 'aba_session',
        status: 'cancelled',
        cptCode: '97153',
        units: 8
    },
    {
        id: '5',
        title: 'Lisa Thompson - Assessment',
        start: `${weekDates[2]}T09:00:00`,
        end: `${weekDates[2]}T12:00:00`,
        clientId: 5,
        clientName: 'Lisa Thompson',
        providerId: 3,
        providerName: 'Dr. Martinez',
        locationId: 1,
        locationName: 'Main Office',
        type: 'assessment',
        status: 'scheduled',
        cptCode: '97151',
        units: 12
    },
    {
        id: '6',
        title: 'Sarah Johnson - ABA Session',
        start: `${weekDates[2]}T14:00:00`,
        end: `${weekDates[2]}T16:00:00`,
        clientId: 1,
        clientName: 'Sarah Johnson',
        providerId: 1,
        providerName: 'Dr. Smith',
        locationId: 1,
        locationName: 'Main Office',
        type: 'aba_session',
        status: 'completed',
        cptCode: '97153',
        units: 8
    },
    {
        id: '7',
        title: 'David Brown - ABA Session',
        start: `${weekDates[3]}T09:00:00`,
        end: `${weekDates[3]}T11:00:00`,
        clientId: 6,
        clientName: 'David Brown',
        providerId: 2,
        providerName: 'Dr. Williams',
        locationId: 2,
        locationName: 'North Clinic',
        type: 'aba_session',
        status: 'no_show',
        cptCode: '97153',
        units: 8
    },
    {
        id: '8',
        title: 'Michael Chen - Parent Training',
        start: `${weekDates[4]}T10:00:00`,
        end: `${weekDates[4]}T11:30:00`,
        clientId: 2,
        clientName: 'Michael Chen',
        providerId: 1,
        providerName: 'Dr. Smith',
        locationId: 1,
        locationName: 'Main Office',
        type: 'parent_training',
        status: 'scheduled',
        cptCode: '97156',
        units: 6
    },
]

// Mock providers for filter
const providers = [
    { id: 0, name: 'All Providers', npi: '' },
    { id: 1, name: 'Dr. Smith', npi: '1234567890' },
    { id: 2, name: 'Dr. Williams', npi: '2345678901' },
    { id: 3, name: 'Dr. Martinez', npi: '3456789012' },
]

// NPI list for admin filter
const npiList = [
    { npi: '', name: 'All NPIs' },
    { npi: '1234567890', name: '1234567890 (Dr. Smith)' },
    { npi: '2345678901', name: '2345678901 (Dr. Williams)' },
    { npi: '3456789012', name: '3456789012 (Dr. Martinez)' },
]

// Mock locations for filter
const locations = [
    { id: 0, name: 'All Locations' },
    { id: 1, name: 'Main Office' },
    { id: 2, name: 'North Clinic' },
    { id: 3, name: 'South Branch' },
]

// Mock clients for scheduling
const clients = [
    { id: 1, name: 'Sarah Johnson' },
    { id: 2, name: 'Michael Chen' },
    { id: 3, name: 'Emily Davis' },
    { id: 4, name: 'James Wilson' },
    { id: 5, name: 'Lisa Thompson' },
    { id: 6, name: 'David Brown' },
]

// Mock authorizations (per client)
const authorizations = [
    { id: 1, clientId: 1, name: 'Auth #12345 - 120 units remaining', remaining: 120 },
    { id: 2, clientId: 1, name: 'Auth #12346 - 40 units remaining', remaining: 40 },
    { id: 3, clientId: 2, name: 'Auth #22345 - 80 units remaining', remaining: 80 },
    { id: 4, clientId: 3, name: 'Auth #32345 - 60 units remaining', remaining: 60 },
    { id: 5, clientId: 4, name: 'Auth #42345 - 100 units remaining', remaining: 100 },
    { id: 6, clientId: 5, name: 'Auth #52345 - 50 units remaining', remaining: 50 },
    { id: 7, clientId: 6, name: 'Auth #62345 - 90 units remaining', remaining: 90 },
]

// CPT Codes
const cptCodes = [
    { code: '97151', description: 'Behavior Assessment', defaultUnits: 4 },
    { code: '97153', description: 'Adaptive Behavior Treatment', defaultUnits: 8 },
    { code: '97155', description: 'Behavior Treatment with Modification', defaultUnits: 4 },
    { code: '97156', description: 'Family Adaptive Behavior Treatment', defaultUnits: 4 },
    { code: '97157', description: 'Multiple-Family Group', defaultUnits: 4 },
    { code: '97158', description: 'Group Adaptive Behavior Treatment', defaultUnits: 4 },
]

// Status color mapping
const getStatusColor = (status: string) => {
    switch (status) {
        case 'scheduled': return '#0D9488' // teal
        case 'completed': return '#059669' // green
        case 'cancelled': return '#DC2626' // red
        case 'no_show': return '#D97706' // amber
        default: return '#0D9488'
    }
}

// Session type labels
const sessionTypeLabels: Record<string, string> = {
    aba_session: 'ABA Session',
    parent_training: 'Parent Training',
    assessment: 'Assessment',
    supervision: 'Supervision'
}

export default function CalendarPage() {
    const [searchParams] = useSearchParams()
    const calendarRef = useRef<FullCalendar>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
    const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek')
    const [providerFilter, setProviderFilter] = useState(0)
    const [locationFilter, setLocationFilter] = useState(0)
    const [npiFilter, setNpiFilter] = useState('')
    const [isAdmin] = useState(true) // Mock admin status - in real app check user role
    const [calendarTitle, setCalendarTitle] = useState('')

    // Modal states
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

    // New appointment form
    const [formData, setFormData] = useState({
        clientId: '',
        providerId: '',
        locationId: '',
        type: 'aba_session',
        cptCode: '97153',
        units: 8,
        authorizationId: '',
        date: '',
        startTime: '09:00',
        endTime: '11:00',
        notes: '',
        isRecurring: false,
        recurringPattern: 'weekly',
        recurringEndDate: ''
    })

    // Get authorizations for selected client
    const clientAuthorizations = formData.clientId
        ? authorizations.filter(a => a.clientId === Number(formData.clientId))
        : []

    // Check for client preselection from URL
    useEffect(() => {
        const clientId = searchParams.get('client')
        if (clientId) {
            setFormData(prev => ({ ...prev, clientId }))
            setIsScheduleModalOpen(true)
        }
    }, [searchParams])

    // Update calendar title when view changes
    useEffect(() => {
        const updateTitle = () => {
            const api = calendarRef.current?.getApi()
            if (api) {
                setCalendarTitle(api.view.title)
            }
        }
        updateTitle()
    }, [currentView])

    // Loading state
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    // Filter appointments by provider and location
    const filteredAppointments = appointments.filter(apt => {
        const matchesProvider = providerFilter === 0 || apt.providerId === providerFilter
        const matchesLocation = locationFilter === 0 || apt.locationId === locationFilter
        return matchesProvider && matchesLocation
    })

    // Convert to FullCalendar events
    const calendarEvents = filteredAppointments.map(apt => ({
        id: apt.id,
        title: apt.title,
        start: apt.start,
        end: apt.end,
        backgroundColor: getStatusColor(apt.status),
        borderColor: getStatusColor(apt.status),
        extendedProps: apt
    }))

    // Navigate calendar
    const goToToday = () => {
        calendarRef.current?.getApi().today()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
    }
    const goToPrev = () => {
        calendarRef.current?.getApi().prev()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
    }
    const goToNext = () => {
        calendarRef.current?.getApi().next()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
    }

    // Change view
    const changeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
        setCurrentView(view)
        calendarRef.current?.getApi().changeView(view)
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
    }

    // Handle date select (create appointment)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDateSelect = (selectInfo: any) => {
        setIsEditMode(false)
        setFormData({
            clientId: '',
            providerId: '',
            locationId: '',
            type: 'aba_session',
            cptCode: '97153',
            units: 8,
            authorizationId: '',
            date: selectInfo.startStr.split('T')[0],
            startTime: selectInfo.start.toTimeString().slice(0, 5),
            endTime: selectInfo.end.toTimeString().slice(0, 5),
            notes: '',
            isRecurring: false,
            recurringPattern: 'weekly',
            recurringEndDate: ''
        })
        setIsScheduleModalOpen(true)
    }

    // Handle event click (view appointment)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventClick = (clickInfo: any) => {
        const apt = clickInfo.event.extendedProps as Appointment
        setSelectedAppointment({ ...apt, id: clickInfo.event.id })
        setIsViewModalOpen(true)
    }

    // Handle event drag (reschedule)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventDrop = (dropInfo: any) => {
        const event = dropInfo.event
        const apt = event.extendedProps as Appointment

        // Only allow rescheduling if scheduled
        if (apt.status !== 'scheduled') {
            dropInfo.revert()
            return
        }

        setAppointments(prev => prev.map(a =>
            a.id === event.id
                ? {
                    ...a,
                    start: event.startStr,
                    end: event.endStr
                }
                : a
        ))
    }

    // Handle add appointment button
    const handleAddClick = () => {
        setIsEditMode(false)
        const now = new Date()
        setFormData({
            clientId: '',
            providerId: '',
            locationId: '',
            type: 'aba_session',
            cptCode: '97153',
            units: 8,
            authorizationId: '',
            date: now.toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '11:00',
            notes: '',
            isRecurring: false,
            recurringPattern: 'weekly',
            recurringEndDate: ''
        })
        setIsScheduleModalOpen(true)
    }

    // Handle reschedule click
    const handleReschedule = () => {
        if (!selectedAppointment) return
        setIsEditMode(true)
        setFormData({
            clientId: String(selectedAppointment.clientId),
            providerId: String(selectedAppointment.providerId),
            locationId: String(selectedAppointment.locationId),
            type: selectedAppointment.type,
            cptCode: selectedAppointment.cptCode,
            units: selectedAppointment.units,
            authorizationId: selectedAppointment.authorizationId ? String(selectedAppointment.authorizationId) : '',
            date: selectedAppointment.start.split('T')[0],
            startTime: selectedAppointment.start.split('T')[1].slice(0, 5),
            endTime: selectedAppointment.end.split('T')[1].slice(0, 5),
            notes: selectedAppointment.notes || '',
            isRecurring: selectedAppointment.isRecurring || false,
            recurringPattern: selectedAppointment.recurringPattern || 'weekly',
            recurringEndDate: ''
        })
        setIsViewModalOpen(false)
        setIsScheduleModalOpen(true)
    }

    // Handle cancel appointment click
    const handleCancelClick = () => {
        setIsViewModalOpen(false)
        setIsCancelDialogOpen(true)
    }

    // Confirm cancel appointment
    const handleConfirmCancel = () => {
        if (!selectedAppointment) return
        setAppointments(prev => prev.map(apt =>
            apt.id === selectedAppointment.id
                ? { ...apt, status: 'cancelled' as const }
                : apt
        ))
        setIsCancelDialogOpen(false)
        setSelectedAppointment(null)
        toast.success('Appointment cancelled')
    }

    // Mark appointment as completed
    const handleMarkComplete = () => {
        if (!selectedAppointment) return
        setAppointments(prev => prev.map(apt =>
            apt.id === selectedAppointment.id
                ? { ...apt, status: 'completed' as const }
                : apt
        ))
        setIsViewModalOpen(false)
        setSelectedAppointment(null)
        toast.success('Appointment marked as completed')
    }
    const handleMarkNoShow = () => {
        if (!selectedAppointment) return
        setAppointments(prev => prev.map(apt =>
            apt.id === selectedAppointment.id
                ? { ...apt, status: 'no_show' as const }
                : apt
        ))
        setIsViewModalOpen(false)
        setSelectedAppointment(null)
        toast.success('Appointment marked as no-show')
    }

    // Handle CPT code change - auto-update units
    const handleCptChange = (code: string) => {
        const cpt = cptCodes.find(c => c.code === code)
        setFormData(prev => ({
            ...prev,
            cptCode: code,
            units: cpt?.defaultUnits || prev.units
        }))
    }

    // Handle schedule submit
    const handleScheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const client = clients.find(c => c.id === Number(formData.clientId))
        const provider = providers.find(p => p.id === Number(formData.providerId))
        const location = locations.find(l => l.id === Number(formData.locationId))

        if (!client || !provider || !location) return

        if (isEditMode && selectedAppointment) {
            // Update existing appointment
            setAppointments(prev => prev.map(apt =>
                apt.id === selectedAppointment.id
                    ? {
                        ...apt,
                        clientId: Number(formData.clientId),
                        clientName: client.name,
                        providerId: Number(formData.providerId),
                        providerName: provider.name,
                        locationId: Number(formData.locationId),
                        locationName: location.name,
                        type: formData.type as Appointment['type'],
                        cptCode: formData.cptCode,
                        units: formData.units,
                        authorizationId: formData.authorizationId ? Number(formData.authorizationId) : undefined,
                        start: `${formData.date}T${formData.startTime}:00`,
                        end: `${formData.date}T${formData.endTime}:00`,
                        title: `${client.name} - ${sessionTypeLabels[formData.type]}`,
                        notes: formData.notes,
                        isRecurring: formData.isRecurring,
                        recurringPattern: formData.recurringPattern
                    }
                    : apt
            ))
        } else {
            // Create new appointment
            const newAppointment: Appointment = {
                id: String(Date.now()),
                title: `${client.name} - ${sessionTypeLabels[formData.type]}`,
                start: `${formData.date}T${formData.startTime}:00`,
                end: `${formData.date}T${formData.endTime}:00`,
                clientId: Number(formData.clientId),
                clientName: client.name,
                providerId: Number(formData.providerId),
                providerName: provider.name,
                locationId: Number(formData.locationId),
                locationName: location.name,
                type: formData.type as Appointment['type'],
                status: 'scheduled',
                cptCode: formData.cptCode,
                units: formData.units,
                authorizationId: formData.authorizationId ? Number(formData.authorizationId) : undefined,
                notes: formData.notes,
                isRecurring: formData.isRecurring,
                recurringPattern: formData.recurringPattern
            }
            setAppointments(prev => [...prev, newAppointment])
        }

        setIsScheduleModalOpen(false)
        setSelectedAppointment(null)
        toast.success(isEditMode ? 'Appointment rescheduled' : 'Appointment scheduled')
    }

    // Handle start session (navigate to notes)
    const handleStartSession = () => {
        if (!selectedAppointment) return
        window.location.href = `/notes?appointment=${selectedAppointment.id}`
    }

    // Handle view notes
    const handleViewNotes = () => {
        if (!selectedAppointment) return
        window.location.href = `/notes?appointment=${selectedAppointment.id}`
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
                    <h1 className="page-title">Calendar</h1>
                    <p className="page-subtitle">Manage appointments and sessions</p>
                </div>
                <button className="btn-primary" onClick={handleAddClick}>
                    <Plus size={18} weight="bold" />
                    Schedule Session
                </button>
            </div>

            {/* Calendar Toolbar */}
            <div className="calendar-toolbar">
                <div className="calendar-nav">
                    <button className="btn-icon" onClick={goToPrev}>
                        <CaretLeft size={20} weight="bold" />
                    </button>
                    <button className="btn-secondary calendar-today-btn" onClick={goToToday}>
                        Today
                    </button>
                    <button className="btn-icon" onClick={goToNext}>
                        <CaretRight size={20} weight="bold" />
                    </button>
                    <span className="calendar-title">{calendarTitle}</span>
                </div>

                <div className="calendar-actions">
                    {/* View Toggle */}
                    <div className="calendar-view-toggle">
                        <button
                            className={`view-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
                            onClick={() => changeView('timeGridDay')}
                        >
                            Day
                        </button>
                        <button
                            className={`view-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
                            onClick={() => changeView('timeGridWeek')}
                        >
                            Week
                        </button>
                        <button
                            className={`view-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
                            onClick={() => changeView('dayGridMonth')}
                        >
                            Month
                        </button>
                    </div>

                    {/* Provider Filter */}
                    <div className="filter-group">
                        <FunnelSimple size={18} weight="regular" />
                        <select
                            value={providerFilter}
                            onChange={(e) => setProviderFilter(Number(e.target.value))}
                            className="filter-select"
                        >
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <CaretDown size={14} weight="bold" className="filter-caret" />
                    </div>

                    {/* Location Filter */}
                    <div className="filter-group">
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(Number(e.target.value))}
                            className="filter-select"
                        >
                            {locations.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        <CaretDown size={14} weight="bold" className="filter-caret" />
                    </div>

                    {/* NPI Filter - Admin Only */}
                    {isAdmin && (
                        <div className="filter-group npi-filter">
                            <select
                                value={npiFilter}
                                onChange={(e) => setNpiFilter(e.target.value)}
                                className="filter-select"
                            >
                                {npiList.map(n => (
                                    <option key={n.npi || 'all'} value={n.npi}>{n.name}</option>
                                ))}
                            </select>
                            <CaretDown size={14} weight="bold" className="filter-caret" />
                        </div>
                    )}
                </div>
            </div>

            {/* Calendar */}
            <div className="calendar-container">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={currentView}
                    headerToolbar={false}
                    events={calendarEvents}
                    selectable={true}
                    selectMirror={true}
                    editable={true}
                    eventDrop={handleEventDrop}
                    dayMaxEvents={true}
                    weekends={true}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    height="auto"
                    slotMinTime="07:00:00"
                    slotMaxTime="20:00:00"
                    slotDuration="00:30:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    eventTimeFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        meridiem: 'short'
                    }}
                />
            </div>

            {/* Status Legend */}
            <div className="calendar-legend">
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#0D9488' }}></span>
                    Scheduled
                </span>
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#059669' }}></span>
                    Completed
                </span>
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#D97706' }}></span>
                    No-show
                </span>
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#DC2626' }}></span>
                    Cancelled
                </span>
            </div>

            {/* Schedule/Edit Appointment Modal */}
            <Modal
                isOpen={isScheduleModalOpen}
                onClose={() => {
                    setIsScheduleModalOpen(false)
                    setSelectedAppointment(null)
                }}
                title={isEditMode ? "Reschedule Session" : "Schedule Session"}
                size="lg"
            >
                <form onSubmit={handleScheduleSubmit} className="schedule-form">
                    <div className="form-row-2">
                        <div className="form-group">
                            <label className="form-label">Client *</label>
                            <select
                                value={formData.clientId}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value, authorizationId: '' }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="">Select client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Provider *</label>
                            <select
                                value={formData.providerId}
                                onChange={(e) => setFormData(prev => ({ ...prev, providerId: e.target.value }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="">Select provider</option>
                                {providers.filter(p => p.id !== 0).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row-2">
                        <div className="form-group">
                            <label className="form-label">Location *</label>
                            <select
                                value={formData.locationId}
                                onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="">Select location</option>
                                {locations.filter(l => l.id !== 0).map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Session Type *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="aba_session">ABA Session</option>
                                <option value="parent_training">Parent Training</option>
                                <option value="assessment">Assessment</option>
                                <option value="supervision">Supervision</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row-3">
                        <div className="form-group">
                            <label className="form-label">CPT Code *</label>
                            <select
                                value={formData.cptCode}
                                onChange={(e) => handleCptChange(e.target.value)}
                                className="form-input-basic"
                                required
                            >
                                {cptCodes.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} - {c.description}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Units *</label>
                            <input
                                type="number"
                                min="1"
                                max="32"
                                value={formData.units}
                                onChange={(e) => setFormData(prev => ({ ...prev, units: Number(e.target.value) }))}
                                className="form-input-basic"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Authorization</label>
                            <select
                                value={formData.authorizationId}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorizationId: e.target.value }))}
                                className="form-input-basic"
                                disabled={!formData.clientId}
                            >
                                <option value="">Select authorization</option>
                                {clientAuthorizations.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row-3">
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="form-input-basic"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Time *</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                className="form-input-basic"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Time *</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                className="form-input-basic"
                                required
                            />
                        </div>
                    </div>

                    {/* Recurring Appointment */}
                    <div className="form-group recurring-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isRecurring}
                                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                            />
                            <ArrowsClockwise size={18} />
                            Recurring Appointment
                        </label>
                        {formData.isRecurring && (
                            <div className="recurring-options">
                                <div className="recurring-row">
                                    <div className="recurring-field">
                                        <label className="form-label-sm">Repeat</label>
                                        <select
                                            value={formData.recurringPattern}
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurringPattern: e.target.value }))}
                                            className="form-input-basic"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="biweekly">Bi-weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div className="recurring-field">
                                        <label className="form-label-sm">Until</label>
                                        <input
                                            type="date"
                                            value={formData.recurringEndDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                                            className="form-input-basic"
                                            min={formData.date}
                                        />
                                    </div>
                                </div>
                                {formData.date && formData.recurringEndDate && (
                                    <div className="recurring-preview">
                                        <span className="recurring-preview-icon">📅</span>
                                        <span>
                                            {(() => {
                                                const start = new Date(formData.date)
                                                const end = new Date(formData.recurringEndDate)
                                                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                                                let count = 0
                                                switch (formData.recurringPattern) {
                                                    case 'daily': count = diffDays + 1; break
                                                    case 'weekly': count = Math.floor(diffDays / 7) + 1; break
                                                    case 'biweekly': count = Math.floor(diffDays / 14) + 1; break
                                                    case 'monthly': count = Math.floor(diffDays / 30) + 1; break
                                                }
                                                return `${count} sessions will be created`
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="form-textarea"
                            placeholder="Optional notes..."
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => {
                                setIsScheduleModalOpen(false)
                                setSelectedAppointment(null)
                            }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {isEditMode ? 'Update Session' : 'Schedule Session'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Appointment Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedAppointment(null)
                }}
                title="Appointment Details"
                size="md"
            >
                {selectedAppointment && (
                    <div className="appointment-details">
                        <div className="appointment-header">
                            <div className={`appointment-status status-${selectedAppointment.status}`}>
                                {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1).replace('_', ' ')}
                            </div>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Client</span>
                            <span className="detail-value">{selectedAppointment.clientName}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Provider</span>
                            <span className="detail-value">{selectedAppointment.providerName}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Location</span>
                            <span className="detail-value">{selectedAppointment.locationName}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Type</span>
                            <span className="detail-value">{sessionTypeLabels[selectedAppointment.type]}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">CPT Code</span>
                            <span className="detail-value">{selectedAppointment.cptCode}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Units</span>
                            <span className="detail-value">{selectedAppointment.units}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">
                                {new Date(selectedAppointment.start).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Time</span>
                            <span className="detail-value">
                                {new Date(selectedAppointment.start).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })} - {new Date(selectedAppointment.end).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>

                        <div className="appointment-actions">
                            {selectedAppointment.status === 'scheduled' && (
                                <>
                                    <button className="btn-primary" onClick={handleStartSession}>Start Session</button>
                                    <button className="btn-secondary" onClick={handleReschedule}>Reschedule</button>
                                    <button className="btn-secondary" onClick={handleMarkNoShow}>No-Show</button>
                                    <button className="btn-danger-outline" onClick={handleCancelClick}>Cancel</button>
                                </>
                            )}
                            {selectedAppointment.status === 'completed' && (
                                <button className="btn-primary" onClick={handleViewNotes}>View Notes</button>
                            )}
                            {selectedAppointment.status === 'no_show' && (
                                <>
                                    <button className="btn-secondary" onClick={handleReschedule}>Reschedule</button>
                                    <button className="btn-secondary" onClick={handleMarkComplete}>Mark Complete</button>
                                </>
                            )}
                            {selectedAppointment.status === 'cancelled' && (
                                <button className="btn-secondary" onClick={handleReschedule}>Reschedule</button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Cancel Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isCancelDialogOpen}
                onClose={() => {
                    setIsCancelDialogOpen(false)
                    setSelectedAppointment(null)
                }}
                onConfirm={handleConfirmCancel}
                title="Cancel Appointment"
                message={selectedAppointment
                    ? `Are you sure you want to cancel the session with ${selectedAppointment.clientName}?`
                    : ''
                }
                confirmLabel="Cancel Appointment"
                variant="danger"
            />
        </DashboardLayout>
    )
}
