import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../utils/errors'
import { calculateAge, formatDateSafe } from '../utils/dates'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { Modal, EditClientModal, EmptyState, PageSkeleton, ConfirmDialog } from '../components/ui'
import { ContactNotesTab, ServiceCategoryBadges } from '../components/shared'
import { BLSHistorySection } from '../components/bls'
import { clientsApi, billingApi, notesApi, appointmentsApi, intakesApi } from '../api'
import type { IntakeListItem } from '../api/intakes'

import { useAuth } from '../context'
import { BILLING_ROLES } from '../utils/permissions'
import type { ClientDetail, Authorization, ClientDocument, Invoice, Payment, Claim, SessionNote, Appointment } from '../types'
import {
    ArrowLeft,
    User,
    Phone,
    EnvelopeSimple,
    MapPin,
    Calendar,
    Clock,
    FileText,
    CurrencyDollar,
    ShieldCheck,
    PencilSimple,
    Plus,
    CaretRight,
    UploadSimple,
    Eye,
    DownloadSimple,
    Trash,
    File,
    FilePdf,
    FileDoc,
    Image,
    Receipt,
    CheckCircle,
    ClipboardText,
    Eraser,
    ChatCircleText,
    Waveform,
} from '@phosphor-icons/react'

// Tab type
type TabType = 'profile' | 'insurance' | 'authorizations' | 'appointments' | 'notes' | 'intakes' | 'contacts' | 'documents' | 'bls' | 'billing'

// Format date — delegate to timezone-safe utility
const formatDate = (date: string | undefined) => formatDateSafe(date)

// Format currency
const formatCurrency = (amount: number | string | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0)
}

// Get file icon
const getFileIcon = (type: string) => {
    const lower = type.toLowerCase()
    if (lower.includes('pdf')) return <FilePdf size={24} weight="duotone" className="text-red-500" />
    if (lower.includes('doc')) return <FileDoc size={24} weight="duotone" className="text-blue-500" />
    if (lower.includes('image') || lower.includes('jpg') || lower.includes('png'))
        return <Image size={24} weight="duotone" className="text-green-500" />
    return <File size={24} weight="duotone" className="text-gray-500" />
}

