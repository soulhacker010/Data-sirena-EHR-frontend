import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import Modal from '../components/ui/Modal'
import SignaturePad from '../components/ui/SignaturePad'
import { notesApi, clientsApi, lookupsApi, appointmentsApi, getApiErrorMessage } from '../api'
import type { SessionNote, Client, User } from '../types'
import { MentalStatusExam, RiskAssessment, ABADataFields, InterventionsChecklist } from '../components/clinical'
import { ABA_CPT_CODES } from '../constants/clinicalFields'
import { cptCodes } from '../constants/cptCodes'
import { useAuth } from '../context'
import { printNote } from '../utils/printNote'
import { formatDateSafe } from '../utils/dates'
import { AddendumThread } from '../components/shared'
import {
    ArrowLeft,
    User as UserIcon,
    CalendarBlank,
    Copy,
    CalendarPlus,
    FloppyDisk,
    CheckCircle,
    PencilSimple,
    Warning,
    FileText,
    CaretDown,
    UserCirclePlus,
    FilePdf
} from '@phosphor-icons/react'

/**
 * E17: Default medical-necessity boilerplate. Pre-filled into the textarea
 * (not just a placeholder) so providers see the standard language and can
 * edit/individualize it inline. Same pattern as Intake & Treatment Plan
 * editors — Dr. Joe asked for "keep the template but if someone wants to
 * individualize allow for it".
 */
const DEFAULT_MEDICAL_NECESSITY = "Services were medically necessary to address the client's diagnosis and treatment goals. The interventions provided are consistent with the treatment plan and are expected to improve the client's functioning."

