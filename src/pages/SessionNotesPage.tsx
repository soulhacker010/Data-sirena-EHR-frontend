import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { Modal, ConfirmDialog, ActionMenu, EmptyState } from '../components/ui'
import {
    MagnifyingGlass,
    Plus,
    FunnelSimple,
    CaretDown,
    Clock,
    CheckCircle,
    PencilSimple,
    Eye,
    Trash,
    FileText,

    CalendarBlank,
    CloudCheck,
    Spinner,
    Eraser,
    UserPlus
} from '@phosphor-icons/react'

// Session Note type
interface SessionNote {
    id: string
    appointmentId: string
    clientId: number
    clientName: string
    providerId: number
    providerName: string
    sessionDate: string
    sessionType: 'aba_session' | 'parent_training' | 'assessment' | 'supervision'
    status: 'draft' | 'completed' | 'signed' | 'pending_cosign'
    duration: number
    cptCode: string
    units: number
    createdAt: string
    updatedAt: string
    signedAt?: string
    signedBy?: string
    coSignRequested?: boolean
    coSignedBy?: string
    coSignedAt?: string
    templateId?: string
    objectives?: string
    interventions?: string
    clientResponse?: string
    notes?: string
}

// Note templates
const noteTemplates = [
    { id: 'blank', name: 'Blank Template', objectives: '', interventions: '', clientResponse: '' },
    { id: 'aba_standard', name: 'ABA Standard Session', objectives: 'Work on [skill area] using ABA techniques', interventions: 'DTT, NET, prompting hierarchy, reinforcement', clientResponse: 'Client demonstrated [percentage]% accuracy on target skills' },
    { id: 'parent_training', name: 'Parent Training', objectives: 'Train parent/caregiver on [technique]', interventions: 'Modeling, role-play, feedback, BST', clientResponse: 'Parent demonstrated understanding and ability to implement' },
    { id: 'assessment', name: 'Assessment Session', objectives: 'Complete [assessment name] assessment', interventions: 'Standardized assessment procedures', clientResponse: 'Client participated in assessment activities' },
    { id: 'supervision', name: 'Supervision Session', objectives: 'Provide supervision for [RBT name]', interventions: 'Direct observation, feedback, competency review', clientResponse: 'Supervisee demonstrated competency in observed skills' },
]

