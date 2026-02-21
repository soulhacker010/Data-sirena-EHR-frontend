import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import Modal from '../components/ui/Modal'
import SignaturePad from '../components/ui/SignaturePad'
import { notesApi, clientsApi, usersApi } from '../api'
import type { SessionNote, Client, User } from '../types'
import {
    ArrowLeft,
    User as UserIcon,
    CalendarBlank,
    Clock,
    FloppyDisk,
    CheckCircle,
    PencilSimple,
    Warning,
    FileText,
    CaretDown,
    UserCirclePlus
} from '@phosphor-icons/react'

export default function NoteEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientIdParam = searchParams.get('client')

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
                // Fetch clients and supervisors in parallel
                const [clientsRes, usersRes] = await Promise.all([
                    clientsApi.getAll({ page_size: 500 }),
                    usersApi.getAll({ role: 'supervisor', page_size: 100 }),
                ])
                setClients(clientsRes.results)
                setSupervisors(usersRes.results)

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
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.detail || 'Failed to load')
                navigate('/notes')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [id, isNewNote, navigate])

    const handleContentChange = (field: string, value: string) => {
        setFormContent(prev => {
            const updated = { ...prev, [field]: value }
            formContentRef.current = updated
            isDirtyRef.current = true
            return updated
        })
    }

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
                    note_data: formContentRef.current,
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
                    note_data: formContent,
                    service_code: serviceCode || undefined,
                })
                setNote(created)
                toast.success('Note created')
                // Navigate to the edit URL so subsequent saves update
                navigate(`/notes/${created.id}`, { replace: true })
            } else if (note) {
                // Update existing note
                const updated = await notesApi.update(note.id, {
                    note_data: formContent,
                })
                setNote(updated)
                toast.success('Draft saved')
            }
            setLastSaved(new Date().toLocaleTimeString())
            isDirtyRef.current = false // Reset dirty flag after manual save
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to save')
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
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to sign')
        } finally {
            setIsSaving(false)
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
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to request co-sign')
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
                        disabled={!isFormValid() || noteStatus === 'signed'}
                    >
                        <PencilSimple size={18} />
                        {noteStatus === 'signed' ? 'Signed' : 'Complete & Sign'}
                    </button>

                    {requiresCoSign && noteStatus !== 'signed' && note && (
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
                                    onChange={(e) => setSelectedClientId(e.target.value)}
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
                                <span>{new Date(note.session_date).toLocaleDateString('en-US', {
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

                    <div className="note-editor-info-section">
                        <h4>Service Information</h4>
                        {isNewNote && !note ? (
                            <div className="form-group">
                                <label className="form-label">Service Code</label>
                                <input
                                    type="text"
                                    className="form-input-basic"
                                    placeholder="e.g. 97153"
                                    value={serviceCode}
                                    onChange={(e) => setServiceCode(e.target.value)}
                                />
                            </div>
                        ) : (
                            note?.service_code && (
                                <div className="note-editor-service-badge">
                                    <span className="service-code">{note.service_code}</span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="note-editor-info-section">
                        <h4>Note Status</h4>
                        <span className={`status-badge status-${noteStatus}`}>
                            {noteStatus === 'draft' && 'Draft'}
                            {noteStatus === 'completed' && 'Completed'}
                            {noteStatus === 'signed' && 'Signed'}
                            {noteStatus === 'co_sign_requested' && 'Co-Sign Requested'}
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
                                disabled={noteStatus === 'signed'}
                            >
                                <option value="">No template</option>
                                <option value="aba_session">ABA Session Note</option>
                                <option value="intake">Initial Intake Assessment</option>
                                <option value="progress_update">Progress Update</option>
                                <option value="discharge">Discharge Summary</option>
                            </select>
                            <CaretDown size={16} className="select-icon" />
                        </div>
                    </div>

                    {noteStatus === 'signed' && (
                        <div className="note-editor-locked-banner">
                            <Warning size={20} />
                            <span>This note has been signed and cannot be edited.</span>
                        </div>
                    )}

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
                                disabled={noteStatus === 'signed'}
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
                                disabled={noteStatus === 'signed'}
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
                                disabled={noteStatus === 'signed'}
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
                                disabled={noteStatus === 'signed'}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>Plan for Next Session</label>
                            <textarea
                                placeholder="Outline plans and goals for the next session (optional)..."
                                value={formContent.plan_next_session}
                                onChange={(e) => handleContentChange('plan_next_session', e.target.value)}
                                rows={3}
                                disabled={noteStatus === 'signed'}
                            />
                        </div>
                    </div>
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
