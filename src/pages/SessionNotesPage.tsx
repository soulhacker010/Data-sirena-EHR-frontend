import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { Modal, ConfirmDialog, ActionMenu, EmptyState } from '../components/ui'
import { notesApi, clientsApi, usersApi } from '../api'
import type { SessionNote, Client, User } from '../types'
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

// Note templates (static reference data)
const noteTemplates = [
    { id: 'blank', name: 'Blank Template', objectives: '', interventions: '', clientResponse: '' },
    { id: 'aba_standard', name: 'ABA Standard Session', objectives: 'Work on [skill area] using ABA techniques', interventions: 'DTT, NET, prompting hierarchy, reinforcement', clientResponse: 'Client demonstrated [percentage]% accuracy on target skills' },
    { id: 'parent_training', name: 'Parent Training', objectives: 'Train parent/caregiver on [technique]', interventions: 'Modeling, role-play, feedback, BST', clientResponse: 'Parent demonstrated understanding and ability to implement' },
    { id: 'assessment', name: 'Assessment Session', objectives: 'Complete [assessment name] assessment', interventions: 'Standardized assessment procedures', clientResponse: 'Client participated in assessment activities' },
    { id: 'supervision', name: 'Supervision Session', objectives: 'Provide supervision for [RBT name]', interventions: 'Direct observation, feedback, competency review', clientResponse: 'Supervisee demonstrated competency in observed skills' },
]