// Mock session notes data
const mockNotes: SessionNote[] = [
    {
        id: '1',
        appointmentId: '6',
        clientId: 1,
        clientName: 'Sarah Johnson',
        providerId: 1,
        providerName: 'Dr. Smith',
        sessionDate: '2026-02-07',
        sessionType: 'aba_session',
        status: 'signed',
        duration: 120,
        cptCode: '97153',
        units: 8,
        createdAt: '2026-02-07T16:30:00',
        updatedAt: '2026-02-07T17:00:00',
        signedAt: '2026-02-07T17:05:00',
        signedBy: 'Dr. Smith',
        objectives: 'Work on communication skills and following instructions',
        interventions: 'DTT, natural environment teaching',
        clientResponse: 'Client responded well to interventions, achieved 80% accuracy',
        notes: 'Great session overall. Client made progress on imitation skills.'
    },
    {
        id: '2',
        appointmentId: '8',
        clientId: 2,
        clientName: 'Michael Chen',
        providerId: 1,
        providerName: 'Dr. Smith',
        sessionDate: '2026-02-08',
        sessionType: 'parent_training',
        status: 'completed',
        duration: 90,
        cptCode: '97156',
        units: 6,
        createdAt: '2026-02-08T11:45:00',
        updatedAt: '2026-02-08T12:00:00',
        objectives: 'Train parent on prompting strategies',
        interventions: 'Modeling, role-play, feedback',
        clientResponse: 'Parent demonstrated understanding of techniques',
        notes: 'Parent training on implementing DTT at home.'
    },
    {
        id: '3',
        appointmentId: '5',
        clientId: 5,
        clientName: 'Lisa Thompson',
        providerId: 3,
        providerName: 'Dr. Martinez',
        sessionDate: '2026-02-06',
        sessionType: 'assessment',
        status: 'draft',
        duration: 180,
        cptCode: '97151',
        units: 12,
        createdAt: '2026-02-06T12:30:00',
        updatedAt: '2026-02-06T12:30:00',
        objectives: 'Complete initial assessment',
        interventions: 'VB-MAPP, ABLLS-R assessments'
    },
    {
        id: '4',
        appointmentId: '3',
        clientId: 3,
        clientName: 'Emily Davis',
        providerId: 2,
        providerName: 'Dr. Williams',
        sessionDate: '2026-02-04',
        sessionType: 'aba_session',
        status: 'signed',
        duration: 60,
        cptCode: '97153',
        units: 4,
        createdAt: '2026-02-04T11:15:00',
        updatedAt: '2026-02-04T11:30:00',
        signedAt: '2026-02-04T11:35:00',
        signedBy: 'Dr. Williams',
        objectives: 'Social skills and peer interaction',
        interventions: 'Social stories, role-play',
        clientResponse: 'Good engagement with social stories',
        notes: 'Emily showed improvement in turn-taking during activities.'
    },
    {
        id: '5',
        appointmentId: '1',
        clientId: 1,
        clientName: 'Sarah Johnson',
        providerId: 1,
        providerName: 'Dr. Smith',
        sessionDate: '2026-02-03',
        sessionType: 'aba_session',
        status: 'signed',
        duration: 120,
        cptCode: '97153',
        units: 8,
        createdAt: '2026-02-03T11:30:00',
        updatedAt: '2026-02-03T11:45:00',
        signedAt: '2026-02-03T11:50:00',
        signedBy: 'Dr. Smith',
        objectives: 'Work on daily living skills',
        interventions: 'Chaining, task analysis',
        clientResponse: 'Completed 4/5 steps independently',
        notes: 'Continuing to work on hand washing routine.'
    }
]

// Mock providers and clients for filters
const providers = [
    { id: 0, name: 'All Providers' },
    { id: 1, name: 'Dr. Smith' },
    { id: 2, name: 'Dr. Williams' },
    { id: 3, name: 'Dr. Martinez' },
]

const clients = [
    { id: 0, name: 'All Clients' },
    { id: 1, name: 'Sarah Johnson' },
    { id: 2, name: 'Michael Chen' },
    { id: 3, name: 'Emily Davis' },
    { id: 4, name: 'James Wilson' },
    { id: 5, name: 'Lisa Thompson' },
    { id: 6, name: 'David Brown' },
]

// Session type labels
const sessionTypeLabels: Record<string, string> = {
    aba_session: 'ABA Session',
    parent_training: 'Parent Training',
    assessment: 'Assessment',
    supervision: 'Supervision'
}

// Format date
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Format duration
const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
}