export default function NoteEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientIdParam = searchParams.get('client')
    /**
     * E24: when entering with `?appointment=X` (used by the calendar's "Start
     * Session" / "Write Note" buttons) we first check whether a note already
     * exists for that appointment and redirect to it. Otherwise we pre-fill
     * the new-note form with the appointment's client + service code, and
     * include `appointment_id` on create so the FK gets set server-side.
     */
    const appointmentIdParam = searchParams.get('appointment')
    const { user } = useAuth()

    const [note, setNote] = useState<SessionNote | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [supervisors, setSupervisors] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [signature, setSignature] = useState<string | null>(null)
    const [showCoSignModal, setShowCoSignModal] = useState(false)
    const [selectedSupervisor, setSelectedSupervisor] = useState('')
    const [coSignRequested, setCoSignRequested] = useState(false)

    // Clinical section data (stored in note_data)
    const [clinicalData, setClinicalData] = useState<Record<string, unknown>>({})
    const [collapsedSections, setCollapsedSections] = useState({
        mse: false,
        risk: true,
        aba: false,
        interventions: true,
    })
    const clinicalDataRef = useRef<Record<string, unknown>>({})

    // Auto-save refs
    const isDirtyRef = useRef(false)
    const formContentRef = useRef<Record<string, string>>({})
    const isSavingRef = useRef(false)

    // Form content state (note_data fields)
    const [formContent, setFormContent] = useState({
        objectives: '',
        interventions: '',
        client_response: '',
        notes: '',
        plan_next_session: ''
    })

    // New note form state
    const [selectedClientId, setSelectedClientId] = useState(clientIdParam || '')
    const [serviceCode, setServiceCode] = useState('')

    const isNewNote = !id || id === 'new'

    // Load note or prepare new note
    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                // Fetch clients and providers in parallel
                // NOTE: use lookupsApi.getProviders() (accessible to all roles) NOT
                // usersApi.getAll() which requires admin — that was causing 403 for clinicians
                const [clientsRes, providersRes] = await Promise.all([
                    clientsApi.getAll({ page_size: 500 }),
                    lookupsApi.getProviders(),
                ])
                setClients(clientsRes.results)
                setSupervisors(providersRes.filter(p => p.role === 'supervisor') as unknown as User[])

                // E24: appointment-aware new-note flow. Either land on the
                // existing note for the appointment, or pre-fill from the
                // appointment so the provider doesn't re-enter client+CPT.
                if (isNewNote && appointmentIdParam) {
                    try {
                        const existingForAppt = await notesApi.getAll({
                            appointment: appointmentIdParam,
                            page_size: 1,
                        })
                        if (existingForAppt.results.length > 0) {
                            // A note already exists — redirect to it. `replace`
                            // so the back button doesn't bounce them back here.
                            navigate(`/notes/${existingForAppt.results[0].id}`, { replace: true })
                            return
                        }
                    } catch {
                        // Couldn't check — fall through to normal new-note flow.
                    }

                    try {
                        const appt = await appointmentsApi.getById(appointmentIdParam)
                        setSelectedClientId(appt.client.id)
                        if (appt.service_code) setServiceCode(appt.service_code)
                    } catch {
                        // Appointment fetch failed — provider can still pick
                        // client manually; don't block.
                    }
                }

                if (!isNewNote && id) {
                    // Load existing note
                    const existingNote = await notesApi.getById(id)
                    setNote(existingNote)
                    setSelectedTemplate(existingNote.template_id || '')
                    setSignature(existingNote.signature_data || null)
                    setCoSignRequested(!!existingNote.co_signed_by)

                    // Populate form content from note_data
                    const nd = existingNote.note_data || {}
                    setFormContent({
                        objectives: (nd.objectives as string) || '',
                        interventions: (nd.interventions as string) || '',
                        client_response: (nd.client_response as string) || '',
                        notes: (nd.notes as string) || '',
                        plan_next_session: (nd.plan_next_session as string) || '',
                    })

                    // Populate clinical section data
                    const clinical: Record<string, unknown> = {}
                    for (const [k, v] of Object.entries(nd)) {
                        if (k.startsWith('mse_') || k.startsWith('risk_') || k.startsWith('aba_') || k.startsWith('auth_') || k === 'interventions_checklist' || k === 'medical_necessity') {
                            clinical[k] = v
                        }
                    }
                    setClinicalData(clinical)
                    clinicalDataRef.current = clinical

                    // Auto-fetch latest authorization units from client record
                    if (existingNote.client_id && !existingNote.is_locked) {
                        try {
                            const auths = await clientsApi.getAuthorizations(existingNote.client_id)
                            const active = auths.find((a: any) =>
                                new Date(a.end_date) >= new Date() && new Date(a.start_date) <= new Date()
                            )
                            if (active) {
                                const updated = {
                                    ...clinical,
                                    auth_authorized: String(active.units_approved),
                                    auth_used: String(active.units_used),
                                }
                                setClinicalData(updated)
                                clinicalDataRef.current = updated
                            }
                        } catch {
                            // keep existing values
                        }
                    }
                }
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load'))
                navigate('/notes')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [id, isNewNote, navigate, appointmentIdParam])

    const handleContentChange = (field: string, value: string) => {
        setFormContent(prev => {
            const updated = { ...prev, [field]: value }
            formContentRef.current = updated
            isDirtyRef.current = true
            return updated
        })
    }

    const handleClinicalChange = (key: string, value: unknown) => {
        setClinicalData(prev => {
            const updated = { ...prev, [key]: value }
            clinicalDataRef.current = updated
            isDirtyRef.current = true
            return updated
        })
    }

    const getMergedNoteData = () => ({
        ...formContentRef.current,
        ...clinicalDataRef.current,
    })

    // Keep isSavingRef in sync
    useEffect(() => { isSavingRef.current = isSaving }, [isSaving])

    // Auto-save every 30 seconds for existing draft notes
    useEffect(() => {
        // Only auto-save existing draft notes (not new unsaved notes)
        if (isNewNote && !note) return
        if (!note || note.status !== 'draft') return

        const interval = setInterval(async () => {
            // Skip if nothing changed or already saving
            if (!isDirtyRef.current || isSavingRef.current) return

            try {
                isSavingRef.current = true
                setIsSaving(true)
                isDirtyRef.current = false

                await notesApi.update(note.id, {
                    note_data: getMergedNoteData(),
                })
                setLastSaved('Auto-saved ' + new Date().toLocaleTimeString())
            } catch {
                // Don't toast on auto-save failures — too disruptive
                isDirtyRef.current = true // Retry on next tick
            } finally {
                setIsSaving(false)
                isSavingRef.current = false
            }
        }, 30_000)

        return () => clearInterval(interval)
    }, [isNewNote, note])

    const handleSaveDraft = async () => {
        setIsSaving(true)
        try {
            if (isNewNote) {
                // Create new note
                if (!selectedClientId) {
                    toast.error('Please select a client')
                    setIsSaving(false)
                    return
                }
                const created = await notesApi.create({
                    client_id: selectedClientId,
                    template_id: selectedTemplate || undefined,
                    note_data: { ...formContent, ...clinicalData },
                    // E24: link the note to the originating appointment so the
                    // calendar can later show "note done" and the dashboard
                    // counters can credit the right session.
                    appointment_id: appointmentIdParam || undefined,
                })
                setNote(created)
                toast.success('Note created')
                // Navigate to the edit URL so subsequent saves update
                navigate(`/notes/${created.id}`, { replace: true })
            } else if (note) {
                // Update existing note
                const updated = await notesApi.update(note.id, {
                    note_data: { ...formContent, ...clinicalData },
                })
                setNote(updated)
                toast.success('Draft saved')
            }
            setLastSaved(new Date().toLocaleTimeString())
            isDirtyRef.current = false // Reset dirty flag after manual save
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleSign = async (signatureDataUrl: string) => {
        if (isSaving) return
        if (!note) return
        setIsSaving(true)
        try {
            await notesApi.sign(note.id, { signature_data: signatureDataUrl })
            setSignature(signatureDataUrl)
            setNote(prev => prev ? { ...prev, status: 'signed' } : prev)
            setShowSignatureModal(false)
            toast.success('Note signed and finalized')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to sign'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleCopyFromLast = async () => {
        const clientId = note?.client_id || selectedClientId
        if (!clientId) {
            toast.error('Please select a client first')
            return
        }
        try {
            const lastNote = await notesApi.lastNote(clientId)
            const nd = lastNote.note_data || {}
            setFormContent({
                objectives: (nd.objectives as string) || '',
                interventions: (nd.interventions as string) || '',
                client_response: (nd.client_response as string) || '',
                notes: (nd.notes as string) || '',
                plan_next_session: (nd.plan_next_session as string) || '',
            })
            formContentRef.current = {
                objectives: (nd.objectives as string) || '',
                interventions: (nd.interventions as string) || '',
                client_response: (nd.client_response as string) || '',
                notes: (nd.notes as string) || '',
                plan_next_session: (nd.plan_next_session as string) || '',
            }
            const clinical: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(nd)) {
                if (k.startsWith('mse_') || k.startsWith('risk_') || k.startsWith('aba_') || k === 'interventions_checklist' || k === 'medical_necessity') {
                    clinical[k] = v
                }
            }
            setClinicalData(clinical)
            clinicalDataRef.current = clinical
            isDirtyRef.current = true
            toast.success('Copied from last signed note — review and update before saving')
        } catch {
            toast.error('No previous signed note found for this client')
        }
    }

    const handleComplete = () => {
        if (isNewNote && !note) {
            toast.error('Please save the note first')
            return
        }
        setShowSignatureModal(true)
    }

    const isFormValid = () => {
        return (
            formContent.objectives.trim() !== '' &&
            formContent.interventions.trim() !== '' &&
            formContent.client_response.trim() !== '' &&
            formContent.notes.trim() !== ''
        )
    }

    const handleRequestCoSign = async () => {
        if (isSaving) return
        if (!note || !selectedSupervisor) return
        setIsSaving(true)
        try {
            await notesApi.requestCoSign(note.id, {
                supervisor_id: selectedSupervisor,
            })
            setCoSignRequested(true)
            setShowCoSignModal(false)
            setSelectedSupervisor('')
            toast.success('Co-sign request sent')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to request co-sign'))
        } finally {
            setIsSaving(false)
        }
    }

    // Check if current user needs co-sign (RBT or supervised staff)
    const requiresCoSign = true // In real app, check user role

    const noteStatus = note?.status || 'draft'
    const clientName = note?.client_name
        || clients.find(c => c.id === selectedClientId)
            ?.first_name + ' ' + clients.find(c => c.id === selectedClientId)?.last_name
        || 'Select Client'
    const providerName = note?.provider_name || 'Current User'

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="note-editor-header">
                <button className="btn-ghost" onClick={() => navigate('/notes')}>
                    <ArrowLeft size={20} />
                    {isNewNote ? 'Back to Notes' : `Back to Notes`}
                </button>

                <div className="note-editor-header-actions">
                    {lastSaved && (
                        <span className="note-editor-saved-indicator">
                            <CheckCircle size={16} weight="fill" className="text-success" />
                            Saved at {lastSaved}
                        </span>
                    )}

                    {note && (
                        <button
                            className="btn-secondary"
                            onClick={() => printNote({
                                id: note.id,
                                client_name: clientName,
                                provider_name: providerName,
                                session_date: note.session_date,
                                service_code: note.service_code,
                                status: note.status,
                                signed_at: note.signed_at,
                                note_data: note.note_data || {},
                                organization_name: user?.organization_name,
                            })}
                        >
                            <FilePdf size={18} />
                            Export PDF
                        </button>
                    )}

                    <button
                        className="btn-secondary"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                    >
                        <FloppyDisk size={18} />
                        {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>

                    <button
                        className="btn-primary"
                        onClick={handleComplete}
                        disabled={!isFormValid() || !!note?.is_locked}
                    >
                        <PencilSimple size={18} />
                        {note?.is_locked ? 'Locked' : 'Complete & Sign'}
                    </button>

                    {requiresCoSign && !note?.is_locked && note && (
                        <button
                            className={`btn-secondary ${coSignRequested ? 'btn-success-outline' : ''}`}
                            onClick={() => setShowCoSignModal(true)}
                            disabled={coSignRequested}
                        >
                            <UserCirclePlus size={18} />
                            {coSignRequested ? 'Co-Sign Requested' : 'Request Co-Sign'}
                        </button>
                    )}
                </div>
            </div>

            <div className="note-editor-layout">
                {/* Client Info Sidebar */}
                <div className="note-editor-sidebar">
                    <div className="note-editor-client-card">
                        {isNewNote && !note ? (
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select
                                    value={selectedClientId}
                                    onChange={async (e) => {
                                        const cid = e.target.value
                                        setSelectedClientId(cid)
                                        if (cid) {
                                            try {
                                                const auths = await clientsApi.getAuthorizations(cid)
                                                const active = auths.find((a: any) =>
                                                    new Date(a.end_date) >= new Date() && new Date(a.start_date) <= new Date()
                                                )
                                                if (active) {
                                                    handleClinicalChange('auth_authorized', String(active.units_approved))
                                                    handleClinicalChange('auth_used', String(active.units_used))
                                                }
                                            } catch {
                                                // no auth found — leave manual
                                            }
                                        }
                                    }}
                                    className="form-input-basic"
                                >
                                    <option value="">Select client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.first_name} {c.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <>
                                <div className="note-editor-client-avatar">
                                    {clientName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h3>{clientName}</h3>
                            </>
                        )}
                    </div>

                    <div className="note-editor-info-section">
                        <h4>Session Details</h4>
                        {note?.session_date && (
                            <div className="note-editor-info-row">
                                <CalendarBlank size={16} />
                                <span>{formatDateSafe(note.session_date, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}</span>
                            </div>
                        )}
                        <div className="note-editor-info-row">
                            <UserIcon size={16} />
                            <span>{providerName}</span>
                        </div>
                    </div>

                    {/* E16: Show client's active diagnoses on every note. Dr. Joe:
                        "session notes and all documentation should have the
                        diagnosis populated". Read-only here — providers update
                        the dx list on the client record itself. */}
                    {(() => {
                        const activeClient = clients.find(c => c.id === (note?.client_id || selectedClientId))
                        const dxCodes = activeClient?.diagnosis_codes || []
                        if (dxCodes.length === 0) return null
                        return (
                            <div className="note-editor-info-section">
                                <h4>Diagnoses</h4>
                                <div className="diagnosis-chip-row">
                                    {dxCodes.map(code => (
                                        <span key={code} className="diagnosis-chip">{code}</span>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}

                    <div className="note-editor-info-section">
                        <h4>Service Information</h4>
                        {isNewNote && !note ? (
                            <div className="form-group">
                                <label className="form-label">Service Code</label>
                                <select
                                    className="form-input-basic"
                                    value={serviceCode}
                                    onChange={(e) => setServiceCode(e.target.value)}
                                >
                                    <option value="">Select a code…</option>
                                    {cptCodes.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.code} — {c.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            note?.service_code && (
                                <div className="note-editor-service-badge">
                                    <span className="service-code">{note.service_code}</span>
                                </div>
                            )
                        )}
                    </div>

                    {/* Treatment Plan Link (BUILD 2.7) */}
                    {(note?.client_id || selectedClientId) && (
                        <div className="note-editor-info-section">
                            <h4>Treatment Plan</h4>
                            <button
                                type="button"
                                className="btn-icon-sm"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => navigate(`/treatment-plans?client=${note?.client_id || selectedClientId}`)}
                            >
                                <FileText size={16} /> View Active Plan
                            </button>
                        </div>
                    )}

                    {/* Authorization Units (BUILD 2.8) */}
                    {(note?.client_id || selectedClientId) && (
                        <div className="note-editor-info-section">
                            <h4>Authorization</h4>
                            <div className="auth-units-grid">
                                <div className="auth-unit">
                                    <span className="auth-unit-label">Authorized</span>
                                    <span className="auth-unit-value">{(clinicalData.auth_authorized as string) || '—'}</span>
                                </div>
                                <div className="auth-unit">
                                    <span className="auth-unit-label">Used</span>
                                    <span className="auth-unit-value">{(clinicalData.auth_used as string) || '—'}</span>
                                </div>
                                <div className="auth-unit">
                                    <span className="auth-unit-label">Remaining</span>
                                    <span className="auth-unit-value">
                                        {clinicalData.auth_authorized && clinicalData.auth_used
                                            ? String(Number(clinicalData.auth_authorized) - Number(clinicalData.auth_used))
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                            {!note?.is_locked && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input
                                        type="number"
                                        className="form-input-basic"
                                        placeholder="Auth"
                                        value={(clinicalData.auth_authorized as string) || ''}
                                        onChange={e => handleClinicalChange('auth_authorized', e.target.value)}
                                        min="0"
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="number"
                                        className="form-input-basic"
                                        placeholder="Used"
                                        value={(clinicalData.auth_used as string) || ''}
                                        onChange={e => handleClinicalChange('auth_used', e.target.value)}
                                        min="0"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="note-editor-info-section">
                        <h4>Note Status</h4>
                        <span className={`status-badge status-${noteStatus}`}>
                            {noteStatus === 'draft' && !coSignRequested && 'Draft'}
                            {noteStatus === 'draft' && coSignRequested && 'Co-Sign Requested'}
                            {noteStatus === 'completed' && 'Completed'}
                            {noteStatus === 'signed' && 'Signed'}
                            {noteStatus === 'co_signed' && 'Co-Signed'}
                        </span>
                    </div>

                    {signature && (
                        <div className="note-editor-info-section">
                            <h4>Signature</h4>
                            <img
                                src={signature}
                                alt="Signature"
                                className="note-editor-signature-preview"
                            />
                            <p className="text-muted text-sm">
                                Signed on {note?.signed_at ? new Date(note.signed_at).toLocaleDateString() : new Date().toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Note Content */}
                <div className="note-editor-content">
                    {/* Template Selection */}
                    <div className="note-editor-template-bar">
                        <FileText size={20} />
                        <span>Template:</span>
                        <div className="select-wrapper">
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                disabled={!!note?.is_locked}
                            >
                                <option value="">No template</option>
                                <option value="aba_session">ABA Session Note</option>
                                <option value="intake">Initial Intake Assessment</option>
                                <option value="progress_update">Progress Update</option>
                                <option value="discharge">Discharge Summary</option>
                            </select>
                            <CaretDown size={16} className="select-icon" />
                        </div>
                        {!note?.is_locked && (
                            <button
                                type="button"
                                className="btn-icon-sm"
                                onClick={handleCopyFromLast}
                                title="Copy data from the last signed note for this client"
                            >
                                <Copy size={16} /> Copy from Last
                            </button>
                        )}
                    </div>

                    {note?.is_locked && (
                        <div className="note-editor-locked-banner">
                            <Warning size={20} />
                            <span>This note has been {noteStatus === 'co_signed' ? 'co-signed' : 'signed'} and is locked. Only an administrator can unlock it for revision.</span>
                        </div>
                    )}

                    {/* E15: Evidence-based intervention checklist sits ABOVE the
                        SOAP narrative so providers pick interventions first,
                        then describe the patient-specific application below.
                        Dr. Joe (2026-05-04): "you pick the evidence-based
                        intervention, then clarify specific interventions and
                        individualized to patient in narrative makes sense as
                        you work through the note." */}
                    <InterventionsChecklist
                        selected={(clinicalData.interventions_checklist as string[]) || []}
                        onChange={(selected) => handleClinicalChange('interventions_checklist', selected)}
                        disabled={!!note?.is_locked}
                        collapsed={collapsedSections.interventions}
                        onToggleCollapse={() => setCollapsedSections(prev => ({ ...prev, interventions: !prev.interventions }))}
                    />

                    {/* Dynamic Form Fields */}
                    <div className="note-editor-form">
                        <div className="note-editor-field">
                            <label>
                                Behavior Targets / Objectives <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Describe the behavior targets worked on during this session..."
                                value={formContent.objectives}
                                onChange={(e) => handleContentChange('objectives', e.target.value)}
                                rows={4}
                                disabled={!!note?.is_locked}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Interventions Used <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Document the specific interventions and techniques used..."
                                value={formContent.interventions}
                                onChange={(e) => handleContentChange('interventions', e.target.value)}
                                rows={4}
                                disabled={!!note?.is_locked}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Client Response <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Describe how the client responded to interventions..."
                                value={formContent.client_response}
                                onChange={(e) => handleContentChange('client_response', e.target.value)}
                                rows={4}
                                disabled={!!note?.is_locked}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Progress Notes <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Document overall progress and observations..."
                                value={formContent.notes}
                                onChange={(e) => handleContentChange('notes', e.target.value)}
                                rows={5}
                                disabled={!!note?.is_locked}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>Plan for Next Session</label>
                            <textarea
                                placeholder="Outline plans and goals for the next session (optional)..."
                                value={formContent.plan_next_session}
                                onChange={(e) => handleContentChange('plan_next_session', e.target.value)}
                                rows={3}
                                disabled={!!note?.is_locked}
                            />
                        </div>
                    </div>

                    {/* Clinical Sections — MSE values are now string[] (E7+E8).
                        Pass raw values; MultiSelectField coerces legacy strings. */}
                    <MentalStatusExam
                        values={Object.fromEntries(
                            Object.entries(clinicalData).filter(([k]) => k.startsWith('mse_'))
                        ) as Record<string, string | string[]>}
                        onChange={handleClinicalChange}
                        disabled={!!note?.is_locked}
                        collapsed={collapsedSections.mse}
                        onToggleCollapse={() => setCollapsedSections(prev => ({ ...prev, mse: !prev.mse }))}
                    />

                    <RiskAssessment
                        values={Object.fromEntries(
                            Object.entries(clinicalData).filter(([k]) => k.startsWith('risk_'))
                        )}
                        onChange={handleClinicalChange}
                        disabled={!!note?.is_locked}
                        collapsed={collapsedSections.risk}
                        onToggleCollapse={() => setCollapsedSections(prev => ({ ...prev, risk: !prev.risk }))}
                    />

                    {ABA_CPT_CODES.includes(serviceCode || note?.service_code || '') && (
                        <ABADataFields
                            values={Object.fromEntries(
                                Object.entries(clinicalData).filter(([k]) => k.startsWith('aba_'))
                            )}
                            onChange={handleClinicalChange}
                            disabled={!!note?.is_locked}
                            collapsed={collapsedSections.aba}
                            onToggleCollapse={() => setCollapsedSections(prev => ({ ...prev, aba: !prev.aba }))}
                        />
                    )}

                    {/* Medical Necessity Statement (BUILD 2.6) */}
                    <div className="clinical-section" style={{ marginTop: '1.5rem' }}>
                        <div className="clinical-section-header" style={{ cursor: 'default' }}>
                            <div className="clinical-section-title">
                                <FileText size={20} weight="duotone" />
                                <h4>Medical Necessity Statement</h4>
                            </div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <textarea
                                className="form-textarea"
                                value={(clinicalData.medical_necessity as string) || DEFAULT_MEDICAL_NECESSITY}
                                onChange={e => handleClinicalChange('medical_necessity', e.target.value)}
                                rows={3}
                                disabled={!!note?.is_locked}
                            />
                        </div>
                    </div>

                    {/* Schedule Next Session (BUILD 2.10) */}
                    {!note?.is_locked && note && (
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="btn-icon-sm"
                                onClick={() => navigate(`/calendar?client=${note.client_id}`)}
                            >
                                <CalendarPlus size={16} /> Schedule Next Session
                            </button>
                        </div>
                    )}

                    {/* E11 + E18: addendum thread is the right way to amend a
                        signed note (the original contents stay sealed). For
                        unsaved drafts there's no parent ID yet, so the form
                        is hidden — but the section is shown so providers know
                        it'll be available after first save. */}
                    {note && (
                        <AddendumThread parentKind="note" parentId={note.id} />
                    )}
                </div>
            </div>

            {/* Signature Modal */}
            <Modal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                title="Sign Session Note"
                size="lg"
            >
                <SignaturePad
                    signerName={providerName}
                    onSave={handleSign}
                    onCancel={() => setShowSignatureModal(false)}
                />
            </Modal>

            {/* Co-Sign Request Modal */}
            <Modal
                isOpen={showCoSignModal}
                onClose={() => setShowCoSignModal(false)}
                title="Request Co-Signature"
                size="md"
            >
                <div className="cosign-modal-content">
                    <p className="cosign-description">
                        Select a supervisor to review and co-sign this session note.
                        They will be notified and can approve or request changes.
                    </p>

                    <div className="form-group">
                        <label className="form-label">Select Supervisor *</label>
                        <select
                            value={selectedSupervisor}
                            onChange={(e) => setSelectedSupervisor(e.target.value)}
                            className="form-input-basic"
                        >
                            <option value="">Choose a supervisor...</option>
                            {supervisors.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.first_name} {s.last_name} {s.credentials ? `(${s.credentials})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="cosign-info-box">
                        <strong>What happens next?</strong>
                        <ul>
                            <li>Your supervisor will receive a notification</li>
                            <li>They can review and add their signature</li>
                            <li>You'll be notified once co-signed</li>
                        </ul>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowCoSignModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleRequestCoSign}
                            disabled={!selectedSupervisor}
                        >
                            <UserCirclePlus size={18} />
                            Send Request
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