// Format date
const formatDate = (date: string | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export default function SessionNotesPage() {
    const [_searchParams] = useSearchParams()
    const [isLoading, setIsLoading] = useState(true)
    const [notes, setNotes] = useState<SessionNote[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [clientsList, setClientsList] = useState<Client[]>([])
    const [providersList, setProvidersList] = useState<User[]>([])

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [providerFilter, setProviderFilter] = useState('')
    const [clientFilter, setClientFilter] = useState('')
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
    const [coSignProviderId, setCoSignProviderId] = useState('')
    const [coSignMessage, setCoSignMessage] = useState('')

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
        sessionDate: '',
        cptCode: '97153',
        objectives: '',
        interventions: '',
        clientResponse: '',
        notes: ''
    })

    // Fetch notes
    const fetchNotes = useCallback(async () => {
        try {
            const params: Record<string, string | number> = {}
            if (statusFilter !== 'all') params.status = statusFilter
            if (providerFilter) params.provider_id = providerFilter
            if (clientFilter) params.client_id = clientFilter
            if (dateFrom) params.start_date = dateFrom
            if (dateTo) params.end_date = dateTo
            const response = await notesApi.getAll(params)
            setNotes(response.results)
            setTotalCount(response.count)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load notes')
        }
    }, [statusFilter, providerFilter, clientFilter, dateFrom, dateTo])

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const [clientsRes, providersRes] = await Promise.all([
                    clientsApi.getAll({ page_size: 500 }),
                    usersApi.getAll({ role: 'provider', page_size: 500 }),
                ])
                setClientsList(clientsRes.results)
                setProvidersList(providersRes.results)
            } catch (err: any) {
                toast.error('Failed to load filter data')
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    // Fetch notes when filters change
    useEffect(() => {
        if (!isLoading) {
            fetchNotes()
        }
    }, [fetchNotes, isLoading])

    // Filter notes by search locally (API handles other filters)
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            (note.client_name || '').toLowerCase().includes(q) ||
            (note.provider_name || '').toLowerCase().includes(q)
        )
    }).sort((a, b) => new Date(b.session_date || b.created_at).getTime() - new Date(a.session_date || a.created_at).getTime())

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
        if (isNoteEditorOpen && selectedNote && formData.clientId) {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
            autoSaveTimer.current = setTimeout(async () => {
                setIsSaving(true)
                try {
                    await notesApi.update(selectedNote.id, {
                        note_data: {
                            objectives: formData.objectives,
                            interventions: formData.interventions,
                            client_response: formData.clientResponse,
                            notes: formData.notes,
                        }
                    })
                    setLastSaved(new Date())
                } catch {
                    // Silent fail for auto-save
                } finally {
                    setIsSaving(false)
                }
            }, 3000)
        }
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        }
    }, [formData, isNoteEditorOpen, selectedNote])

    // Handlers
    const handleNewNote = () => {
        setSelectedNote(null)
        setLastSaved(null)
        setFormData({
            templateId: 'blank',
            clientId: '',
            sessionDate: new Date().toISOString().split('T')[0],
            cptCode: '97153',
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
        const nd = note.note_data || {}
        setFormData({
            templateId: note.template_id || 'blank',
            clientId: note.client_id,
            sessionDate: note.session_date || '',
            cptCode: note.service_code || '97153',
            objectives: (nd.objectives as string) || '',
            interventions: (nd.interventions as string) || '',
            clientResponse: (nd.client_response as string) || '',
            notes: (nd.notes as string) || ''
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
        try {
            await notesApi.delete(selectedNote.id)
            toast.success('Note deleted successfully')
            fetchNotes()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to delete note')
        } finally {
            setIsDeleting(false)
            setIsDeleteDialogOpen(false)
            setSelectedNote(null)
        }
    }

    const handleSaveDraft = async () => {
        if (isSaving) return
        setIsSaving(true)
        try {
            const noteData = {
                objectives: formData.objectives,
                interventions: formData.interventions,
                client_response: formData.clientResponse,
                notes: formData.notes,
            }

            if (selectedNote) {
                await notesApi.update(selectedNote.id, {
                    note_data: noteData,
                })
                toast.success('Note updated')
            } else {
                await notesApi.create({
                    client_id: formData.clientId,
                    template_id: formData.templateId !== 'blank' ? formData.templateId : undefined,
                    note_data: noteData,
                    service_code: formData.cptCode,
                })
                toast.success('Draft saved')
            }
            setIsNoteEditorOpen(false)
            setSelectedNote(null)
            fetchNotes()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to save note')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSignClick = () => {
        setIsNoteEditorOpen(false)
        setIsViewModalOpen(false)
        setIsSignModalOpen(true)
    }

    const handleConfirmSign = async () => {
        if (isSaving) return
        if (!selectedNote) return
        setIsSaving(true)
        try {
            const canvas = signatureCanvasRef.current
            const signatureData = canvas ? canvas.toDataURL() : ''
            await notesApi.sign(selectedNote.id, { signature_data: signatureData })
            toast.success('Note signed successfully')
            fetchNotes()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to sign note')
        } finally {
            setIsSaving(false)
            setIsSignModalOpen(false)
            setSelectedNote(null)
        }
    }

    const handleRequestCoSign = async () => {
        if (isSaving) return
        if (!selectedNote || !coSignProviderId) return
        setIsSaving(true)
        try {
            await notesApi.requestCoSign(selectedNote.id, {
                supervisor_id: coSignProviderId,
                message: coSignMessage || undefined,
            })
            toast.success('Co-sign request sent')
            fetchNotes()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to send co-sign request')
        } finally {
            setIsSaving(false)
            setIsCoSignModalOpen(false)
            setSelectedNote(null)
            setCoSignProviderId('')
            setCoSignMessage('')
        }
    }

    // Note data helpers
    const getNoteObjectives = (note: SessionNote) => (note.note_data?.objectives as string) || ''
    const getNoteInterventions = (note: SessionNote) => (note.note_data?.interventions as string) || ''
    const getNoteClientResponse = (note: SessionNote) => (note.note_data?.client_response as string) || ''
    const getNoteAdditionalNotes = (note: SessionNote) => (note.note_data?.notes as string) || ''

    // Generate action menu items
    const getNoteActions = (note: SessionNote) => {
        const actions: { label: string; icon: React.ReactElement; onClick: () => void; variant?: 'default' | 'danger' }[] = [
            {
                label: 'View Note',
                icon: <Eye size={16} weight="regular" />,
                onClick: () => handleViewNote(note)
            }
        ]

        if (note.status !== 'signed' && note.status !== 'co_signed') {
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
                    <p className="page-subtitle">{totalCount} total notes</p>
                </div>
                <button className="btn-primary" onClick={handleNewNote}>
                    <Plus size={18} weight="bold" />
                    New Note
                </button>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="search-input">
                    <MagnifyingGlass size={18} weight="regular" className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by client or provider..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

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
                        <option value="co_signed">Co-signed</option>
                    </select>
                    <CaretDown size={14} weight="bold" className="filter-caret" />
                </div>

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

                <div className="filter-group">
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Clients</option>
                        {clientsList.map(c => (
                            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                        ))}
                    </select>
                    <CaretDown size={14} weight="bold" className="filter-caret" />
                </div>

                <div className="filter-group date-range">
                    <CalendarBlank size={18} weight="regular" />
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
                            <th>Date</th>
                            <th>Provider</th>
                            <th>CPT Code</th>
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
                                            {(note.client_name || '??').split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="client-info">
                                            <p className="client-name">{note.client_name || 'Unknown'}</p>
                                            <p className="client-meta">{note.service_code || '—'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="date-text">{formatDate(note.session_date || note.created_at)}</span>
                                </td>
                                <td>
                                    <span>{note.provider_name || '—'}</span>
                                </td>
                                <td>
                                    <span>{note.service_code || '—'}</span>
                                </td>
                                <td>
                                    <span className={`badge badge-${note.status}`}>
                                        {note.status === 'draft' && <PencilSimple size={12} weight="bold" />}
                                        {note.status === 'completed' && <Clock size={12} weight="bold" />}
                                        {note.status === 'signed' && <CheckCircle size={12} weight="bold" />}
                                        {note.status === 'co_signed' && <CheckCircle size={12} weight="bold" />}
                                        {note.status.charAt(0).toUpperCase() + note.status.slice(1).replace('_', ' ')}
                                    </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <ActionMenu items={getNoteActions(note)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

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
                                    {(selectedNote.client_name || '??').split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3>{selectedNote.client_name || 'Unknown'}</h3>
                                    <p>{formatDate(selectedNote.session_date || selectedNote.created_at)}</p>
                                </div>
                            </div>
                            <span className={`badge badge-${selectedNote.status}`}>
                                {selectedNote.status.charAt(0).toUpperCase() + selectedNote.status.slice(1).replace('_', ' ')}
                            </span>
                        </div>

                        <div className="note-view-meta">
                            <div className="meta-item">
                                <span className="meta-label">Provider</span>
                                <span className="meta-value">{selectedNote.provider_name || '—'}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">CPT Code</span>
                                <span className="meta-value">{selectedNote.service_code || '—'}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Version</span>
                                <span className="meta-value">{selectedNote.version}</span>
                            </div>
                        </div>

                        <div className="note-view-content">
                            {getNoteObjectives(selectedNote) && (
                                <div className="note-section">
                                    <h4>Session Objectives</h4>
                                    <p>{getNoteObjectives(selectedNote)}</p>
                                </div>
                            )}
                            {getNoteInterventions(selectedNote) && (
                                <div className="note-section">
                                    <h4>Interventions Used</h4>
                                    <p>{getNoteInterventions(selectedNote)}</p>
                                </div>
                            )}
                            {getNoteClientResponse(selectedNote) && (
                                <div className="note-section">
                                    <h4>Client Response</h4>
                                    <p>{getNoteClientResponse(selectedNote)}</p>
                                </div>
                            )}
                            {getNoteAdditionalNotes(selectedNote) && (
                                <div className="note-section">
                                    <h4>Additional Notes</h4>
                                    <p>{getNoteAdditionalNotes(selectedNote)}</p>
                                </div>
                            )}
                        </div>

                        {selectedNote.signed_at && (
                            <div className="note-signature">
                                <CheckCircle size={16} weight="fill" />
                                Signed on {formatDate(selectedNote.signed_at)}
                            </div>
                        )}

                        {selectedNote.co_signed_at && (
                            <div className="note-signature">
                                <CheckCircle size={16} weight="fill" />
                                Co-signed by {selectedNote.co_signer_name || 'supervisor'} on {formatDate(selectedNote.co_signed_at)}
                            </div>
                        )}

                        <div className="note-view-actions">
                            {selectedNote.status !== 'signed' && selectedNote.status !== 'co_signed' && (
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
                                <>
                                    <button className="btn-secondary" onClick={() => {
                                        setIsViewModalOpen(false)
                                        setIsCoSignModalOpen(true)
                                    }}>
                                        <UserPlus size={16} weight="bold" />
                                        Request Co-Sign
                                    </button>
                                    <button className="btn-secondary" onClick={() => {
                                        const nd = selectedNote.note_data || {}
                                        const content = `SESSION NOTE\n============\nClient: ${selectedNote.client_name}\nDate: ${selectedNote.session_date}\nProvider: ${selectedNote.provider_name}\nCPT: ${selectedNote.service_code}\nStatus: ${selectedNote.status}\n\nObjectives: ${nd.objectives || ''}\nInterventions: ${nd.interventions || ''}\nClient Response: ${nd.client_response || ''}\nNotes: ${nd.notes || ''}`
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
                                </>
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
                                    {clientsList.map(c => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                    ))}
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
                        <select
                            className="form-input-basic"
                            value={coSignProviderId}
                            onChange={(e) => setCoSignProviderId(e.target.value)}
                        >
                            <option value="">Choose co-signer...</option>
                            {providersList.map(p => (
                                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Message (optional)</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Add a note for the co-signer..."
                            rows={2}
                            value={coSignMessage}
                            onChange={(e) => setCoSignMessage(e.target.value)}
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
                        <button className="btn-primary" onClick={handleRequestCoSign}>
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
                    ? `Are you sure you want to delete this session note for ${selectedNote.client_name || 'this client'}? This action cannot be undone.`
                    : ''
                }
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
            />
        </DashboardLayout>
    )
}
