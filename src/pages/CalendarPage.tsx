import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { appointmentsApi, clientsApi, lookupsApi, billingApi, getApiErrorMessage } from '../api'
import { intakesApi, type IntakeListItem } from '../api/intakes'
import type { CPTSuggestion } from '../api/billing'
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
import { cptCodes } from '../constants/cptCodes'

// POS codes for BUILD 6.3
const posCodes = [
    { code: '11', description: 'Office' },
    { code: '02', description: 'Telehealth' },
    { code: '12', description: 'Home' },
    { code: '03', description: 'School' },
    { code: '04', description: 'Homeless Shelter' },
    { code: '15', description: 'Mobile Unit' },
    { code: '20', description: 'Urgent Care' },
    { code: '21', description: 'Inpatient Hospital' },
    { code: '22', description: 'Outpatient Hospital' },
    { code: '23', description: 'Emergency Room' },
    { code: '31', description: 'Skilled Nursing' },
    { code: '32', description: 'Nursing Facility' },
    { code: '49', description: 'Independent Clinic' },
    { code: '50', description: 'FQHC' },
    { code: '51', description: 'Psychiatric Facility' },
    { code: '53', description: 'Community Mental Health' },
    { code: '99', description: 'Other' },
]

// Service type → color (5.1)
const getServiceColor = (serviceCode?: string): string => {
    const match = cptCodes.find(c => c.code === serviceCode)
    return match?.color || '#6B7280'
}

// Combined color: service type base color + status-based style
const getEventColor = (apt: Appointment): { bg: string; border: string; opacity: number } => {
    // E31 Half A: non-client events render gray so they read as "blocks" rather
    // than billable sessions. Distinct enough that providers don't confuse them.
    if (apt.event_type && apt.event_type !== 'client_session') {
        return { bg: '#64748B', border: '#475569', opacity: 0.92 }
    }
    const base = getServiceColor(apt.service_code)
    switch (apt.status) {
        case 'cancelled': return { bg: '#E5E7EB', border: '#9CA3AF', opacity: 0.5 }
        case 'no_show': return { bg: base, border: '#D97706', opacity: 0.6 }
        case 'attended': return { bg: base, border: base, opacity: 0.85 }
        default: return { bg: base, border: base, opacity: 1 }
    }
}


