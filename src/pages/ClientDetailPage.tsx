import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { Modal, EditClientModal, EmptyState, PageSkeleton, ConfirmDialog } from '../components/ui'
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
    Receipt
} from '@phosphor-icons/react'

// Tab type
type TabType = 'profile' | 'insurance' | 'authorizations' | 'notes' | 'documents' | 'billing'

// Mock client data
const mockClient = {
    id: 1,
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1995-03-15',
    gender: 'Female',
    phone: '(555) 123-4567',
    email: 'sarah.j@email.com',
    address: '123 Main Street',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    status: 'active',
    provider: 'Dr. John Smith',
    createdAt: '2024-06-15',
    emergencyContact: {
        name: 'John Johnson',
        relationship: 'Spouse',
        phone: '(555) 987-6543'
    },
    insurance: {
        primary: {
            name: 'Blue Cross Blue Shield',
            memberId: 'BCB123456789',
            groupNumber: 'GRP001234',
            phone: '(800) 123-4567',
            policyHolder: 'Sarah Johnson',
            relationship: 'Self'
        },
        secondary: null
    },
    diagnoses: [
        { code: 'F84.0', description: 'Autistic disorder' },
        { code: 'F80.2', description: 'Mixed receptive-expressive language disorder' }
    ],
    authorizations: [
        {
            id: 1,
            service: 'ABA Therapy (97153)',
            totalUnits: 160,
            usedUnits: 128,
            startDate: '2026-01-01',
            endDate: '2026-06-30',
            status: 'active'
        },
        {
            id: 2,
            service: 'Parent Training (97156)',
            totalUnits: 24,
            usedUnits: 8,
            startDate: '2026-01-01',
            endDate: '2026-06-30',
            status: 'active'
        }
    ],
    recentSessions: [
        { id: 1, date: '2026-02-08', type: 'ABA Session', cptCode: '97153', duration: '2 hours', units: 8, status: 'completed', provider: 'Dr. Smith' },
        { id: 2, date: '2026-02-06', type: 'ABA Session', cptCode: '97153', duration: '2 hours', units: 8, status: 'completed', provider: 'Dr. Smith' },
        { id: 3, date: '2026-02-04', type: 'Parent Training', cptCode: '97156', duration: '1 hour', units: 4, status: 'completed', provider: 'Dr. Smith' },
        { id: 4, date: '2026-02-01', type: 'ABA Session', cptCode: '97153', duration: '2 hours', units: 8, status: 'no-show', provider: 'Dr. Smith' },
    ],
    documents: [
        { id: 1, name: 'Insurance Card.pdf', type: 'pdf', size: '245 KB', uploadedAt: '2026-01-15', uploadedBy: 'Admin' },
        { id: 2, name: 'Initial Assessment.pdf', type: 'pdf', size: '1.2 MB', uploadedAt: '2024-06-15', uploadedBy: 'Dr. Smith' },
        { id: 3, name: 'Treatment Plan.docx', type: 'doc', size: '89 KB', uploadedAt: '2024-07-01', uploadedBy: 'Dr. Smith' },
        { id: 4, name: 'Progress Photo.jpg', type: 'image', size: '2.1 MB', uploadedAt: '2026-02-01', uploadedBy: 'Dr. Smith' },
    ],
    invoices: [
        { id: 1, number: 'INV-2026-001', date: '2026-02-01', amount: 450.00, paid: 450.00, status: 'paid' },
        { id: 2, number: 'INV-2026-008', date: '2026-02-08', amount: 450.00, paid: 0, status: 'pending' },
    ],
    payments: [
        { id: 1, date: '2026-02-05', amount: 450.00, method: 'Insurance', reference: 'EOB-12345' },
    ],
    balance: 450.00
}

// Calculate age
const calculateAge = (dob: string) => {
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}

// Format date
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Get file icon
const getFileIcon = (type: string) => {
    switch (type) {
        case 'pdf': return <FilePdf size={24} weight="duotone" className="text-red-500" />
        case 'doc': return <FileDoc size={24} weight="duotone" className="text-blue-500" />
        case 'image': return <Image size={24} weight="duotone" className="text-green-500" />
        default: return <File size={24} weight="duotone" className="text-gray-500" />
    }
}