// Format file size
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const openExternalDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ClientDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const canAccessBilling = user ? BILLING_ROLES.includes(user.role) : false

    const [client, setClient] = useState<ClientDetail | null>(null)
    const [authorizations, setAuthorizations] = useState<Authorization[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [claims, setClaims] = useState<Claim[]>([])
    const [clientNotes, setClientNotes] = useState<SessionNote[]>([])
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [intakes, setIntakes] = useState<IntakeListItem[]>([])

    const [activeTab, setActiveTab] = useState<TabType>('profile')
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isPostPaymentModalOpen, setIsPostPaymentModalOpen] = useState(false)
    const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false)
    const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
    const [deleteDocName, setDeleteDocName] = useState<string | null>(null)
    
    // Payment form state
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('credit_card')
    const [paymentReference, setPaymentReference] = useState('')

    // Post payment form state
    const [postInsurancePaid, setPostInsurancePaid] = useState('')
    const [postPatientResp, setPostPatientResp] = useState('')
    const [postWriteOff, setPostWriteOff] = useState('')
    const [postReference, setPostReference] = useState('')
    const [postNotes, setPostNotes] = useState('')

    // Write-off form state
    const [writeOffAmount, setWriteOffAmount] = useState('')
    const [writeOffReason, setWriteOffReason] = useState('')
    const [writeOffNotes, setWriteOffNotes] = useState('')

    // Upload ref
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Load client detail + related data
    useEffect(() => {
        if (!id) return
        const load = async () => {
            setIsLoading(true)
            try {
                const [clientData, notesRes, appointmentsRes, intakesRes] = await Promise.all([
                    clientsApi.getById(id),
                    notesApi.getAll({ client_id: id, page_size: 100 }),
                    appointmentsApi.getAll({ client_id: id, start_date: '2020-01-01', end_date: '2030-12-31' }),
                    intakesApi.getAll({ client: id, page: 1 }),
                ])
                setClient(clientData)
                setAuthorizations(clientData.authorizations || [])
                setClientNotes(notesRes.results)
                setAppointments(appointmentsRes)
                setIntakes(intakesRes.results)

                if (canAccessBilling) {
                    const [invoicesRes, paymentsRes, claimsData] = await Promise.all([
                        billingApi.getInvoices({ client_id: id }),
                        billingApi.getPayments({ client_id: id }),
                        billingApi.getClientClaims(id),
                    ])
                    setInvoices(invoicesRes.results)
                    setPayments(paymentsRes.results)
                    setClaims(claimsData)
                }
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load client'))
                navigate('/clients')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [id, navigate])

    // Refresh client
    const refreshClient = async () => {
        if (!id) return
        try {
            const [clientData, notesRes] = await Promise.all([
                clientsApi.getById(id),
                notesApi.getAll({ client_id: id, page_size: 100 }),
            ])
            setClient(clientData)
            setAuthorizations(clientData.authorizations || [])
            setClientNotes(notesRes.results)
        } catch {
            // silent
        }
    }

    // Refresh billing
    const refreshBilling = async () => {
        if (!id) return
        try {
            const [invoicesRes, paymentsRes, claimsData] = await Promise.all([
                billingApi.getInvoices({ client_id: id }),
                billingApi.getPayments({ client_id: id }),
                billingApi.getClientClaims(id),
            ])
            setInvoices(invoicesRes.results)
            setPayments(paymentsRes.results)
            setClaims(claimsData)
        } catch {
            // silent
        }
    }

    // Handle New Session
    const handleNewSession = () => {
        navigate(`/calendar?clientId=${id}&action=new`)
    }

    // Handle Edit Client
    const handleEditClient = () => {
        setIsEditModalOpen(true)
    }

    const resetPaymentForm = () => {
        setPaymentAmount('')
        setPaymentMethod('credit_card')
        setPaymentReference('')
    }

    const handleRecordPayment = async () => {
        if (isSaving) return
        if (!paymentAmount || !id) return
        const amount = parseFloat(paymentAmount)
        if (amount <= 0) {
            toast.error('Amount must be greater than zero')
            return
        }

        // We need an invoice_id; in this flow we pick the first unpaid invoice
        const unpaid = invoices.find(inv => inv.status !== 'paid' && Number(inv.balance || 0) > 0)
        if (!unpaid) {
            toast.error('No outstanding invoice found')
            return
        }
        if (amount > Number(unpaid.balance || 0)) {
            toast.error(`Payment exceeds balance due of ${formatCurrency(unpaid.balance)}`)
            return
        }

        setIsSaving(true)
        try {
            await billingApi.recordPayment({
                invoice_id: unpaid.id,
                amount,
                payment_method: paymentMethod as 'credit_card' | 'eft' | 'check' | 'cash' | 'other',
                notes: paymentReference || undefined,
            })
            toast.success(`Payment of ${formatCurrency(amount)} recorded`)
            setIsPaymentModalOpen(false)
            resetPaymentForm()
            refreshBilling()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to record payment'))
        } finally {
            setIsSaving(false)
        }
    }

    // Handle post payment to claim
    const handlePostClaimPayment = async () => {
        if (!selectedClaimId) return
        try {
            await billingApi.postClaimPayment(selectedClaimId, {
                insurance_paid: parseFloat(postInsurancePaid) || 0,
                patient_responsibility: parseFloat(postPatientResp) || 0,
                write_off_amount: parseFloat(postWriteOff) || 0,
                reference_number: postReference || undefined,
                notes: postNotes || undefined,
            })
            toast.success('Payment posted to claim')
            setIsPostPaymentModalOpen(false)
            setSelectedClaimId(null)
            setPostInsurancePaid('')
            setPostPatientResp('')
            setPostWriteOff('')
            setPostReference('')
            setPostNotes('')
            refreshBilling()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to post payment'))
        }
    }

    // Handle write-off
    const handleWriteOff = async () => {
        if (!selectedClaimId) return
        try {
            await billingApi.writeOffClaim(selectedClaimId, {
                amount: parseFloat(writeOffAmount) || 0,
                reason: writeOffReason,
                notes: writeOffNotes || undefined,
            })
            toast.success('Write-off applied')
            setIsWriteOffModalOpen(false)
            setSelectedClaimId(null)
            setWriteOffAmount('')
            setWriteOffReason('')
            setWriteOffNotes('')
            refreshBilling()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to apply write-off'))
        }
    }

    // Handle document upload
    const handleUploadDocument = async (file: File) => {
        if (isSaving) return
        if (!id) return
        setIsSaving(true)
        try {
            await clientsApi.uploadDocument(id, file)
            toast.success('Document uploaded')
            setIsUploadModalOpen(false)
            refreshClient()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Upload failed'))
        } finally {
            setIsSaving(false)
        }
    }

    // Handle document delete
    const handleDeleteDocument = async () => {
        if (isSaving) return
        if (!id || !deleteDocId) return
        setIsSaving(true)
        try {
            await clientsApi.deleteDocument(id, deleteDocId)
            toast.success(`${deleteDocName} deleted`)
            setDeleteDocId(null)
            setDeleteDocName(null)
            refreshClient()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to delete document'))
        } finally {
            setIsSaving(false)
        }
    }

    const handlePreviewDocument = async (doc: ClientDocument) => {
        if (!id) return

        try {
            const { url } = await clientsApi.getDocumentAccessUrl(id, doc.id)
            openExternalDocument(url)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Document preview is unavailable'))
        }
    }

    const handleDownloadDocument = async (doc: ClientDocument) => {
        if (!id) return

        try {
            const { url } = await clientsApi.getDocumentAccessUrl(id, doc.id, true)
            openExternalDocument(url)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Document download is unavailable'))
        }
    }

    if (isLoading || !client) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    const documents = client.documents || []
    const balance = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + parseFloat(String(inv.balance || 0)), 0)
    const selectedOutstandingInvoice = invoices.find(
        inv => inv.status !== 'paid' && Number(inv.balance || 0) > 0
    ) || null

    return (
        <DashboardLayout>
            {/* Back Link & Header */}
            <div className="detail-header">
                <Link to="/clients" className="back-link">
                    <ArrowLeft size={18} weight="bold" />
                    Back to Clients
                </Link>

                <div className="detail-header-content">
                    <div className="detail-header-left">
                        <div className="detail-avatar">
                            {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <div className="detail-info">
                            <h1 className="detail-title">
                                {client.first_name} {client.last_name}
                            </h1>
                            <p className="detail-meta">
                                {client.gender || 'N/A'} · Age {calculateAge(client.date_of_birth)} · DOB {formatDate(client.date_of_birth)}
                                {client.mrn && <> · <span className="mrn-badge">MRN: {client.mrn}</span></>}
                            </p>
                            {/* E21: service categories under the meta line so the
                                billing/admin reader sees Psych/OT/etc at a glance
                                on the client header. */}
                            {client.service_categories && client.service_categories.length > 0 && (
                                <div style={{ marginTop: '0.375rem' }}>
                                    <ServiceCategoryBadges
                                        categories={client.service_categories}
                                        long
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="detail-header-actions">
                        <button className="btn-secondary" onClick={handleEditClient}>
                            <PencilSimple size={18} weight="bold" />
                            Edit Client
                        </button>
                        <button className="btn-primary" onClick={handleNewSession}>
                            <Plus size={18} weight="bold" />
                            New Session
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="client-tabs">
                <button className={`client-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    <User size={18} weight="duotone" /> Profile
                </button>
                <button className={`client-tab ${activeTab === 'insurance' ? 'active' : ''}`} onClick={() => setActiveTab('insurance')}>
                    <ShieldCheck size={18} weight="duotone" /> Insurance
                </button>
                <button className={`client-tab ${activeTab === 'authorizations' ? 'active' : ''}`} onClick={() => setActiveTab('authorizations')}>
                    <FileText size={18} weight="duotone" /> Authorizations
                </button>
                <button className={`client-tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
                    <Calendar size={18} weight="duotone" /> Appointments
                </button>
                <button className={`client-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    <FileText size={18} weight="duotone" /> Notes
                </button>
                <button className={`client-tab ${activeTab === 'intakes' ? 'active' : ''}`} onClick={() => setActiveTab('intakes')}>
                    <ClipboardText size={18} weight="duotone" /> Intakes
                </button>
                <button className={`client-tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
                    <ChatCircleText size={18} weight="duotone" /> Contacts
                </button>
                <button className={`client-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
                    <File size={18} weight="duotone" /> Documents
                </button>
                <button className={`client-tab ${activeTab === 'bls' ? 'active' : ''}`} onClick={() => setActiveTab('bls')}>
                    <Waveform size={18} weight="duotone" /> BLS
                </button>
                {canAccessBilling && (
                    <button className={`client-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                        <CurrencyDollar size={18} weight="duotone" /> Billing
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="client-tab-content">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="detail-grid">
                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Contact Information</h2>
                                </div>
                                <div className="card-body">
                                    <div className="info-list">
                                        <div className="info-item">
                                            <Phone size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Phone</p>
                                                <p className="info-value">{client.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <EnvelopeSimple size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Email</p>
                                                <p className="info-value">{client.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <MapPin size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Address</p>
                                                <p className="info-value">
                                                    {[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ') || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Emergency Contact</h2>
                                    <button className="btn-secondary btn-sm" onClick={handleEditClient}>
                                        <PencilSimple size={16} weight="bold" />
                                        Edit
                                    </button>
                                </div>
                                <div className="card-body">
                                    <div className="info-list">
                                        <div className="info-item">
                                            <User size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Name</p>
                                                <p className="info-value">{client.emergency_contact_name || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <Phone size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Phone</p>
                                                <p className="info-value">{client.emergency_contact_phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Diagnoses */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Diagnoses</h2>
                                </div>
                                <div className="card-body">
                                    <div className="diagnosis-list">
                                        {(client.diagnosis_codes || []).length > 0 ? (
                                            client.diagnosis_codes.map((code, index) => (
                                                <div key={index} className="diagnosis-item">
                                                    <span className="diagnosis-code">{code}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted">No diagnoses recorded</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Quick Stats</h2>
                                </div>
                                <div className="card-body">
                                    <div className="quick-stats">
                                        <div className="quick-stat">
                                            <p className="quick-stat-value">{clientNotes.length}</p>
                                            <p className="quick-stat-label">Recent Sessions</p>
                                        </div>
                                        <div className="quick-stat">
                                            <p className="quick-stat-value">{authorizations.length}</p>
                                            <p className="quick-stat-label">Active Auths</p>
                                        </div>
                                        <div className="quick-stat">
                                            <p className="quick-stat-value">{formatCurrency(balance)}</p>
                                            <p className="quick-stat-label">Balance</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Sessions Preview */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Recent Sessions</h2>
                                    <button className="card-link" onClick={() => setActiveTab('notes')}>
                                        View all <CaretRight size={14} weight="bold" />
                                    </button>
                                </div>
                                <div className="card-body p-0">
                                    <div className="session-list">
                                        {clientNotes.slice(0, 3).map((note) => (
                                            <div key={note.id} className="session-item">
                                                <div className="session-date">
                                                    <Calendar size={16} weight="regular" />
                                                    {formatDate(note.session_date || note.created_at)}
                                                </div>
                                                <div className="session-info">
                                                    <p className="session-type">{note.service_code || '—'}</p>
                                                    <p className="session-meta">
                                                        <Clock size={12} weight="regular" />
                                                        {note.provider_name || '—'}
                                                    </p>
                                                </div>
                                                <span className={`badge badge-${note.status === 'signed' || note.status === 'co_signed' ? 'success' : note.status === 'draft' ? 'neutral' : 'warning'}`}>
                                                    {note.status.charAt(0).toUpperCase() + note.status.slice(1).replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                        {clientNotes.length === 0 && (
                                            <p className="text-muted text-center" style={{ padding: '1rem' }}>No recent sessions</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Insurance Tab */}
                {activeTab === 'insurance' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Primary Insurance</h2>
                        </div>
                        <div className="card-body">
                            <div className="insurance-detail-grid">
                                <div className="insurance-field">
                                    <p className="field-label">Insurance Provider</p>
                                    <p className="field-value">{client.insurance_primary_name || 'N/A'}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Member ID</p>
                                    <p className="field-value">{client.insurance_primary_id || 'N/A'}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Group Number</p>
                                    <p className="field-value">{client.insurance_primary_group || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        {client.insurance_secondary_name && (
                            <>
                                <div className="card-header" style={{ borderTop: '1px solid var(--border)' }}>
                                    <h2 className="card-title">Secondary Insurance</h2>
                                </div>
                                <div className="card-body">
                                    <div className="insurance-detail-grid">
                                        <div className="insurance-field">
                                            <p className="field-label">Insurance Provider</p>
                                            <p className="field-value">{client.insurance_secondary_name}</p>
                                        </div>
                                        <div className="insurance-field">
                                            <p className="field-label">Member ID</p>
                                            <p className="field-value">{client.insurance_secondary_id || 'N/A'}</p>
                                        </div>
                                        <div className="insurance-field">
                                            <p className="field-label">Group Number</p>
                                            <p className="field-value">{client.insurance_secondary_group || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Authorizations Tab */}
                {activeTab === 'authorizations' && (
                    <div className="space-y-4">
                        {authorizations.length > 0 ? authorizations.map(auth => {
                            const percent = auth.units_approved > 0
                                ? Math.round((auth.units_used / auth.units_approved) * 100)
                                : 0
                            const remaining = auth.units_approved - auth.units_used
                            return (
                                <div key={auth.id} className="card">
                                    <div className="card-header">
                                        <h2 className="card-title">{auth.service_code || 'Authorization'} — {auth.insurance_name}</h2>
                                        {auth.authorization_number && (
                                            <span className="badge badge-active">#{auth.authorization_number}</span>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        <p className="auth-dates">
                                            {formatDate(auth.start_date)} - {formatDate(auth.end_date)}
                                        </p>
                                        <div className="auth-progress">
                                            <div className="auth-progress-header">
                                                <span>{auth.units_used} / {auth.units_approved} units</span>
                                                <span className={percent >= 80 ? 'text-red-500' : 'text-teal-600'}>{percent}%</span>
                                            </div>
                                            <div className="auth-progress-bar">
                                                <div
                                                    className={`auth-progress-fill ${percent >= 80 ? 'critical' : ''}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <p className="auth-remaining">
                                                {remaining} units remaining
                                                {percent >= 80 && <span className="text-red-500 ml-2">· Renewal needed soon</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        }) : (
                            <EmptyState
                                variant="no-data"
                                title="No authorizations"
                                description="Authorizations will appear here once added."
                            />
                        )}
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Appointments</h2>
                            <button
                                className="btn-primary btn-sm"
                                onClick={() => navigate(`/calendar?clientId=${id}&action=new`)}
                            >
                                <Plus size={16} weight="bold" /> Schedule Appointment
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {appointments.length > 0 ? (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date & Time</th>
                                            <th>Provider</th>
                                            <th>Service</th>
                                            <th>Duration</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments
                                            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                                            .map(apt => {
                                                const startDate = new Date(apt.start_time)
                                                const endDate = new Date(apt.end_time)
                                                const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
                                                
                                                return (
                                                    <tr key={apt.id}>
                                                        <td>
                                                            <div>
                                                                <p className="font-medium">{formatDate(apt.start_time)}</p>
                                                                <p className="text-sm text-muted">
                                                                    {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td>{apt.provider.first_name} {apt.provider.last_name}</td>
                                                        <td>
                                                            <span className="cpt-code">{apt.service_code || '—'}</span>
                                                            {apt.units && <span className="text-muted text-sm"> ({apt.units} units)</span>}
                                                        </td>
                                                        <td>{duration} min</td>
                                                        <td>
                                                            <span className={`badge badge-${
                                                                apt.status === 'attended' ? 'success' : 
                                                                apt.status === 'cancelled' ? 'neutral' : 
                                                                apt.status === 'no_show' ? 'error' : 
                                                                'pending'
                                                            }`}>
                                                                {apt.status === 'attended' ? 'Completed' : 
                                                                 apt.status === 'no_show' ? 'No-show' :
                                                                 apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn-sm btn-secondary"
                                                                onClick={() => navigate(`/calendar`)}
                                                                title="View in Calendar"
                                                            >
                                                                <Calendar size={14} weight="bold" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState
                                    variant="no-data"
                                    title="No appointments yet"
                                    description="Schedule an appointment to get started."
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Session Notes</h2>
                            <button
                                className="btn-primary btn-sm"
                                onClick={() => navigate(`/notes?client=${id}&new=1`)}
                            >
                                <Plus size={16} weight="bold" /> New Note
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {clientNotes.length > 0 ? (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Service Code</th>
                                            <th>Provider</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clientNotes.map(note => (
                                            <tr
                                                key={note.id}
                                                className="clickable-row"
                                                onClick={() => navigate(`/notes?client=${id}&note=${note.id}`)}
                                            >
                                                <td>{formatDate(note.session_date || note.created_at)}</td>
                                                <td><span className="cpt-code">{note.service_code || '—'}</span></td>
                                                <td>{note.provider_name || '—'}</td>
                                                <td>
                                                    <span className={`badge badge-${note.status === 'signed' || note.status === 'co_signed' ? 'success' : note.status === 'draft' ? 'neutral' : 'warning'}`}>
                                                        {note.status.charAt(0).toUpperCase() + note.status.slice(1).replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState
                                    variant="no-data"
                                    title="No session notes yet"
                                    description="Session notes will appear here after appointments."
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Intakes Tab */}
                {activeTab === 'intakes' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Intake Assessments</h2>
                            <button
                                className="btn-primary btn-sm"
                                onClick={() => navigate(`/intakes/new?client=${id}`)}
                            >
                                <Plus size={16} weight="bold" /> New Intake
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {intakes.length > 0 ? (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Provider</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {intakes.map(intake => (
                                            <tr
                                                key={intake.id}
                                                className="clickable-row"
                                                onClick={() => navigate(`/intakes/${intake.id}/edit`)}
                                            >
                                                <td>{formatDate(intake.assessment_date)}</td>
                                                <td>{intake.provider_name || '—'}</td>
                                                <td>
                                                    <span className={`badge badge-${intake.status === 'signed' || intake.status === 'co_signed' ? 'success' : intake.status === 'draft' ? 'neutral' : 'warning'}`}>
                                                        {intake.status.charAt(0).toUpperCase() + intake.status.slice(1).replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState
                                    variant="no-data"
                                    title="No intake assessments yet"
                                    description="Intake assessments for this client will appear here."
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Contacts Tab — non-billable contact log (E19) */}
                {activeTab === 'contacts' && id && (
                    <ContactNotesTab clientId={id} />
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Documents</h2>
                            <button className="btn-primary btn-sm" onClick={() => setIsUploadModalOpen(true)}>
                                <UploadSimple size={16} weight="bold" /> Upload
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {documents.length > 0 ? (
                                <div className="documents-grid">
                                    {documents.map((doc: ClientDocument) => (
                                        <div key={doc.id} className="document-card">
                                            <div className="document-icon">
                                                {getFileIcon(doc.file_type)}
                                            </div>
                                            <div className="document-info">
                                                <p className="document-name">{doc.file_name}</p>
                                                <p className="document-meta">{formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}</p>
                                            </div>
                                            <div className="document-actions">
                                                <button className="btn-icon-sm" title="Preview" onClick={() => handlePreviewDocument(doc)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="btn-icon-sm" title="Download" onClick={() => handleDownloadDocument(doc)}>
                                                    <DownloadSimple size={16} />
                                                </button>
                                                <button className="btn-icon-sm danger" title="Delete" onClick={() => {
                                                    setDeleteDocId(doc.id)
                                                    setDeleteDocName(doc.file_name)
                                                }}>
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    variant="no-data"
                                    title="No documents uploaded"
                                    description="Upload documents to keep client records organized."
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* BLS (Bilateral Stimulation) Tab */}
                {activeTab === 'bls' && client && id && (
                    <BLSHistorySection
                        clientId={id}
                        clientName={`${client.first_name} ${client.last_name}`}
                    />
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        {/* Billing Summary Cards */}
                        <div className="billing-summary-grid">
                            <div className="billing-summary-card">
                                <div className="summary-icon">
                                    <CurrencyDollar size={24} weight="duotone" />
                                </div>
                                <div className="summary-content">
                                    <p className="summary-label">Outstanding Balance</p>
                                    <p className="summary-value">{formatCurrency(balance)}</p>
                                </div>
                            </div>
                            <div className="billing-summary-card">
                                <div className="summary-icon">
                                    <Receipt size={24} weight="duotone" />
                                </div>
                                <div className="summary-content">
                                    <p className="summary-label">Total Invoiced</p>
                                    <p className="summary-value">{formatCurrency(invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0))}</p>
                                </div>
                            </div>
                            <div className="billing-summary-card">
                                <div className="summary-icon">
                                    <CheckCircle size={24} weight="duotone" />
                                </div>
                                <div className="summary-content">
                                    <p className="summary-label">Total Paid</p>
                                    <p className="summary-value text-green-600">{formatCurrency(payments.reduce((sum, pmt) => sum + Number(pmt.amount || 0), 0))}</p>
                                </div>
                            </div>
                            <div className="billing-summary-card">
                                <div className="summary-icon">
                                    <ShieldCheck size={24} weight="duotone" />
                                </div>
                                <div className="summary-content">
                                    <p className="summary-label">Insurance Claims</p>
                                    <p className="summary-value">{claims.filter(c => c.status !== 'denied').length} of {claims.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="billing-actions">
                            <button
                                className="btn-primary"
                                onClick={() => setIsPaymentModalOpen(true)}
                                disabled={!selectedOutstandingInvoice}
                            >
                                <Receipt size={18} weight="bold" /> Record Payment
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => navigate('/billing')}
                            >
                                <FileText size={18} weight="bold" /> View All Billing
                            </button>
                        </div>

                        {/* Recent Activity */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">Recent Billing Activity</h2>
                            </div>
                            <div className="card-body p-0">
                                {(() => {
                                    // Combine and sort recent invoices, payments, and claims
                                    const recentActivity = [
                                        ...invoices.slice(0, 3).map(inv => ({
                                            type: 'invoice',
                                            date: inv.invoice_date,
                                            description: `Invoice ${inv.invoice_number}`,
                                            amount: inv.total_amount,
                                            status: inv.status,
                                            id: inv.id
                                        })),
                                        ...payments.slice(0, 3).map(pmt => ({
                                            type: 'payment',
                                            date: pmt.payment_date,
                                            description: `Payment - ${pmt.payment_method}`,
                                            amount: pmt.amount,
                                            status: 'completed',
                                            reference: pmt.reference_number
                                        })),
                                        ...claims.slice(0, 3).map(claim => ({
                                            type: 'claim',
                                            date: claim.submitted_at || claim.created_at,
                                            description: `Claim ${claim.claim_number} - ${claim.payer_name}`,
                                            amount: claim.billed_amount,
                                            status: claim.status,
                                            service: claim.service_code
                                        }))
                                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

                                    return recentActivity.length > 0 ? (
                                        <div className="billing-activity-list">
                                            {recentActivity.map((item, index) => (
                                                <div key={index} className="activity-item">
                                                    <div className="activity-icon">
                                                        {item.type === 'invoice' && <Receipt size={16} weight="duotone" />}
                                                        {item.type === 'payment' && <CurrencyDollar size={16} weight="duotone" />}
                                                        {item.type === 'claim' && <ShieldCheck size={16} weight="duotone" />}
                                                    </div>
                                                    <div className="activity-content">
                                                        <p className="activity-description">{item.description}</p>
                                                        <p className="activity-date">{formatDate(item.date)}</p>
                                                    </div>
                                                    <div className="activity-amount">
                                                        <p className={`activity-value ${item.type === 'payment' ? 'text-green-600' : ''}`}>
                                                            {formatCurrency(item.amount)}
                                                        </p>
                                                        <span className={`badge badge-${item.status === 'paid' || item.status === 'completed' ? 'success' : item.status === 'denied' ? 'error' : 'pending'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted p-4">No recent billing activity</div>
                                    )
                                })()}
                            </div>
                        </div>

                        {/* Outstanding Invoices */}
                        {invoices.filter(inv => inv.status !== 'paid').length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Outstanding Invoices</h2>
                                </div>
                                <div className="card-body p-0">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Invoice #</th>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Balance Due</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoices.filter(inv => inv.status !== 'paid').map(inv => (
                                                <tr key={inv.id}>
                                                    <td>
                                                        <Link to={`/billing/invoices/${inv.id}`} className="invoice-link">
                                                            {inv.invoice_number}
                                                        </Link>
                                                    </td>
                                                    <td>{formatDate(inv.invoice_date)}</td>
                                                    <td>{formatCurrency(inv.total_amount)}</td>
                                                    <td className="font-semibold">{formatCurrency(inv.balance || inv.total_amount)}</td>
                                                    <td>
                                                        <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'warning'}`}>
                                                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Claims */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">Claims</h2>
                            </div>
                            <div className="card-body p-0">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Claim #</th>
                                            <th>Payer</th>
                                            <th>Service</th>
                                            <th>Date</th>
                                            <th>Billed</th>
                                            <th>Ins. Paid</th>
                                            <th>Patient</th>
                                            <th>Write-off</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claims.map(claim => (
                                            <tr key={claim.id}>
                                                <td><span className="invoice-link">{claim.claim_number}</span></td>
                                                <td>{claim.payer_name}</td>
                                                <td>{claim.service_code || '—'}</td>
                                                <td>{formatDate(claim.session_date)}</td>
                                                <td>{formatCurrency(claim.billed_amount)}</td>
                                                <td className={claim.insurance_paid > 0 ? 'text-green-600 font-semibold' : ''}>{formatCurrency(claim.insurance_paid)}</td>
                                                <td>{formatCurrency(claim.patient_responsibility)}</td>
                                                <td className={claim.write_off_amount > 0 ? 'text-orange-500' : ''}>{formatCurrency(claim.write_off_amount)}</td>
                                                <td>
                                                    <span className={`badge badge-${claim.status === 'paid' ? 'active' : claim.status === 'denied' ? 'error' : 'pending'}`}>
                                                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button
                                                            className="btn-sm btn-secondary"
                                                            title="Post Payment"
                                                            onClick={() => {
                                                                setSelectedClaimId(claim.id)
                                                                setIsPostPaymentModalOpen(true)
                                                            }}
                                                        >
                                                            <ClipboardText size={14} weight="bold" />
                                                        </button>
                                                        <button
                                                            className="btn-sm btn-secondary"
                                                            title="Write Off"
                                                            onClick={() => {
                                                                setSelectedClaimId(claim.id)
                                                                setIsWriteOffModalOpen(true)
                                                            }}
                                                        >
                                                            <Eraser size={14} weight="bold" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {claims.length === 0 && (
                                            <tr><td colSpan={10} className="text-center text-muted">No claims</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Document Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Document"
                size="sm"
            >
                <div className="upload-form">
                    <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                        <UploadSimple size={48} weight="duotone" className="upload-icon" />
                        <p className="upload-text">Drag & drop files here</p>
                        <p className="upload-subtext">or click to browse</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="upload-input"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadDocument(file)
                            }}
                        />
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Client Modal */}
            <EditClientModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={async (formData) => {
                    if (!id) return
                    await clientsApi.update(id, {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        date_of_birth: formData.dateOfBirth,
                        gender: formData.gender,
                        phone: formData.phone,
                        email: formData.email,
                        address: formData.address,
                        city: formData.city,
                        state: formData.state,
                        zip_code: formData.zipCode,
                        emergency_contact_name: formData.emergencyContactName,
                        emergency_contact_phone: formData.emergencyContactPhone,
                        insurance_primary_name: formData.insuranceName,
                        insurance_primary_id: formData.memberId,
                        insurance_primary_group: formData.groupNumber,
                        service_categories: formData.serviceCategories,
                    })
                    toast.success('Client updated successfully')
                    setIsEditModalOpen(false)
                    refreshClient()
                }}
                clientData={{
                    id,
                    firstName: client.first_name,
                    lastName: client.last_name,
                    dateOfBirth: client.date_of_birth,
                    gender: client.gender || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    address: client.address || '',
                    city: client.city || '',
                    state: client.state || '',
                    zipCode: client.zip_code || '',
                    emergencyContactName: client.emergency_contact_name || '',
                    emergencyContactPhone: client.emergency_contact_phone || '',
                    insuranceName: client.insurance_primary_name || '',
                    memberId: client.insurance_primary_id || '',
                    groupNumber: client.insurance_primary_group || '',
                    serviceCategories: client.service_categories || [],
                }}
            />

            {/* Record Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false)
                    resetPaymentForm()
                }}
                title="Record Payment"
                size="sm"
            >
                    <form
                        className="payment-form"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleRecordPayment()
                        }}
                    >
                        {selectedOutstandingInvoice && (
                            <div className="payment-invoice-info">
                                <p>Invoice: <strong>{selectedOutstandingInvoice.invoice_number}</strong></p>
                                <p>Balance Due: <strong>{formatCurrency(selectedOutstandingInvoice.balance)}</strong></p>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="form-input-basic"
                                placeholder="0.00"
                                max={selectedOutstandingInvoice ? Number(selectedOutstandingInvoice.balance || 0) : undefined}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="form-input-basic"
                            >
                                <option value="credit_card">Credit Card</option>
                                <option value="eft">EFT Transfer</option>
                                <option value="check">Check</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reference #</label>
                            <input
                                type="text"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                className="form-input-basic"
                                placeholder="Check #, Transaction ID, etc."
                            />
                        </div>

                        <div className="payment-form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    setIsPaymentModalOpen(false)
                                    resetPaymentForm()
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!selectedOutstandingInvoice || isSaving}
                            >
                                <CheckCircle size={16} weight="bold" /> Record Payment
                            </button>
                        </div>
                    </form>
            </Modal>

            {/* Post Payment to Claim Modal */}
            <Modal
                isOpen={isPostPaymentModalOpen}
                onClose={() => { setIsPostPaymentModalOpen(false); setSelectedClaimId(null) }}
                title="Post Payment to Claim"
                size="md"
            >
                <div className="payment-form">
                    {selectedClaimId && (() => {
                        const claim = claims.find(c => c.id === selectedClaimId)
                        if (!claim) return null
                        return (
                            <>
                                <div className="payment-info">
                                    <p className="payment-info-label">Claim</p>
                                    <p className="payment-info-value">{claim.claim_number} — {claim.payer_name}</p>
                                </div>
                                <div className="payment-info">
                                    <p className="payment-info-label">Billed Amount</p>
                                    <p className="payment-info-value balance">{formatCurrency(claim.billed_amount)}</p>
                                </div>
                            </>
                        )
                    })()}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Insurance Paid</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                                value={postInsurancePaid}
                                onChange={(e) => setPostInsurancePaid(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Patient Responsibility</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                                value={postPatientResp}
                                onChange={(e) => setPostPatientResp(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Write-off / Adjustment</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                                value={postWriteOff}
                                onChange={(e) => setPostWriteOff(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reference # (EOB)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="EOB-2026-0042"
                                value={postReference}
                                onChange={(e) => setPostReference(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-input"
                            rows={2}
                            placeholder="Contractual adjustment per fee schedule..."
                            value={postNotes}
                            onChange={(e) => setPostNotes(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsPostPaymentModalOpen(false); setSelectedClaimId(null) }}>Cancel</button>
                        <button className="btn-primary" onClick={handlePostClaimPayment}>Post Payment</button>
                    </div>
                </div>
            </Modal>

            {/* Write-Off Modal */}
            <Modal
                isOpen={isWriteOffModalOpen}
                onClose={() => { setIsWriteOffModalOpen(false); setSelectedClaimId(null) }}
                title="Write Off Balance"
                size="sm"
            >
                <div className="payment-form">
                    {selectedClaimId && (() => {
                        const claim = claims.find(c => c.id === selectedClaimId)
                        if (!claim) return null
                        return (
                            <div className="payment-info">
                                <p className="payment-info-label">Claim</p>
                                <p className="payment-info-value">{claim.claim_number} — Balance: {formatCurrency(claim.billed_amount - claim.insurance_paid - claim.write_off_amount)}</p>
                            </div>
                        )
                    })()}
                    <div className="form-group">
                        <label className="form-label">Write-off Amount</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                            value={writeOffAmount}
                            onChange={(e) => setWriteOffAmount(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reason</label>
                        <select
                            className="form-select"
                            value={writeOffReason}
                            onChange={(e) => setWriteOffReason(e.target.value)}
                        >
                            <option value="">Select reason...</option>
                            <option value="contractual">Contractual Adjustment</option>
                            <option value="timely_filing">Timely Filing</option>
                            <option value="uncollectible">Uncollectible</option>
                            <option value="charity">Charity / Pro Bono</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-input"
                            rows={2}
                            placeholder="Per Blue Cross fee schedule..."
                            value={writeOffNotes}
                            onChange={(e) => setWriteOffNotes(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsWriteOffModalOpen(false); setSelectedClaimId(null) }}>Cancel</button>
                        <button className="btn-primary" onClick={handleWriteOff}>Apply Write-off</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Document Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDocId !== null}
                onClose={() => { setDeleteDocId(null); setDeleteDocName(null) }}
                onConfirm={handleDeleteDocument}
                title="Delete Document"
                message={`Are you sure you want to delete "${deleteDocName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
        </DashboardLayout>
    )
}
