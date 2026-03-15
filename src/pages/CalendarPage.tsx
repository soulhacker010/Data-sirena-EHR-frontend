import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { appointmentsApi, clientsApi, usersApi, getApiErrorMessage } from '../api'
import { useAuth } from '../context'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type {
    Appointment,
    AppointmentFilters,
    CreateAppointmentPayload,
    Client,
    User
} from '../types'
import {
    Plus,
    CaretLeft,
    CaretRight,
    FunnelSimple,
    CaretDown,
    ArrowsClockwise
} from '@phosphor-icons/react'
import { Modal, ConfirmDialog } from '../components/ui'

// CPT Codes (static reference)
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
        case 'scheduled': return '#0D9488'
        case 'attended': return '#059669'
        case 'completed': return '#059669'
        case 'cancelled': return '#DC2626'
        case 'no_show': return '#D97706'
        default: return '#0D9488'
    }
}


// Helper: get the client full name from an appointment
function aptClientName(apt: Appointment): string {
    return `${apt.client.first_name} ${apt.client.last_name}`
}

// Helper: get the provider full name from an appointment
function aptProviderName(apt: Appointment): string {
    return `${apt.provider.first_name} ${apt.provider.last_name}`
}

export default function CalendarPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const calendarRef = useRef<FullCalendar>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [clientsList, setClientsList] = useState<Client[]>([])
    const [providersList, setProvidersList] = useState<User[]>([])
    const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek')
    const [providerFilter, setProviderFilter] = useState('')
    const [calendarTitle, setCalendarTitle] = useState('')
    const _isAdmin = user?.role === 'admin' || user?.role === 'supervisor'

    // Modal states
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // New appointment form
    const [formData, setFormData] = useState({
        clientId: '',
        providerId: '',
        serviceCode: '97153',
        units: 8,
        date: '',
        startTime: '09:00',
        endTime: '11:00',
        notes: '',
        isRecurring: false,
        recurringPattern: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
        recurringEndDate: ''
    })

    // Get date range from calendar view for fetching
    const getDateRange = useCallback(() => {
        const api = calendarRef.current?.getApi()
        if (!api) {
            const now = new Date()
            const start = new Date(now)
            start.setDate(now.getDate() - now.getDay())
            const end = new Date(start)
            end.setDate(start.getDate() + 7)
            return {
                start_date: start.toISOString().split('T')[0],
                end_date: end.toISOString().split('T')[0]
            }
        }
        return {
            start_date: api.view.activeStart.toISOString().split('T')[0],
            end_date: api.view.activeEnd.toISOString().split('T')[0]
        }
    }, [])

    // Fetch appointments
    const fetchAppointments = useCallback(async () => {
        try {
            const range = getDateRange()
            const filters: AppointmentFilters = {
                start_date: range.start_date,
                end_date: range.end_date,
            }
            if (providerFilter) filters.provider_id = providerFilter
            const data = await appointmentsApi.getAll(filters)
            setAppointments(data)
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, 'Failed to load appointments'))
        }
    }, [getDateRange, providerFilter])

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Fetch clients and providers in parallel
                const [clientsRes, providersRes] = await Promise.all([
                    clientsApi.getAll({ page_size: 100 }),
                    usersApi.getAll({ page_size: 100 }).catch(() => ({ results: [], count: 0 })),
                ])
                setClientsList(clientsRes.results)
                setProvidersList(providersRes.results)

                // Auto-select the logged-in user as the default provider
                if (user?.id && providersRes.results.some((p: User) => p.id === user.id)) {
                    setFormData(prev => ({ ...prev, providerId: user.id }))
                } else if (providersRes.results.length === 1) {
                    setFormData(prev => ({ ...prev, providerId: providersRes.results[0].id }))
                }
            } catch (err: any) {
                toast.error('Failed to load filter data')
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    // Fetch appointments when calendar view or filters change
    useEffect(() => {
        if (!isLoading) {
            fetchAppointments()
        }
    }, [fetchAppointments, isLoading])

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

    // Convert appointments to FullCalendar events
    const calendarEvents = appointments.map(apt => ({
        id: apt.id,
        title: `${aptClientName(apt)} - ${apt.service_code || 'Session'}`,
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor: getStatusColor(apt.status),
        borderColor: getStatusColor(apt.status),
        extendedProps: apt
    }))

    // Navigate calendar
    const goToToday = () => {
        calendarRef.current?.getApi().today()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
        fetchAppointments()
    }
    const goToPrev = () => {
        calendarRef.current?.getApi().prev()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
        fetchAppointments()
    }
    const goToNext = () => {
        calendarRef.current?.getApi().next()
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
        fetchAppointments()
    }

    // Change view
    const changeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
        setCurrentView(view)
        calendarRef.current?.getApi().changeView(view)
        setCalendarTitle(calendarRef.current?.getApi().view.title || '')
        fetchAppointments()
    }

    // Handle date select (create appointment)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDateSelect = (selectInfo: any) => {
        setIsEditMode(false)
        setFormData({
            clientId: '',
            providerId: '',
            serviceCode: '97153',
            units: 8,
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
        setSelectedAppointment(apt)
        setIsViewModalOpen(true)
    }

    // Handle event drag (reschedule)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventDrop = async (dropInfo: any) => {
        const event = dropInfo.event
        const apt = event.extendedProps as Appointment

        if (apt.status !== 'scheduled') {
            dropInfo.revert()
            return
        }

        try {
            await appointmentsApi.update(apt.id, {
                start_time: event.startStr,
                end_time: event.endStr,
            })
            toast.success('Appointment rescheduled')
            fetchAppointments()
        } catch (err: any) {
            dropInfo.revert()
            toast.error(getApiErrorMessage(err, 'Failed to reschedule'))
        }
    }

    // Handle add appointment button
    const handleAddClick = () => {
        setIsEditMode(false)
        const now = new Date()
        setFormData({
            clientId: '',
            providerId: '',
            serviceCode: '97153',
            units: 8,
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
            clientId: selectedAppointment.client.id,
            providerId: selectedAppointment.provider.id,
            serviceCode: selectedAppointment.service_code || '97153',
            units: selectedAppointment.units || 8,
            date: selectedAppointment.start_time.split('T')[0],
            startTime: new Date(selectedAppointment.start_time).toTimeString().slice(0, 5),
            endTime: new Date(selectedAppointment.end_time).toTimeString().slice(0, 5),
            notes: selectedAppointment.notes || '',
            isRecurring: selectedAppointment.is_recurring,
            recurringPattern: selectedAppointment.recurrence_pattern?.frequency || 'weekly',
            recurringEndDate: selectedAppointment.recurrence_pattern?.end_date || ''
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
    const handleConfirmCancel = async () => {
        if (isSaving) return
        if (!selectedAppointment) return
        setIsSaving(true)
        try {
            await appointmentsApi.updateStatus(selectedAppointment.id, 'cancelled')
            toast.success('Appointment cancelled')
            fetchAppointments()
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, 'Failed to cancel appointment'))
        } finally {
            setIsSaving(false)
            setIsCancelDialogOpen(false)
            setSelectedAppointment(null)
        }
    }

    // Mark appointment as completed
    const handleMarkComplete = async () => {
        if (isSaving) return
        if (!selectedAppointment) return
        setIsSaving(true)
        try {
            await appointmentsApi.updateStatus(selectedAppointment.id, 'attended')
            toast.success('Appointment marked as completed')
            fetchAppointments()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update appointment')
        } finally {
            setIsSaving(false)
            setIsViewModalOpen(false)
            setSelectedAppointment(null)
        }
    }

    const handleMarkNoShow = async () => {
        if (!selectedAppointment) return
        try {
            await appointmentsApi.updateStatus(selectedAppointment.id, 'no_show')
            toast.success('Appointment marked as no-show')
            fetchAppointments()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update appointment')
        } finally {
            setIsViewModalOpen(false)
            setSelectedAppointment(null)
        }
    }

    // Handle CPT code change - auto-update units
    const handleCptChange = (code: string) => {
        const cpt = cptCodes.find(c => c.code === code)
        setFormData(prev => ({
            ...prev,
            serviceCode: code,
            units: cpt?.defaultUnits || prev.units
        }))
    }

    // Handle schedule submit
    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSaving) return

        // Frontend validation
        if (!formData.clientId) {
            toast.error('Please select a client')
            return
        }
        if (!formData.providerId) {
            toast.error('Please select a provider')
            return
        }
        if (!formData.date) {
            toast.error('Please select a date')
            return
        }
        if (!formData.startTime || !formData.endTime) {
            toast.error('Please set start and end times')
            return
        }

        const payload: CreateAppointmentPayload = {
            client_id: formData.clientId,
            provider_id: formData.providerId,
            start_time: `${formData.date}T${formData.startTime}:00`,
            end_time: `${formData.date}T${formData.endTime}:00`,
            service_code: formData.serviceCode,
            units: formData.units,
            notes: formData.notes || undefined,
            is_recurring: formData.isRecurring,
            recurrence_pattern: formData.isRecurring ? {
                frequency: formData.recurringPattern,
                end_date: formData.recurringEndDate || undefined,
            } : undefined,
        }

        setIsSaving(true)
        try {
            if (isEditMode && selectedAppointment) {
                await appointmentsApi.update(selectedAppointment.id, payload)
                toast.success('Appointment rescheduled')
            } else {
                await appointmentsApi.create(payload)
                toast.success('Appointment scheduled')
            }
            setIsScheduleModalOpen(false)
            setSelectedAppointment(null)
            fetchAppointments()
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, 'Failed to save appointment'))
        } finally {
            setIsSaving(false)
        }
    }

    // Handle start session (navigate to notes)
    const handleStartSession = () => {
        if (!selectedAppointment) return
        navigate(`/notes?appointment=${selectedAppointment.id}`)
    }

    // Handle view notes
    const handleViewNotes = () => {
        if (!selectedAppointment) return
        navigate(`/notes?appointment=${selectedAppointment.id}`)
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
                            onChange={(e) => setProviderFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Providers</option>
                            {providersList.map(p => (
                                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                            ))}
                        </select>
                        <CaretDown size={14} weight="bold" className="filter-caret" />
                    </div>
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
                                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                className="form-input-basic"
                                required
                            >
                                <option value="">Select client</option>
                                {clientsList.map(c => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
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
                                {providersList.map(p => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row-3">
                        <div className="form-group">
                            <label className="form-label">CPT Code *</label>
                            <select
                                value={formData.serviceCode}
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
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="form-input-basic"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row-2">
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
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurringPattern: e.target.value as typeof formData.recurringPattern }))}
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
                            <span className="detail-value">{aptClientName(selectedAppointment)}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Provider</span>
                            <span className="detail-value">{aptProviderName(selectedAppointment)}</span>
                        </div>

                        {selectedAppointment.location && (
                            <div className="detail-row">
                                <span className="detail-label">Location</span>
                                <span className="detail-value">{selectedAppointment.location.name}</span>
                            </div>
                        )}

                        {selectedAppointment.service_code && (
                            <div className="detail-row">
                                <span className="detail-label">CPT Code</span>
                                <span className="detail-value">{selectedAppointment.service_code}</span>
                            </div>
                        )}

                        {selectedAppointment.units && (
                            <div className="detail-row">
                                <span className="detail-label">Units</span>
                                <span className="detail-value">{selectedAppointment.units}</span>
                            </div>
                        )}

                        <div className="detail-row">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">
                                {new Date(selectedAppointment.start_time).toLocaleDateString('en-US', {
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
                                {new Date(selectedAppointment.start_time).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })} - {new Date(selectedAppointment.end_time).toLocaleTimeString('en-US', {
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
                            {(selectedAppointment.status === 'attended') && (
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
                    ? `Are you sure you want to cancel the session with ${aptClientName(selectedAppointment)}?`
                    : ''
                }
                confirmLabel="Cancel Appointment"
                variant="danger"
            />
        </DashboardLayout>
    )
}