export default function ClientDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const client = mockClient
    const [activeTab, setActiveTab] = useState<TabType>('profile')
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [deleteDocName, setDeleteDocName] = useState<string | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    // Handle New Session - navigate to calendar with client preselected
    const handleNewSession = () => {
        navigate(`/calendar?clientId=${id}&action=new`)
    }

    // Handle Edit Client
    const handleEditClient = () => {
        setIsEditModalOpen(true)
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
            {/* Back Link & Header */}
            <div className="detail-header">
                <Link to="/clients" className="back-link">
                    <ArrowLeft size={18} weight="bold" />
                    Back to Clients
                </Link>

                <div className="detail-header-content">
                    <div className="detail-header-left">
                        <div className="detail-avatar">
                            {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div className="detail-info">
                            <h1 className="detail-title">{client.firstName} {client.lastName}</h1>
                            <p className="detail-meta">
                                {client.gender} · Age {calculateAge(client.dateOfBirth)} · DOB {formatDate(client.dateOfBirth)}
                            </p>
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
                <button className={`client-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    <FileText size={18} weight="duotone" /> Notes
                </button>
                <button className={`client-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
                    <File size={18} weight="duotone" /> Documents
                </button>
                <button className={`client-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                    <CurrencyDollar size={18} weight="duotone" /> Billing
                </button>
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
                                                <p className="info-value">{client.phone}</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <EnvelopeSimple size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Email</p>
                                                <p className="info-value">{client.email}</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <MapPin size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Address</p>
                                                <p className="info-value">{client.address}, {client.city}, {client.state} {client.zipCode}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Emergency Contact</h2>
                                </div>
                                <div className="card-body">
                                    <div className="info-list">
                                        <div className="info-item">
                                            <User size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Name</p>
                                                <p className="info-value">{client.emergencyContact.name} ({client.emergencyContact.relationship})</p>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <Phone size={18} weight="regular" className="info-icon" />
                                            <div>
                                                <p className="info-label">Phone</p>
                                                <p className="info-value">{client.emergencyContact.phone}</p>
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
                                        {client.diagnoses.map((dx, index) => (
                                            <div key={index} className="diagnosis-item">
                                                <span className="diagnosis-code">{dx.code}</span>
                                                <span className="diagnosis-desc">{dx.description}</span>
                                            </div>
                                        ))}
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
                                            <p className="quick-stat-value">{client.recentSessions.length}</p>
                                            <p className="quick-stat-label">Sessions (30d)</p>
                                        </div>
                                        <div className="quick-stat">
                                            <p className="quick-stat-value">{client.authorizations.length}</p>
                                            <p className="quick-stat-label">Active Auths</p>
                                        </div>
                                        <div className="quick-stat">
                                            <p className="quick-stat-value">{formatCurrency(client.balance)}</p>
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
                                        {client.recentSessions.slice(0, 3).map((session) => (
                                            <div key={session.id} className="session-item">
                                                <div className="session-date">
                                                    <Calendar size={16} weight="regular" />
                                                    {formatDate(session.date)}
                                                </div>
                                                <div className="session-info">
                                                    <p className="session-type">{session.type}</p>
                                                    <p className="session-meta">
                                                        <Clock size={12} weight="regular" />
                                                        {session.duration}
                                                    </p>
                                                </div>
                                                <span className={`badge badge-${session.status === 'completed' ? 'active' : 'error'}`}>
                                                    {session.status === 'completed' ? 'Completed' : 'No-show'}
                                                </span>
                                            </div>
                                        ))}
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
                                    <p className="field-value">{client.insurance.primary.name}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Member ID</p>
                                    <p className="field-value">{client.insurance.primary.memberId}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Group Number</p>
                                    <p className="field-value">{client.insurance.primary.groupNumber}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Phone</p>
                                    <p className="field-value">{client.insurance.primary.phone}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Policy Holder</p>
                                    <p className="field-value">{client.insurance.primary.policyHolder}</p>
                                </div>
                                <div className="insurance-field">
                                    <p className="field-label">Relationship</p>
                                    <p className="field-value">{client.insurance.primary.relationship}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Authorizations Tab */}
                {activeTab === 'authorizations' && (
                    <div className="space-y-4">
                        {client.authorizations.map(auth => {
                            const percent = Math.round((auth.usedUnits / auth.totalUnits) * 100)
                            const remaining = auth.totalUnits - auth.usedUnits
                            return (
                                <div key={auth.id} className="card">
                                    <div className="card-header">
                                        <h2 className="card-title">{auth.service}</h2>
                                        <span className={`badge badge-${auth.status}`}>
                                            {auth.status.charAt(0).toUpperCase() + auth.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        <p className="auth-dates">
                                            {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                                        </p>
                                        <div className="auth-progress">
                                            <div className="auth-progress-header">
                                                <span>{auth.usedUnits} / {auth.totalUnits} units</span>
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
                        })}
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Session Notes</h2>
                            <button
                                className="btn-primary btn-sm"
                                onClick={() => window.location.href = `/notes/new?client=${id}`}
                            >
                                <Plus size={16} weight="bold" /> New Note
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>CPT Code</th>
                                        <th>Duration</th>
                                        <th>Units</th>
                                        <th>Provider</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {client.recentSessions.map(session => (
                                        <tr key={session.id}>
                                            <td>{formatDate(session.date)}</td>
                                            <td>{session.type}</td>
                                            <td><span className="cpt-code">{session.cptCode}</span></td>
                                            <td>{session.duration}</td>
                                            <td>{session.units}</td>
                                            <td>{session.provider}</td>
                                            <td>
                                                <span className={`badge badge-${session.status === 'completed' ? 'active' : 'error'}`}>
                                                    {session.status === 'completed' ? 'Completed' : 'No-show'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {client.recentSessions.length === 0 && (
                                <EmptyState
                                    variant="no-data"
                                    title="No session notes yet"
                                    description="Session notes will appear here after appointments."
                                />
                            )}
                        </div>
                    </div>
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
                            <div className="documents-grid">
                                {client.documents.map(doc => (
                                    <div key={doc.id} className="document-card">
                                        <div className="document-icon">
                                            {getFileIcon(doc.type)}
                                        </div>
                                        <div className="document-info">
                                            <p className="document-name">{doc.name}</p>
                                            <p className="document-meta">{doc.size} · {formatDate(doc.uploadedAt)}</p>
                                        </div>
                                        <div className="document-actions">
                                            <button className="btn-icon-sm" title="Preview" onClick={() => window.open(`#preview-${doc.name}`, '_blank')}>
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon-sm" title="Download" onClick={() => {
                                                const a = document.createElement('a')
                                                a.href = '#'
                                                a.download = doc.name
                                                a.click()
                                            }}>
                                                <DownloadSimple size={16} />
                                            </button>
                                            <button className="btn-icon-sm danger" title="Delete" onClick={() => {
                                                setDeleteDocName(doc.name)
                                            }}>
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {client.documents.length === 0 && (
                                <EmptyState
                                    variant="no-data"
                                    title="No documents uploaded"
                                    description="Upload documents to keep client records organized."
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        {/* Balance Card */}
                        <div className="card billing-balance-card">
                            <div className="billing-balance">
                                <div>
                                    <p className="balance-label">Current Balance</p>
                                    <p className="balance-value">{formatCurrency(client.balance)}</p>
                                </div>
                                <button className="btn-primary" onClick={() => setIsPaymentModalOpen(true)}>
                                    <Receipt size={18} weight="bold" /> Record Payment
                                </button>
                            </div>
                        </div>

                        {/* Invoices */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">Invoices</h2>
                            </div>
                            <div className="card-body p-0">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Paid</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {client.invoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td><span className="invoice-link">{inv.number}</span></td>
                                                <td>{formatDate(inv.date)}</td>
                                                <td>{formatCurrency(inv.amount)}</td>
                                                <td>{formatCurrency(inv.paid)}</td>
                                                <td>
                                                    <span className={`badge badge-${inv.status === 'paid' ? 'active' : 'pending'}`}>
                                                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payments */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">Payment History</h2>
                            </div>
                            <div className="card-body p-0">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {client.payments.map(pmt => (
                                            <tr key={pmt.id}>
                                                <td>{formatDate(pmt.date)}</td>
                                                <td className="text-green-600 font-semibold">{formatCurrency(pmt.amount)}</td>
                                                <td>{pmt.method}</td>
                                                <td><span className="reference">{pmt.reference}</span></td>
                                            </tr>
                                        ))}
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
                    <div className="upload-dropzone">
                        <UploadSimple size={48} weight="duotone" className="upload-icon" />
                        <p className="upload-text">Drag & drop files here</p>
                        <p className="upload-subtext">or click to browse</p>
                        <input type="file" className="upload-input" />
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => {
                            // Mock upload success
                            setIsUploadModalOpen(false)
                        }}>Upload</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Client Modal - Using reusable component */}
            <EditClientModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={() => {
                    toast.success('Client updated successfully')
                    setIsEditModalOpen(false)
                }}
                clientData={{
                    id: Number(id),
                    firstName: client.firstName,
                    lastName: client.lastName,
                    dateOfBirth: client.dateOfBirth,
                    gender: client.gender,
                    phone: client.phone,
                    email: client.email,
                    address: client.address,
                    city: client.city,
                    state: client.state,
                    zipCode: client.zipCode,
                    insuranceName: client.insurance.primary.name,
                    memberId: client.insurance.primary.memberId,
                    groupNumber: client.insurance.primary.groupNumber
                }}
            />

            {/* Record Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Record Payment"
                size="md"
            >
                <div className="payment-form">
                    <div className="payment-info">
                        <p className="payment-info-label">Client</p>
                        <p className="payment-info-value">{client.firstName} {client.lastName}</p>
                    </div>
                    <div className="payment-info">
                        <p className="payment-info-label">Current Balance</p>
                        <p className="payment-info-value balance">{formatCurrency(client.balance)}</p>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Payment Amount</label>
                            <input type="number" className="form-input" placeholder="0.00" step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payment Date</label>
                            <input type="date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <select className="form-select">
                            <option value="">Select method...</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="credit">Credit Card</option>
                            <option value="insurance">Insurance Payment</option>
                            <option value="eft">EFT/ACH</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reference / Check Number</label>
                        <input type="text" className="form-input" placeholder="e.g., Check #1234 or EOB-12345" />
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                        <button className="btn-primary" onClick={() => setIsPaymentModalOpen(false)}>Record Payment</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Document Confirm Dialog */}
            <ConfirmDialog
                isOpen={deleteDocName !== null}
                onClose={() => setDeleteDocName(null)}
                onConfirm={() => {
                    toast.success(`${deleteDocName} deleted`)
                    setDeleteDocName(null)
                }}
                title="Delete Document"
                message={`Are you sure you want to delete "${deleteDocName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
        </DashboardLayout>
    )
}