// Helper: get the client full name from an appointment
function aptClientName(apt: Appointment): string {
    // E31 Half A: non-session events have no client; render the title
    // (e.g. "Q3 Directors Meeting") in its place. Client sessions keep the
    // first-name + last-name format.
    if (!apt.client) return apt.title || 'Untitled event'
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
    // B10: signed/co-signed intakes for the visible window — overlaid on the
    // calendar so providers can see "intake done on this day" without leaving
    // the calendar. Only signed/co-signed are shown to avoid clutter from
    // in-progress drafts.
    const [intakes, setIntakes] = useState<IntakeListItem[]>([])
    const [clientsList, setClientsList] = useState<Client[]>([])
    const [providersList, setProvidersList] = useState<User[]>([])
    const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek')
    const [calendarTitle, setCalendarTitle] = useState('')

    // 5.2 Filters — provider, service type, status
    const [providerFilter, setProviderFilter] = useState('')
    const [serviceFilter, setServiceFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    // Modal states
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [isCancelSeriesDialogOpen, setIsCancelSeriesDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    
    // BUILD 6.1: CPT code suggestions
    const [cptSuggestions, setCptSuggestions] = useState<CPTSuggestion[]>([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)

    // New appointment form
    const [formData, setFormData] = useState({
        clientId: '',
        providerId: '',
        serviceCode: '97153',
        modifiers: '',
        placeOfService: '11',
        units: 8,
        date: '',
        startTime: '09:00',
        endTime: '11:00',
        notes: '',
        isRecurring: false,
        recurringPattern: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
        recurringEndDate: '',
        isTelehealth: false,
        // E31 Half A: appointment kind. 'client_session' = a billable client visit
        // (the default and what the rest of the form is built around);
        // anything else turns this into a calendar block — no client, no CPT,
        // no invoice, just a title rendered on the calendar.
        eventType: 'client_session' as 'client_session' | 'staff_meeting' | 'personal_block' | 'training' | 'other',
        title: '',
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
            if (serviceFilter) filters.service_code = serviceFilter
            if (statusFilter) filters.status = statusFilter as AppointmentFilters['status']
            const data = await appointmentsApi.getAll(filters)
            setAppointments(data)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to load appointments'))
        }
    }, [getDateRange, providerFilter, serviceFilter, statusFilter])

    // B10: Fetch intakes within the visible window so signed assessments
    // appear on the calendar alongside appointments. We only render
    // signed/co_signed intakes (drafts would be visual noise — those are
    // tracked separately in the "Intakes" page).
    const fetchIntakes = useCallback(async () => {
        try {
            const range = getDateRange()
            const params: Parameters<typeof intakesApi.getAll>[0] = {
                start_date: range.start_date,
                end_date: range.end_date,
            }
            if (providerFilter) params.provider = providerFilter
            const data = await intakesApi.getAll(params)
            // Filter to terminal states client-side — backend supports only
            // a single `status` exact-match filter, but we want both signed
            // and co_signed.
            const visibleStatuses = new Set(['signed', 'co_signed'])
            setIntakes(data.results.filter(i => visibleStatuses.has(i.status)))
        } catch {
            // Silent failure — intakes overlay is non-essential to the
            // appointment-centric calendar view.
            setIntakes([])
        }
    }, [getDateRange, providerFilter])

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Fetch clients and providers in parallel.
                // NOTE: use lookupsApi.getProviders() (accessible to all roles) NOT
                // usersApi.getAll() which requires admin and silently returns [] for clinicians,
                // breaking "My Schedule" and preventing appointments from loading.
                const [clientsRes, providersRes] = await Promise.all([
                    clientsApi.getAll({ page_size: 100 }),
                    lookupsApi.getProviders(),
                ])
                setClientsList(clientsRes.results)
                setProvidersList(providersRes as unknown as User[])

                // 5.5 "My Schedule" — default provider filter + form to logged-in user
                if (user?.id && providersRes.some(p => p.id === user.id)) {
                    setProviderFilter(user.id)
                    setFormData(prev => ({ ...prev, providerId: user.id }))
                } else if (providersRes.length === 1) {
                    setProviderFilter(providersRes[0].id)
                    setFormData(prev => ({ ...prev, providerId: providersRes[0].id }))
                }
            } catch (err: unknown) {
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
            fetchIntakes()
        }
    }, [fetchAppointments, fetchIntakes, isLoading])

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

    // BUILD 6.1: Fetch CPT suggestions when duration or provider changes
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!formData.startTime || !formData.endTime || !isScheduleModalOpen) return
            
            // Calculate duration in minutes
            const start = new Date(`2000-01-01T${formData.startTime}`)
            const end = new Date(`2000-01-01T${formData.endTime}`)
            const duration = Math.round((end.getTime() - start.getTime()) / 60000)
            
            if (duration <= 0) return
            
            setLoadingSuggestions(true)
            try {
                // Get provider specialty if available
                const provider = providersList.find(p => p.id === formData.providerId)
                const specialty = (provider as any)?.profile?.specialty

                const suggestions = await billingApi.getCPTSuggestions({
                    specialty,
                    duration,
                    is_initial: !isEditMode && (clientsList.find(c => c.id === formData.clientId) as any)?.is_new_client
                })
                setCptSuggestions(suggestions)
                
                // Auto-select first suggestion if no code selected
                if (!formData.serviceCode && suggestions.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        serviceCode: suggestions[0].code,
                        units: suggestions[0].typical_units
                    }))
                }
            } catch (err) {
                console.error('Failed to fetch CPT suggestions:', err)
                setCptSuggestions([])
            } finally {
                setLoadingSuggestions(false)
            }
        }
        
        fetchSuggestions()
    }, [formData.startTime, formData.endTime, formData.providerId, isScheduleModalOpen])

    // BUILD 6.2: Auto-apply modifiers when CPT code or telehealth changes
    useEffect(() => {
        const fetchModifiers = async () => {
            if (!formData.serviceCode || !isScheduleModalOpen) return
            
            try {
                // Get provider info for specialty
                const provider = providersList.find(p => p.id === formData.providerId)
                const providerType = (provider as any)?.profile?.provider_type
                
                const result = await billingApi.getModifierSuggestions({
                    code: formData.serviceCode,
                    is_telehealth: formData.isTelehealth,
                    provider_type: providerType,
                })
                
                if (result.modifiers.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        modifiers: result.modifiers.join(', ')
                    }))
                }
            } catch (err) {
                console.error('Failed to fetch modifier suggestions:', err)
            }
        }
        
        fetchModifiers()
    }, [formData.serviceCode, formData.isTelehealth, formData.providerId, isScheduleModalOpen])

    // BUILD 6.3: Auto-update POS code when telehealth changes
    useEffect(() => {
        if (formData.isTelehealth) {
            setFormData(prev => ({ ...prev, placeOfService: '02' }))
        } else if (formData.placeOfService === '02') {
            setFormData(prev => ({ ...prev, placeOfService: '11' }))
        }
    }, [formData.isTelehealth])

    // Convert appointments to FullCalendar events (5.1 color coding)
    const appointmentEvents = appointments.map(apt => {
        const colors = getEventColor(apt)
        return {
            id: apt.id,
            title: aptClientName(apt),
            start: apt.start_time,
            end: apt.end_time,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: apt.status === 'cancelled' ? '#6B7280' : '#fff',
            classNames: apt.status === 'cancelled' ? ['event-cancelled'] : [],
            extendedProps: { __kind: 'appointment' as const, ...apt },
        }
    })

    // B10: Add intakes as all-day calendar events. They land on
    // assessment_date so providers see "intake completed" in context.
    // Distinct teal color and an `intake-event` class let CSS / event renderer
    // draw them differently from appointments.
    const intakeEvents = intakes.map(intake => ({
        id: `intake-${intake.id}`,
        title: `Intake — ${intake.client_name}`,
        start: intake.assessment_date,  // date-only ISO string → all-day event
        allDay: true,
        backgroundColor: '#0D9488',
        borderColor: '#0F766E',
        textColor: '#fff',
        classNames: ['intake-event'],
        extendedProps: { __kind: 'intake' as const, intake },
    }))

    const calendarEvents = [...appointmentEvents, ...intakeEvents]

    // Event renderer — bumped up sizes (E30) so events read at a glance,
    // not by squinting. Time row + client name + service code, each on its
    // own line. Padding raised so text doesn't kiss the pill border.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderEventContent = (eventInfo: any) => {
        const props = eventInfo.event.extendedProps as { __kind?: 'appointment' | 'intake' } & Record<string, unknown>

        // B10: render intakes with a distinct, condensed pill (no time row).
        if (props.__kind === 'intake') {
            const intake = props.intake as IntakeListItem
            return (
                <div style={{ padding: '4px 6px', overflow: 'hidden', lineHeight: 1.3 }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Intake · {intake.status === 'co_signed' ? 'Co-signed' : 'Signed'}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {intake.client_name}
                    </div>
                </div>
            )
        }

        const apt = props as unknown as Appointment
        const start = new Date(apt.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        const isCancelled = apt.status === 'cancelled'
        return (
            <div style={{ padding: '4px 6px', overflow: 'hidden', lineHeight: 1.3 }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {start}
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textDecoration: isCancelled ? 'line-through' : 'none',
                }}>
                    {aptClientName(apt)}
                </div>
                {apt.service_code && (
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {apt.service_code}
                    </div>
                )}
            </div>
        )
    }

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
        const defaultProviderId = user?.id && providersList.some(p => p.id === user.id)
            ? user.id
            : (providersList.length === 1 ? providersList[0].id : '')
        setFormData({
            clientId: '',
            providerId: defaultProviderId,
            serviceCode: '97153',
            modifiers: '',
            placeOfService: '11',
            units: 8,
            date: selectInfo.startStr.split('T')[0],
            startTime: selectInfo.start.toTimeString().slice(0, 5),
            endTime: selectInfo.end.toTimeString().slice(0, 5),
            notes: '',
            isRecurring: false,
            recurringPattern: 'weekly',
            recurringEndDate: '',
            isTelehealth: false,
            eventType: 'client_session',
            title: '',
        })
        setIsScheduleModalOpen(true)
    }

    // Handle event click (view appointment, or jump to the intake editor for
    // intake events overlaid via B10).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventClick = (clickInfo: any) => {
        const props = clickInfo.event.extendedProps as { __kind?: 'appointment' | 'intake' } & Record<string, unknown>
        if (props.__kind === 'intake') {
            const intake = props.intake as IntakeListItem
            navigate(`/intakes/${intake.id}/edit`)
            return
        }
        const apt = props as unknown as Appointment
        setSelectedAppointment(apt)
        setIsViewModalOpen(true)
    }

    // Handle event drag (reschedule)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEventDrop = async (dropInfo: any) => {
        const event = dropInfo.event
        const props = event.extendedProps as { __kind?: 'appointment' | 'intake' } & Record<string, unknown>

        // B10: intakes are date-bound, read-only-on-calendar overlays. Don't
        // attempt to mutate the intake's assessment_date by dragging.
        if (props.__kind === 'intake') {
            dropInfo.revert()
            return
        }

        const apt = props as unknown as Appointment

        if (apt.status !== 'scheduled') {
            dropInfo.revert()
            return
        }

        try {
            // FullCalendar with `timeZone="local"` (default) returns naive ISO
            // strings via `event.startStr` ("2026-04-13T13:00:00", no offset).
            // Sending those would cause the same drift bug as the form path:
            // Django interprets them as UTC, so each drag would push the
            // appointment back by one local-UTC offset. Use the Date objects
            // (which ARE timezone-aware) and emit proper UTC ISO instead.
            await appointmentsApi.update(apt.id, {
                start_time: event.start ? event.start.toISOString() : event.startStr,
                end_time: event.end ? event.end.toISOString() : event.endStr,
            })
            toast.success('Appointment rescheduled')
            fetchAppointments()
        } catch (err: unknown) {
            dropInfo.revert()
            toast.error(getApiErrorMessage(err, 'Failed to reschedule'))
        }
    }

    // Handle add appointment button
    const handleAddClick = () => {
        setIsEditMode(false)
        const now = new Date()
        // Default provider to the logged-in user when they're on the providers
        // list (clinicians will be — admins may not). E3 from feedback tracker:
        // "Provider can it be automatically set to the user logged in?"
        const defaultProviderId = user?.id && providersList.some(p => p.id === user.id)
            ? user.id
            : (providersList.length === 1 ? providersList[0].id : '')
        setFormData({
            clientId: '',
            providerId: defaultProviderId,
            serviceCode: '97153',
            modifiers: '',
            placeOfService: '11',
            units: 8,
            date: now.toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '11:00',
            notes: '',
            isRecurring: false,
            recurringPattern: 'weekly',
            recurringEndDate: '',
            isTelehealth: false,
            eventType: 'client_session',
            title: '',
        })
        setIsScheduleModalOpen(true)
    }

    // Handle reschedule click
    const handleReschedule = () => {
        if (!selectedAppointment) return
        setIsEditMode(true)
        setFormData({
            // E31 Half A: client may be null on staff/personal events. Default
            // to '' so the controlled <select> doesn't break.
            clientId: selectedAppointment.client?.id || '',
            providerId: selectedAppointment.provider.id,
            serviceCode: selectedAppointment.service_code || '97153',
            modifiers: selectedAppointment.modifiers || '',
            placeOfService: selectedAppointment.place_of_service || '11',
            units: selectedAppointment.units || 8,
            date: selectedAppointment.start_time.split('T')[0],
            startTime: new Date(selectedAppointment.start_time).toTimeString().slice(0, 5),
            endTime: new Date(selectedAppointment.end_time).toTimeString().slice(0, 5),
            notes: selectedAppointment.notes || '',
            isRecurring: selectedAppointment.is_recurring,
            recurringPattern: selectedAppointment.recurrence_pattern?.frequency || 'weekly',
            recurringEndDate: selectedAppointment.recurrence_pattern?.end_date || '',
            isTelehealth: selectedAppointment.modifiers?.includes('-95') || false,
            eventType: selectedAppointment.event_type || 'client_session',
            title: selectedAppointment.title || '',
        })
        setIsViewModalOpen(false)
        setIsScheduleModalOpen(true)
    }

    // Handle cancel appointment click
    const handleCancelClick = () => {
        setIsViewModalOpen(false)
        setIsCancelDialogOpen(true)
    }

    // Handle cancel entire recurring series (5.3)
    const handleCancelSeriesClick = () => {
        setIsViewModalOpen(false)
        setIsCancelSeriesDialogOpen(true)
    }

    const handleConfirmCancelSeries = async () => {
        if (isSaving || !selectedAppointment) return
        setIsSaving(true)
        try {
            const result = await appointmentsApi.cancelSeries(selectedAppointment.id)
            toast.success(`${result.cancelled} future appointment(s) cancelled`)
            fetchAppointments()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to cancel series'))
        } finally {
            setIsSaving(false)
            setIsCancelSeriesDialogOpen(false)
            setSelectedAppointment(null)
        }
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
        } catch (err: unknown) {
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
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to update appointment'))
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
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to update appointment'))
        } finally {
            setIsViewModalOpen(false)
            setSelectedAppointment(null)
        }
    }

    const handleDeleteAppointment = async () => {
        if (!selectedAppointment) return
        try {
            await appointmentsApi.delete(selectedAppointment.id)
            toast.success('Appointment deleted')
            fetchAppointments()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to delete appointment'))
        } finally {
            setIsDeleteDialogOpen(false)
            setIsViewModalOpen(false)
            setSelectedAppointment(null)
        }
    }

    // Handle CPT code change - auto-update units
    const handleCptChange = (code: string) => {
        // First check suggestions (they have priority)
        const suggestion = cptSuggestions.find(s => s.code === code)
        if (suggestion) {
            setFormData(prev => ({
                ...prev,
                serviceCode: code,
                units: suggestion.typical_units || prev.units
            }))
        } else {
            // Fall back to static list
            const cpt = cptCodes.find(c => c.code === code)
            setFormData(prev => ({
                ...prev,
                serviceCode: code,
                units: cpt?.defaultUnits || prev.units
            }))
        }
    }

    // Handle schedule submit
    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSaving) return

        // Frontend validation
        // E31 Half A: client required for client_session, title required for everything else.
        const isClientSession = formData.eventType === 'client_session'
        if (isClientSession && !formData.clientId) {
            toast.error('Please select a client')
            return
        }
        if (!isClientSession && !formData.title.trim()) {
            toast.error('Please enter a title for this event')
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

        // Build local Date objects, then convert to proper UTC ISO via toISOString().
        // CRITICAL: do NOT send `${date}T${time}:00` — that's a naive datetime
        // (no timezone) which Django interprets as UTC, shifting every saved
        // appointment by the local UTC offset (e.g. 1pm ET → stored 1pm UTC →
        // shown 9am ET). Re-saves stack the shift (1pm → 9am → 5am).
        const localStart = new Date(`${formData.date}T${formData.startTime}:00`)
        const localEnd = new Date(`${formData.date}T${formData.endTime}:00`)
        if (isNaN(localStart.getTime()) || isNaN(localEnd.getTime())) {
            toast.error('Invalid date or time')
            return
        }

        const payload: CreateAppointmentPayload = isClientSession ? {
            client_id: formData.clientId,
            provider_id: formData.providerId,
            start_time: localStart.toISOString(),
            end_time: localEnd.toISOString(),
            service_code: formData.serviceCode,
            modifiers: formData.modifiers,
            place_of_service: formData.placeOfService,
            units: formData.units,
            notes: formData.notes,
            is_recurring: formData.isRecurring,
            recurrence_pattern: formData.isRecurring ? {
                frequency: formData.recurringPattern,
                end_date: formData.recurringEndDate || undefined,
            } : undefined,
            event_type: 'client_session',
        } : {
            // E31 Half A: non-session events skip CPT, units, modifiers, etc.
            // The backend validator rejects client_id on these and requires
            // title; we mirror that on the FE to avoid a round-trip.
            provider_id: formData.providerId,
            start_time: localStart.toISOString(),
            end_time: localEnd.toISOString(),
            notes: formData.notes,
            is_recurring: formData.isRecurring,
            recurrence_pattern: formData.isRecurring ? {
                frequency: formData.recurringPattern,
                end_date: formData.recurringEndDate || undefined,
            } : undefined,
            event_type: formData.eventType,
            title: formData.title.trim(),
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
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save appointment'))
        } finally {
            setIsSaving(false)
        }
    }

    // Handle start session — navigate STRAIGHT to the note editor with the
    // appointment ID. Editor (E24) handles the "find-or-create" flow: if a
    // note already exists for this appointment, it redirects to it. So one
    // button works whether the provider is starting fresh or returning to a
    // draft.
    const handleStartSession = () => {
        if (!selectedAppointment) return
        navigate(`/notes/new?appointment=${selectedAppointment.id}`)
    }

    // Handle view notes — same target as Start Session; the editor knows
    // whether to show a fresh note or the existing one for this appointment.
    const handleViewNotes = () => {
        if (!selectedAppointment) return
        navigate(`/notes/new?appointment=${selectedAppointment.id}`)
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

                    {/* Provider Filter (always visible — 5.5 My Schedule) */}
                    <div className="filter-group">
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

                    {/* Filter toggle (5.2) */}
                    <button
                        className={`btn-icon ${showFilters || serviceFilter || statusFilter ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="More filters"
                    >
                        <FunnelSimple size={20} weight={showFilters || serviceFilter || statusFilter ? 'fill' : 'regular'} />
                    </button>
                </div>
            </div>

            {/* 5.2 Extended filter bar */}
            {showFilters && (
                <div className="calendar-filter-bar">
                    <div className="filter-group">
                        <label className="filter-label">Service Type</label>
                        <select
                            value={serviceFilter}
                            onChange={(e) => setServiceFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Types</option>
                            {cptCodes.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.code} — {c.description}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="attended">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No-show</option>
                        </select>
                    </div>
                    {(serviceFilter || statusFilter) && (
                        <button
                            className="btn-text-sm"
                            onClick={() => { setServiceFilter(''); setStatusFilter('') }}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

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
                    eventContent={renderEventContent}
                    // E30: clunky-fix bundle.
                    // - slotEventOverlap=false: concurrent events split into
                    //   clean side-by-side columns instead of one sitting on
                    //   top of the other (Dr. Joe couldn't read overlapped
                    //   appointments). Each event still gets equal width within
                    //   its slot column.
                    // - eventMinHeight 36 -> 56: events feel substantial enough
                    //   to read without leaning in; matches the 30-min slot
                    //   height so a single 30-min session doesn't render as a
                    //   sliver.
                    slotEventOverlap={false}
                    eventMinHeight={56}
                    height="auto"
                    slotMinTime="07:00:00"
                    slotMaxTime="20:00:00"
                    slotDuration="00:30:00"
                    slotLabelInterval="01:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                />
            </div>

            {/* Service Type Legend (5.1) */}
            <div className="calendar-legend">
                {cptCodes.slice(0, 6).map(c => (
                    <span key={c.code} className="legend-item">
                        <span className="legend-dot" style={{ background: c.color }}></span>
                        {c.code}
                    </span>
                ))}
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#E5E7EB', border: '2px solid #9CA3AF' }}></span>
                    Cancelled
                </span>
                <span className="legend-item">
                    <span className="legend-dot" style={{ background: '#D97706' }}></span>
                    No-show
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
                    {/* E31 Half A: event type picker. Switching to a non-session
                        type hides client/CPT inputs and reveals a Title field
                        below. The provider stays required either way (it's
                        whose calendar gets the block). */}
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <div className="event-type-picker">
                            {[
                                { value: 'client_session', label: 'Client Session' },
                                { value: 'staff_meeting', label: 'Staff Meeting' },
                                { value: 'personal_block', label: 'Personal Block' },
                                { value: 'training', label: 'Training / CEU' },
                                { value: 'other', label: 'Other' },
                            ].map(opt => (
                                <label
                                    key={opt.value}
                                    className={`event-type-option${formData.eventType === opt.value ? ' active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="event_type"
                                        value={opt.value}
                                        checked={formData.eventType === opt.value}
                                        onChange={() => setFormData(prev => ({
                                            ...prev,
                                            eventType: opt.value as typeof prev.eventType,
                                        }))}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-row-2">
                        {formData.eventType === 'client_session' ? (
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
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="form-input-basic"
                                    placeholder="e.g. Q3 Directors Meeting"
                                    required
                                />
                            </div>
                        )}

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
                            <label className="form-label">
                                CPT Code * 
                                {loadingSuggestions && <span className="text-sm text-gray-500 ml-2">Loading suggestions...</span>}
                            </label>
                            <select
                                value={formData.serviceCode}
                                onChange={(e) => handleCptChange(e.target.value)}
                                className="form-input-basic"
                                required
                            >
                                {/* Show suggestions if available, otherwise show all codes */}
                                {(cptSuggestions.length > 0 ? cptSuggestions : cptCodes).map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.code} - {c.description}
                                        {cptSuggestions.length > 0 && 'duration_min' in c && 'duration_max' in c &&
                                            ` (${c.duration_min}-${c.duration_max} min)`
                                        }
                                    </option>
                                ))}
                                {cptSuggestions.length > 0 && (
                                    <optgroup label="All codes">
                                        {cptCodes.filter(c => !cptSuggestions.find(s => s.code === c.code)).map(c => (
                                            <option key={c.code} value={c.code}>{c.code} - {c.description}</option>
                                        ))}
                                    </optgroup>
                                )}
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

                    <div className="form-row-2">
                        <div className="form-group">
                            <label className="form-label">Modifiers</label>
                            <input
                                type="text"
                                value={formData.modifiers}
                                onChange={(e) => setFormData(prev => ({ ...prev, modifiers: e.target.value }))}
                                className="form-input-basic"
                                placeholder="e.g., -95, GO"
                            />
                        </div>
                        <div className="form-group">
                            <label className="checkbox-label" style={{ marginTop: '1.75rem' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isTelehealth}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isTelehealth: e.target.checked }))}
                                />
                                Telehealth Session
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Place of Service</label>
                        <select
                            value={formData.placeOfService}
                            onChange={(e) => setFormData(prev => ({ ...prev, placeOfService: e.target.value }))}
                            className="form-input-basic"
                        >
                            {posCodes.map(pos => (
                                <option key={pos.code} value={pos.code}>
                                    {pos.code} - {pos.description}
                                </option>
                            ))}
                        </select>
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

                        {/* Recurring badge (5.3) */}
                        {selectedAppointment.is_recurring && (
                            <div className="detail-row">
                                <span className="detail-label">Recurring</span>
                                <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <ArrowsClockwise size={16} />
                                    {selectedAppointment.recurrence_pattern?.frequency || 'Yes'}
                                </span>
                            </div>
                        )}

                        <div className="appointment-actions">
                            {selectedAppointment.status === 'scheduled' && (
                                <>
                                    <button className="btn-primary" onClick={handleStartSession}>Start Session</button>
                                    <button className="btn-secondary" onClick={handleReschedule}>Edit</button>
                                    <button className="btn-secondary" onClick={handleMarkNoShow}>No-Show</button>
                                    <button className="btn-danger-outline" onClick={handleCancelClick}>Cancel</button>
                                    {selectedAppointment.is_recurring && selectedAppointment.series_id && (
                                        <button className="btn-danger-outline" onClick={handleCancelSeriesClick}>
                                            Cancel Series
                                        </button>
                                    )}
                                </>
                            )}
                            {selectedAppointment.status === 'attended' && (
                                <>
                                    <button className="btn-primary" onClick={handleViewNotes}>View Notes</button>
                                    <button className="btn-secondary" onClick={handleReschedule}>Edit</button>
                                </>
                            )}
                            {selectedAppointment.status === 'no_show' && (
                                <>
                                    <button className="btn-secondary" onClick={handleReschedule}>Edit</button>
                                    <button className="btn-secondary" onClick={handleMarkComplete}>Mark Complete</button>
                                </>
                            )}
                            {selectedAppointment.status === 'cancelled' && (
                                <button className="btn-secondary" onClick={handleReschedule}>Edit</button>
                            )}
                            <button className="btn-danger-outline" onClick={() => setIsDeleteDialogOpen(true)}>Delete</button>
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

            {/* Cancel Series Confirmation Dialog (5.3) */}
            <ConfirmDialog
                isOpen={isCancelSeriesDialogOpen}
                onClose={() => {
                    setIsCancelSeriesDialogOpen(false)
                    setSelectedAppointment(null)
                }}
                onConfirm={handleConfirmCancelSeries}
                title="Cancel Recurring Series"
                message={selectedAppointment
                    ? `This will cancel ALL future scheduled appointments in this recurring series for ${aptClientName(selectedAppointment)}. Past and completed sessions will not be affected.`
                    : ''
                }
                confirmLabel="Cancel All Future"
                variant="danger"
            />

            {/* Delete Appointment Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false)
                }}
                onConfirm={handleDeleteAppointment}
                title="Delete Appointment"
                message={selectedAppointment
                    ? `Permanently delete this appointment with ${aptClientName(selectedAppointment)}? This cannot be undone.`
                    : ''
                }
                confirmLabel="Delete"
                variant="danger"
            />
        </DashboardLayout>
    )
}
