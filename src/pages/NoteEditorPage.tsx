import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import Modal from '../components/ui/Modal'
import SignaturePad from '../components/ui/SignaturePad'
import {
    ArrowLeft,
    User,
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

// Mock data for demonstration
const mockNote = {
    id: '1',
    clientId: '1',
    clientName: 'Sarah Johnson',
    clientDOB: 'Mar 15, 1995',
    clientInsurance: 'Blue Cross',
    appointmentDate: '2026-02-09',
    appointmentTime: '10:00 AM - 11:00 AM',
    serviceCode: '97153',
    serviceName: 'Adaptive Behavior Treatment',
    units: 4,
    provider: 'Dr. Amanda Wilson',
    status: 'draft',
    template: 'aba_session',
    lastSaved: null,
    content: {
        behaviorTargets: '',
        interventions: '',
        clientResponse: '',
        progressNotes: '',
        planForNextSession: ''
    }
}

const noteTemplates = [
    { id: 'aba_session', name: 'ABA Session Note' },
    { id: 'intake', name: 'Initial Intake Assessment' },
    { id: 'progress_update', name: 'Progress Update' },
    { id: 'discharge', name: 'Discharge Summary' }
]

// Mock supervisors for co-sign
const supervisors = [
    { id: 1, name: 'Dr. Sarah Mitchell', credentials: 'BCBA-D' },
    { id: 2, name: 'Dr. James Chen', credentials: 'BCBA' },
    { id: 3, name: 'Dr. Maria Garcia', credentials: 'BCBA-D' },
]

export default function NoteEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [note, setNote] = useState(mockNote)
    const [selectedTemplate, setSelectedTemplate] = useState(note.template)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [signature, setSignature] = useState<string | null>(null)
    const [showCoSignModal, setShowCoSignModal] = useState(false)
    const [selectedSupervisor, setSelectedSupervisor] = useState('')
    const [coSignRequested, setCoSignRequested] = useState(false)
    const [_coSignRequestedTo, setCoSignRequestedTo] = useState<string | null>(null)

    // Use id for note loading (will connect to backend)
    const noteId = id || 'new'

    const handleContentChange = (field: string, value: string) => {
        setNote(prev => ({
            ...prev,
            content: {
                ...prev.content,
                [field]: value
            }
        }))
    }

    const handleSaveDraft = async () => {
        setIsSaving(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setLastSaved(new Date().toLocaleTimeString())
        setIsSaving(false)
        toast.success('Draft saved')
    }

    const handleSign = (signatureDataUrl: string) => {
        setSignature(signatureDataUrl)
        setNote(prev => ({ ...prev, status: 'signed' }))
        setShowSignatureModal(false)
        toast.success('Note signed and finalized')
    }

    const handleComplete = () => {
        setShowSignatureModal(true)
    }

    const isFormValid = () => {
        const { content } = note
        return (
            content.behaviorTargets.trim() !== '' &&
            content.interventions.trim() !== '' &&
            content.clientResponse.trim() !== '' &&
            content.progressNotes.trim() !== ''
        )
    }

    const handleRequestCoSign = () => {
        if (selectedSupervisor) {
            const supervisor = supervisors.find(s => s.id === Number(selectedSupervisor))
            if (supervisor) {
                setCoSignRequested(true)
                setCoSignRequestedTo(supervisor.name)
                setShowCoSignModal(false)
                setSelectedSupervisor('')
            }
        }
    }

    // Check if current user needs co-sign (RBT or supervised staff)
    const requiresCoSign = true // In real app, check user role

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="note-editor-header">
                <button className="btn-ghost" onClick={() => navigate('/notes')}>
                    <ArrowLeft size={20} />
                    {noteId === 'new' ? 'Back to Notes' : `Back to Notes (Note #${noteId})`}
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
                        disabled={!isFormValid() || note.status === 'signed'}
                    >
                        <PencilSimple size={18} />
                        {note.status === 'signed' ? 'Signed' : 'Complete & Sign'}
                    </button>

                    {requiresCoSign && note.status !== 'signed' && (
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
                        <div className="note-editor-client-avatar">
                            {note.clientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <h3>{note.clientName}</h3>
                        <p className="text-muted">DOB: {note.clientDOB}</p>
                        <p className="text-muted">{note.clientInsurance}</p>
                    </div>

                    <div className="note-editor-info-section">
                        <h4>Appointment Details</h4>
                        <div className="note-editor-info-row">
                            <CalendarBlank size={16} />
                            <span>{new Date(note.appointmentDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}</span>
                        </div>
                        <div className="note-editor-info-row">
                            <Clock size={16} />
                            <span>{note.appointmentTime}</span>
                        </div>
                        <div className="note-editor-info-row">
                            <User size={16} />
                            <span>{note.provider}</span>
                        </div>
                    </div>

                    <div className="note-editor-info-section">
                        <h4>Service Information</h4>
                        <div className="note-editor-service-badge">
                            <span className="service-code">{note.serviceCode}</span>
                            <span className="service-name">{note.serviceName}</span>
                        </div>
                        <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                            Units: {note.units} ({note.units * 15} minutes)
                        </p>
                    </div>

                    <div className="note-editor-info-section">
                        <h4>Note Status</h4>
                        <span className={`status-badge status-${note.status}`}>
                            {note.status === 'draft' && 'Draft'}
                            {note.status === 'completed' && 'Completed'}
                            {note.status === 'signed' && 'Signed'}
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
                                Signed on {new Date().toLocaleDateString()}
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
                                disabled={note.status === 'signed'}
                            >
                                {noteTemplates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            <CaretDown size={16} className="select-icon" />
                        </div>
                    </div>

                    {note.status === 'signed' && (
                        <div className="note-editor-locked-banner">
                            <Warning size={20} />
                            <span>This note has been signed and cannot be edited.</span>
                        </div>
                    )}

                    {/* Dynamic Form Fields based on template */}
                    <div className="note-editor-form">
                        <div className="note-editor-field">
                            <label>
                                Behavior Targets Addressed <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Describe the behavior targets worked on during this session..."
                                value={note.content.behaviorTargets}
                                onChange={(e) => handleContentChange('behaviorTargets', e.target.value)}
                                rows={4}
                                disabled={note.status === 'signed'}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Interventions Used <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Document the specific interventions and techniques used..."
                                value={note.content.interventions}
                                onChange={(e) => handleContentChange('interventions', e.target.value)}
                                rows={4}
                                disabled={note.status === 'signed'}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Client Response <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Describe how the client responded to interventions..."
                                value={note.content.clientResponse}
                                onChange={(e) => handleContentChange('clientResponse', e.target.value)}
                                rows={4}
                                disabled={note.status === 'signed'}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>
                                Progress Notes <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Document overall progress and observations..."
                                value={note.content.progressNotes}
                                onChange={(e) => handleContentChange('progressNotes', e.target.value)}
                                rows={5}
                                disabled={note.status === 'signed'}
                            />
                        </div>

                        <div className="note-editor-field">
                            <label>Plan for Next Session</label>
                            <textarea
                                placeholder="Outline plans and goals for the next session (optional)..."
                                value={note.content.planForNextSession}
                                onChange={(e) => handleContentChange('planForNextSession', e.target.value)}
                                rows={3}
                                disabled={note.status === 'signed'}
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
                    signerName={note.provider}
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
                                    {s.name} ({s.credentials})
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