export default function SessionNotesPage() {
    const [_searchParams] = useSearchParams()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const [notes, setNotes] = useState<SessionNote[]>(mockNotes)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [providerFilter, setProviderFilter] = useState(0)
    const [clientFilter, setClientFilter] = useState(0)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Modal states
    const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isSignModalOpen, setIsSignModalOpen] = useState(false)
    const [isCoSignModalOpen, setIsCoSignModalOpen] = useState(false)
    const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Auto-save state
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Signature canvas ref
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    // Note editor form
    const [formData, setFormData] = useState({
        templateId: 'blank',
        clientId: '',
        sessionType: 'aba_session',
        sessionDate: '',
        duration: '120',
        cptCode: '97153',
        units: '8',
        objectives: '',
        interventions: '',
        clientResponse: '',
        notes: ''
    })

    // Handle template change
    const handleTemplateChange = (templateId: string) => {
        const template = noteTemplates.find(t => t.id === templateId)
        if (template) {
            setFormData(prev => ({
                ...prev,
                templateId,
                objectives: template.objectives || prev.objectives,
                interventions: template.interventions || prev.interventions,
                clientResponse: template.clientResponse || prev.clientResponse
            }))
        }
    }

    // Auto-save effect
    useEffect(() => {
        if (isNoteEditorOpen && formData.clientId) {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current)
            }
            autoSaveTimer.current = setTimeout(() => {
                setIsSaving(true)
                // Simulate auto-save
                setTimeout(() => {
                    setIsSaving(false)
                    setLastSaved(new Date())
                }, 500)
            }, 3000)
        }
        return () => {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current)
            }
        }
    }, [formData, isNoteEditorOpen])

    // Filter notes
    const filteredNotes = notes.filter(note => {
        const matchesSearch =
            note.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.providerName.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || note.status === statusFilter
        const matchesProvider = providerFilter === 0 || note.providerId === providerFilter
        const matchesClient = clientFilter === 0 || note.clientId === clientFilter

        // Date range filter
        const noteDate = new Date(note.sessionDate)
        const matchesDateFrom = !dateFrom || noteDate >= new Date(dateFrom)
        const matchesDateTo = !dateTo || noteDate <= new Date(dateTo)

        return matchesSearch && matchesStatus && matchesProvider && matchesClient && matchesDateFrom && matchesDateTo
    }).sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())

    // Handlers
    const handleNewNote = () => {
        setSelectedNote(null)
        setLastSaved(null)
        setFormData({
            templateId: 'blank',
            clientId: '',
            sessionType: 'aba_session',
            sessionDate: new Date().toISOString().split('T')[0],
            duration: '120',
            cptCode: '97153',
            units: '8',
            objectives: '',
            interventions: '',
            clientResponse: '',
            notes: ''
        })
        setIsNoteEditorOpen(true)
    }

    const handleViewNote = (note: SessionNote) => {
        setSelectedNote(note)
        setIsViewModalOpen(true)
    }

    const handleEditNote = (note: SessionNote) => {
        setSelectedNote(note)
        setFormData({
            templateId: 'blank',
            clientId: String(note.clientId),
            sessionType: note.sessionType,
            sessionDate: note.sessionDate,
            duration: String(note.duration),
            cptCode: note.cptCode,
            units: String(note.units),
            objectives: note.objectives || '',
            interventions: note.interventions || '',
            clientResponse: note.clientResponse || '',
            notes: note.notes || ''
        })
        setIsViewModalOpen(false)
        setIsNoteEditorOpen(true)
    }

    const handleDeleteClick = (note: SessionNote) => {
        setSelectedNote(note)
        setIsViewModalOpen(false)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedNote) return
        setIsDeleting(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        setNotes(prev => prev.filter(n => n.id !== selectedNote.id))
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedNote(null)
        toast.success('Note deleted successfully')
    }

    const handleSaveDraft = () => {
        const client = clients.find(c => c.id === Number(formData.clientId))

        if (selectedNote) {
            setNotes(prev => prev.map(n =>
                n.id === selectedNote.id
                    ? {
                        ...n,
                        sessionDate: formData.sessionDate,
                        sessionType: formData.sessionType as SessionNote['sessionType'],
                        duration: Number(formData.duration),
                        cptCode: formData.cptCode,
                        units: Number(formData.units),
                        objectives: formData.objectives,
                        interventions: formData.interventions,
                        clientResponse: formData.clientResponse,
                        notes: formData.notes,
                        updatedAt: new Date().toISOString()
                    }
                    : n
            ))
        } else {
            const newNote: SessionNote = {
                id: String(Date.now()),
                appointmentId: '',
                clientId: Number(formData.clientId),
                clientName: client?.name || 'Unknown',
                providerId: 1,
                providerName: 'Dr. Smith',
                sessionDate: formData.sessionDate,
                sessionType: formData.sessionType as SessionNote['sessionType'],
                status: 'draft',
                duration: Number(formData.duration),
                cptCode: formData.cptCode,
                units: Number(formData.units),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                objectives: formData.objectives,
                interventions: formData.interventions,
                clientResponse: formData.clientResponse,
                notes: formData.notes
            }
            setNotes(prev => [newNote, ...prev])
        }

        setIsNoteEditorOpen(false)
        setSelectedNote(null)
        toast.success(selectedNote ? 'Note updated' : 'Draft saved')
    }

    const handleSignClick = () => {
        setIsNoteEditorOpen(false)
        setIsViewModalOpen(false)
        setIsSignModalOpen(true)
    }

    const handleConfirmSign = () => {
        if (selectedNote) {
            setNotes(prev => prev.map(n =>
                n.id === selectedNote.id
                    ? {
                        ...n,
                        status: 'signed' as const,
                        signedAt: new Date().toISOString(),
                        signedBy: 'Dr. Smith',
                        updatedAt: new Date().toISOString()
                    }
                    : n
            ))
        }
        setIsSignModalOpen(false)
        setSelectedNote(null)
        toast.success('Note signed successfully')
    }

    // Generate action menu items
    const getNoteActions = (note: SessionNote) => {
        const actions: { label: string; icon: React.ReactElement; onClick: () => void; variant?: 'default' | 'danger' }[] = [
            {
                label: 'View Note',
                icon: <Eye size={16} weight="regular" />,
                onClick: () => handleViewNote(note)
            }
        ]

        if (note.status !== 'signed') {
            actions.push({
                label: 'Edit Note',
                icon: <PencilSimple size={16} weight="regular" />,
                onClick: () => handleEditNote(note)
            })
            actions.push({
                label: 'Sign Note',
                icon: <CheckCircle size={16} weight="regular" />,
                onClick: () => {
                    setSelectedNote(note)
                    handleSignClick()
                }
            })
            actions.push({
                label: 'Delete Note',
                icon: <Trash size={16} weight="regular" />,
                onClick: () => handleDeleteClick(note),
                variant: 'danger' as const
            })
        }

        return actions
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
                    <h1 className="page-title">Session Notes</h1>
                    <p className="page-subtitle">{notes.length} total notes</p>
                </div>
                <button className="btn-primary" onClick={handleNewNote}>
                    <Plus size={18} weight="bold" />
                    New Note
                </button>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                {/* Search */}
                <div className="search-input">
                    <MagnifyingGlass size={18} weight="regular" className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by client or provider..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="filter-group">
                    <FunnelSimple size={18} weight="regular" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="completed">Completed</option>
                        <option value="signed">Signed</option>
                    </select>
                    <CaretDown size={14} weight="bold" className="filter-caret" />
                </div>

                {/* Provider Filter */}
                <div className="filter-group">
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

                {/* Client Filter */}
                <div className="filter-group">
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(Number(e.target.value))}
                        className="filter-select"
                    >
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <CaretDown size={14} weight="bold" className="filter-caret" />
                </div>

                {/* Date Range Filter */}
                <div className="filter-group date-range">
                    <CalendarBlank
                        size={18}
                        weight="regular"
                        onClick={() => {
                            const input = document.querySelector('.filter-group.date-range input[type="date"]') as HTMLInputElement;
                            if (input) input.showPicker?.();
                        }}
                    />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="date-input"
                        placeholder="From"
                    />
                    <span className="date-separator">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="date-input"
                        placeholder="To"
                    />
                </div>
            </div>

            {/* Notes Table */}
            <div className="card">
                <table className="data-table notes-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Session Type</th>
                            <th>Date</th>
                            <th>Provider</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredNotes.map((note) => (
                            <tr key={note.id} onClick={() => handleViewNote(note)} className="clickable-row">
                                <td>
                                    <div className="client-cell">
                                        <div className="client-avatar">
                                            {note.clientName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="client-info">
                                            <p className="client-name">{note.clientName}</p>
                                            <p className="client-meta">{note.cptCode} · {note.units} units</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`session-type-badge ${note.sessionType}`}>
                                        {sessionTypeLabels[note.sessionType]}
                                    </span>
                                </td>
                                <td>
                                    <span className="date-text">{formatDate(note.sessionDate)}</span>
                                </td>
                                <td>
                                    <span>{note.providerName}</span>
                                </td>
                                <td>
                                    <span className="duration-text">
                                        <Clock size={14} weight="regular" />
                                        {formatDuration(note.duration)}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge badge-${note.status}`}>
                                        {note.status === 'draft' && <PencilSimple size={12} weight="bold" />}
                                        {note.status === 'completed' && <Clock size={12} weight="bold" />}
                                        {note.status === 'signed' && <CheckCircle size={12} weight="bold" />}
                                        {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                                    </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <ActionMenu items={getNoteActions(note)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Empty State */}
                {filteredNotes.length === 0 && (
                    <EmptyState
                        variant={searchQuery || statusFilter !== 'all' ? 'no-results' : 'no-data'}
                        title={searchQuery || statusFilter !== 'all' ? 'No notes found' : 'No session notes yet'}
                        description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first session note to get started'}
                        actionLabel={!searchQuery && statusFilter === 'all' ? 'New Note' : undefined}
                        onAction={!searchQuery && statusFilter === 'all' ? handleNewNote : undefined}
                    />
                )}
            </div>

            {/* View Note Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedNote(null)
                }}
                title="Session Note"
                size="lg"
            >
                {selectedNote && (
                    <div className="note-view">
                        <div className="note-view-header">
                            <div className="note-view-client">
                                <div className="note-avatar large">
                                    {selectedNote.clientName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3>{selectedNote.clientName}</h3>
                                    <p>{sessionTypeLabels[selectedNote.sessionType]} · {formatDate(selectedNote.sessionDate)}</p>
                                </div>
                            </div>
                            <span className={`badge badge-${selectedNote.status}`}>
                                {selectedNote.status.charAt(0).toUpperCase() + selectedNote.status.slice(1)}
                            </span>
                        </div>

                        <div className="note-view-meta">
                            <div className="meta-item">
                                <span className="meta-label">Provider</span>
                                <span className="meta-value">{selectedNote.providerName}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Duration</span>
                                <span className="meta-value">{formatDuration(selectedNote.duration)}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">CPT Code</span>
                                <span className="meta-value">{selectedNote.cptCode}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Units</span>
                                <span className="meta-value">{selectedNote.units}</span>
                            </div>
                        </div>

                        <div className="note-view-content">
                            {selectedNote.objectives && (
                                <div className="note-section">
                                    <h4>Session Objectives</h4>
                                    <p>{selectedNote.objectives}</p>
                                </div>
                            )}
                            {selectedNote.interventions && (
                                <div className="note-section">
                                    <h4>Interventions Used</h4>
                                    <p>{selectedNote.interventions}</p>
                                </div>
                            )}
                            {selectedNote.clientResponse && (
                                <div className="note-section">
                                    <h4>Client Response</h4>
                                    <p>{selectedNote.clientResponse}</p>
                                </div>
                            )}
                            {selectedNote.notes && (
                                <div className="note-section">
                                    <h4>Additional Notes</h4>
                                    <p>{selectedNote.notes}</p>
                                </div>
                            )}
                        </div>

                        {selectedNote.signedAt && (
                            <div className="note-signature">
                                <CheckCircle size={16} weight="fill" />
                                Signed by {selectedNote.signedBy} on {formatDate(selectedNote.signedAt)}
                            </div>
                        )}

                        <div className="note-view-actions">
                            {selectedNote.status !== 'signed' && (
                                <>
                                    <button className="btn-primary" onClick={() => handleEditNote(selectedNote)}>
                                        <PencilSimple size={16} weight="bold" />
                                        Edit Note
                                    </button>
                                    <button className="btn-secondary" onClick={handleSignClick}>
                                        <CheckCircle size={16} weight="bold" />
                                        Sign Note
                                    </button>
                                    <button className="btn-danger-outline" onClick={() => handleDeleteClick(selectedNote)}>
                                        <Trash size={16} weight="bold" />
                                        Delete
                                    </button>
                                </>
                            )}
                            {selectedNote.status === 'signed' && (
                                <button className="btn-secondary" onClick={() => {
                                    const content = `SESSION NOTE\n============\nClient: ${selectedNote.clientName}\nDate: ${selectedNote.sessionDate}\nProvider: ${selectedNote.providerName}\nType: ${selectedNote.sessionType}\nCPT: ${selectedNote.cptCode}\nStatus: ${selectedNote.status}`
                                    const blob = new Blob([content], { type: 'text/plain' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `note_${selectedNote.id}.txt`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                }}>
                                    <FileText size={16} weight="bold" />
                                    Download PDF
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Note Editor Modal */}
            <Modal
                isOpen={isNoteEditorOpen}
                onClose={() => {
                    setIsNoteEditorOpen(false)
                    setSelectedNote(null)
                }}
                title={selectedNote ? "Edit Session Note" : "New Session Note"}
                size="xl"
            >
                <form className="note-editor">
                    {/* Auto-save indicator */}
                    <div className="auto-save-indicator">
                        {isSaving ? (
                            <><Spinner size={14} className="spin" /> Saving...</>
                        ) : lastSaved ? (
                            <><CloudCheck size={14} weight="fill" className="text-green-500" /> Saved at {lastSaved.toLocaleTimeString()}</>
                        ) : (
                            <span className="text-gray-400">Auto-save enabled</span>
                        )}
                    </div>

                    <div className="note-editor-grid">
                        {/* Left Column - Session Info */}
                        <div className="note-editor-section">
                            <h4>Session Information</h4>

                            {/* Template Selection */}
                            {!selectedNote && (
                                <div className="form-group template-select">
                                    <label className="form-label">Template</label>
                                    <select
                                        value={formData.templateId}
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                        className="form-input-basic"
                                    >
                                        {noteTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                    className="form-input-basic"
                                    required
                                    disabled={!!selectedNote}
                                >
                                    <option value="">Select client</option>
                                    {clients.filter(c => c.id !== 0).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Session Type *</label>
                                <select
                                    value={formData.sessionType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sessionType: e.target.value }))}
                                    className="form-input-basic"
                                    required
                                >
                                    <option value="aba_session">ABA Session</option>
                                    <option value="parent_training">Parent Training</option>
                                    <option value="assessment">Assessment</option>
                                    <option value="supervision">Supervision</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input
                                    type="date"
                                    value={formData.sessionDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sessionDate: e.target.value }))}
                                    className="form-input-basic"
                                    required
                                />
                            </div>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Duration (min)</label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                                        className="form-input-basic"
                                        min="15"
                                        step="15"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Units</label>
                                    <input
                                        type="number"
                                        value={formData.units}
                                        onChange={(e) => setFormData(prev => ({ ...prev, units: e.target.value }))}
                                        className="form-input-basic"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">CPT Code</label>
                                <select
                                    value={formData.cptCode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cptCode: e.target.value }))}
                                    className="form-input-basic"
                                >
                                    <option value="97151">97151 - Behavior Assessment</option>
                                    <option value="97153">97153 - Adaptive Behavior Treatment</option>
                                    <option value="97155">97155 - Treatment Modification</option>
                                    <option value="97156">97156 - Family Training</option>
                                    <option value="97157">97157 - Group Training</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column - Note Content */}
                        <div className="note-editor-section">
                            <h4>Session Notes</h4>

                            <div className="form-group">
                                <label className="form-label">Session Objectives *</label>
                                <textarea
                                    value={formData.objectives}
                                    onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
                                    className="form-textarea"
                                    placeholder="What were the goals for this session?"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Interventions Used *</label>
                                <textarea
                                    value={formData.interventions}
                                    onChange={(e) => setFormData(prev => ({ ...prev, interventions: e.target.value }))}
                                    className="form-textarea"
                                    placeholder="What interventions and strategies were used?"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Client Response *</label>
                                <textarea
                                    value={formData.clientResponse}
                                    onChange={(e) => setFormData(prev => ({ ...prev, clientResponse: e.target.value }))}
                                    className="form-textarea"
                                    placeholder="How did the client respond to interventions?"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Additional Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="form-textarea"
                                    placeholder="Any additional observations or notes..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="note-editor-actions">
                        <button
                            type="button"
                            onClick={() => {
                                setIsNoteEditorOpen(false)
                                setSelectedNote(null)
                            }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="button" onClick={handleSaveDraft} className="btn-secondary">
                            Save Draft
                        </button>
                        <button type="button" onClick={handleSaveDraft} className="btn-primary">
                            {selectedNote ? 'Save Changes' : 'Create Note'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Sign Note Modal with Signature Pad */}
            <Modal
                isOpen={isSignModalOpen}
                onClose={() => {
                    setIsSignModalOpen(false)
                    setSelectedNote(null)
                }}
                title="Sign Session Note"
                size="md"
            >
                <div className="signature-modal">
                    <p className="signature-disclaimer">
                        By signing this note, I certify that the information is accurate and complete to the best of my knowledge. This action cannot be undone.
                    </p>

                    <div className="signature-pad-container">
                        <label className="form-label">Draw your signature:</label>
                        <canvas
                            ref={signatureCanvasRef}
                            className="signature-canvas"
                            width={400}
                            height={150}
                            onMouseDown={(e) => {
                                setIsDrawing(true)
                                const canvas = signatureCanvasRef.current
                                if (canvas) {
                                    const ctx = canvas.getContext('2d')
                                    if (ctx) {
                                        const rect = canvas.getBoundingClientRect()
                                        ctx.beginPath()
                                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
                                    }
                                }
                            }}
                            onMouseMove={(e) => {
                                if (!isDrawing) return
                                const canvas = signatureCanvasRef.current
                                if (canvas) {
                                    const ctx = canvas.getContext('2d')
                                    if (ctx) {
                                        const rect = canvas.getBoundingClientRect()
                                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
                                        ctx.strokeStyle = '#0d9488'
                                        ctx.lineWidth = 2
                                        ctx.stroke()
                                    }
                                }
                            }}
                            onMouseUp={() => setIsDrawing(false)}
                            onMouseLeave={() => setIsDrawing(false)}
                        />
                        <button
                            type="button"
                            className="btn-icon-sm"
                            onClick={() => {
                                const canvas = signatureCanvasRef.current
                                if (canvas) {
                                    const ctx = canvas.getContext('2d')
                                    ctx?.clearRect(0, 0, canvas.width, canvas.height)
                                }
                            }}
                            title="Clear signature"
                        >
                            <Eraser size={16} /> Clear
                        </button>
                    </div>

                    <div className="signature-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setIsSignModalOpen(false)
                                setSelectedNote(null)
                            }}
                        >
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={handleConfirmSign}>
                            <CheckCircle size={18} weight="bold" /> Sign & Lock Note
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Request Co-Sign Modal */}
            <Modal
                isOpen={isCoSignModalOpen}
                onClose={() => {
                    setIsCoSignModalOpen(false)
                    setSelectedNote(null)
                }}
                title="Request Co-Signature"
                size="sm"
            >
                <div className="cosign-modal">
                    <p className="cosign-description">
                        Select a supervisor or BCBA to co-sign this session note.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Select Provider</label>
                        <select className="form-input-basic">
                            <option value="">Choose co-signer...</option>
                            {providers.filter(p => p.id !== 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Message (optional)</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Add a note for the co-signer..."
                            rows={2}
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setIsCoSignModalOpen(false)
                                setSelectedNote(null)
                            }}
                        >
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={() => {
                            // Mark note as pending co-sign
                            if (selectedNote) {
                                setNotes(prev => prev.map(n =>
                                    n.id === selectedNote.id ? { ...n, status: 'pending_cosign' as const } : n
                                ))
                            }
                            setIsCoSignModalOpen(false)
                            setSelectedNote(null)
                        }}>
                            <UserPlus size={18} weight="bold" /> Send Request
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false)
                    setSelectedNote(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Note"
                message={selectedNote
                    ? `Are you sure you want to delete this session note for ${selectedNote.clientName}? This action cannot be undone.`
                    : ''
                }
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
            />
        </DashboardLayout>
    )
}
