import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { ActionMenu, AddClientModal, EditClientModal, ConfirmDialog, ImportClientsModal, EmptyState, TableSkeleton } from '../components/ui'
import {
    MagnifyingGlass,
    Plus,
    FunnelSimple,
    CaretDown,
    CaretUp,
    Phone,
    EnvelopeSimple,
    Eye,
    PencilSimple,
    Trash,
    CalendarPlus,
    UploadSimple
} from '@phosphor-icons/react'

// Client type for the list
interface Client {
    id: number
    firstName: string
    lastName: string
    dateOfBirth: string
    phone: string
    email: string
    status: 'active' | 'inactive' | 'pending'
    insurance: string
    provider: string
    lastVisit: string | null
    // Extended fields for edit
    gender?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    memberId?: string
    groupNumber?: string
}

// Form data type for editing clients
interface ClientFormData {
    id?: number
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    phone: string
    email: string
    address: string
    city: string
    state: string
    zipCode: string
    insuranceName: string
    memberId: string
    groupNumber: string
}

// Mock client data
const initialClients: Client[] = [
    {
        id: 1,
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: '1995-03-15',
        gender: 'female',
        phone: '(555) 123-4567',
        email: 'sarah.j@email.com',
        status: 'active',
        insurance: 'Blue Cross',
        provider: 'Dr. Smith',
        lastVisit: '2026-02-05',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        memberId: 'BCB123456',
        groupNumber: 'GRP001'
    },
    {
        id: 2,
        firstName: 'Michael',
        lastName: 'Chen',
        dateOfBirth: '1988-07-22',
        gender: 'male',
        phone: '(555) 234-5678',
        email: 'mchen@email.com',
        status: 'active',
        insurance: 'Aetna',
        provider: 'Dr. Smith',
        lastVisit: '2026-02-07'
    },
    {
        id: 3,
        firstName: 'Emily',
        lastName: 'Davis',
        dateOfBirth: '2012-11-08',
        gender: 'female',
        phone: '(555) 345-6789',
        email: 'edavis.parent@email.com',
        status: 'active',
        insurance: 'United Health',
        provider: 'Dr. Williams',
        lastVisit: '2026-02-01'
    },
    {
        id: 4,
        firstName: 'James',
        lastName: 'Wilson',
        dateOfBirth: '2001-05-30',
        gender: 'male',
        phone: '(555) 456-7890',
        email: 'jwilson@email.com',
        status: 'inactive',
        insurance: 'Cigna',
        provider: 'Dr. Smith',
        lastVisit: '2026-01-15'
    },
    {
        id: 5,
        firstName: 'Lisa',
        lastName: 'Thompson',
        dateOfBirth: '1979-09-12',
        gender: 'female',
        phone: '(555) 567-8901',
        email: 'lthompson@email.com',
        status: 'active',
        insurance: 'Blue Cross',
        provider: 'Dr. Martinez',
        lastVisit: '2026-02-08'
    },
    {
        id: 6,
        firstName: 'David',
        lastName: 'Brown',
        dateOfBirth: '2015-01-25',
        gender: 'male',
        phone: '(555) 678-9012',
        email: 'dbrown.parent@email.com',
        status: 'pending',
        insurance: 'Medicaid',
        provider: 'Dr. Williams',
        lastVisit: null
    },
]

// Calculate age from DOB
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
const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Sort types
type SortField = 'name' | 'dob' | 'insurance' | 'provider' | 'lastVisit' | 'status'
type SortDirection = 'asc' | 'desc'

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>(initialClients)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    // Handle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        // First filter
        const filtered = clients.filter(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase()
            const query = searchQuery.toLowerCase()

            // Search by name, email, phone, DOB, or ID
            const matchesSearch =
                fullName.includes(query) ||
                client.email.toLowerCase().includes(query) ||
                client.phone.includes(searchQuery) ||
                client.dateOfBirth.includes(searchQuery) ||
                String(client.id).includes(searchQuery)

            const matchesStatus = statusFilter === 'all' || client.status === statusFilter

            return matchesSearch && matchesStatus
        })

        // Then sort
        return filtered.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'name':
                    comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                    break
                case 'dob':
                    comparison = new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime()
                    break
                case 'insurance':
                    comparison = a.insurance.localeCompare(b.insurance)
                    break
                case 'provider':
                    comparison = a.provider.localeCompare(b.provider)
                    break
                case 'lastVisit':
                    const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0
                    const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0
                    comparison = dateA - dateB
                    break
                case 'status':
                    comparison = a.status.localeCompare(b.status)
                    break
            }
            return sortDirection === 'asc' ? comparison : -comparison
        })
    }, [clients, searchQuery, statusFilter, sortField, sortDirection])

    // Convert Client to ClientFormData for edit modal
    const clientToFormData = (client: Client): ClientFormData => ({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender || '',
        phone: client.phone,
        email: client.email,
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        insuranceName: client.insurance,
        memberId: client.memberId || '',
        groupNumber: client.groupNumber || ''
    })

    // Action handlers
    const handleViewClient = (clientId: number) => {
        window.location.href = `/clients/${clientId}`
    }

    const handleEditClient = (client: Client) => {
        setSelectedClient(client)
        setIsEditModalOpen(true)
    }

    const handleScheduleSession = (clientId: number) => {
        // Navigate to calendar with client preselected
        window.location.href = `/calendar?client=${clientId}`
    }

    const handleDeleteClick = (client: Client) => {
        setSelectedClient(client)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedClient) return

        setIsDeleting(true)

        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 800))

        // Remove from list
        setClients(prev => prev.filter(c => c.id !== selectedClient.id))

        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedClient(null)
        toast.success('Client deleted successfully')
    }

    const handleAddClient = (formData: any) => {
        // Create new client with next ID
        const newClient: Client = {
            id: Math.max(...clients.map(c => c.id)) + 1,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            phone: formData.phone,
            email: formData.email,
            status: 'active',
            insurance: formData.insuranceName || 'None',
            provider: 'Unassigned',
            lastVisit: null,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            memberId: formData.memberId,
            groupNumber: formData.groupNumber
        }

        setClients(prev => [newClient, ...prev])
        toast.success(`${formData.firstName} ${formData.lastName} added successfully`)
    }

    const handleUpdateClient = (formData: ClientFormData) => {
        setClients(prev => prev.map(client => {
            if (client.id === formData.id) {
                return {
                    ...client,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    phone: formData.phone,
                    email: formData.email,
                    insurance: formData.insuranceName,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    memberId: formData.memberId,
                    groupNumber: formData.groupNumber
                }
            }
            return client
        }))
        setIsEditModalOpen(false)
        setSelectedClient(null)
        toast.success('Client updated successfully')
    }

    // Generate action menu items for each client
    const getClientActions = (client: Client) => [
        {
            label: 'View Profile',
            icon: <Eye size={16} weight="regular" />,
            onClick: () => handleViewClient(client.id)
        },
        {
            label: 'Edit Client',
            icon: <PencilSimple size={16} weight="regular" />,
            onClick: () => handleEditClient(client)
        },
        {
            label: 'Schedule Session',
            icon: <CalendarPlus size={16} weight="regular" />,
            onClick: () => handleScheduleSession(client.id)
        },
        {
            label: 'Delete Client',
            icon: <Trash size={16} weight="regular" />,
            onClick: () => handleDeleteClick(client),
            variant: 'danger' as const
        }
    ]

    return (
        <DashboardLayout>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clients</h1>
                    <p className="page-subtitle">{clients.length} total clients in your practice</p>
                </div>
                <div className="header-actions">
                    <div className="dropdown-container">
                        <button className="btn-primary" onClick={() => setShowAddMenu(!showAddMenu)}>
                            <Plus size={18} weight="bold" />
                            Add Client
                            <CaretDown size={14} weight="bold" />
                        </button>
                        {showAddMenu && (
                            <div className="dropdown-menu">
                                <button className="dropdown-item" onClick={() => { setIsAddModalOpen(true); setShowAddMenu(false); }}>
                                    <Plus size={16} weight="regular" />
                                    New Client
                                </button>
                                <button className="dropdown-item" onClick={() => { setIsImportModalOpen(true); setShowAddMenu(false); }}>
                                    <UploadSimple size={16} weight="regular" />
                                    Import Clients
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                {/* Search */}
                <div className="search-input">
                    <MagnifyingGlass size={18} weight="regular" className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, DOB, ID, email, or phone..."
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
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                    </select>
                    <CaretDown size={14} weight="bold" className="filter-caret" />
                </div>
            </div>

            {/* Clients Table */}
            <div className="card">
                {isLoading ? (
                    <TableSkeleton rows={6} cols={6} />
                ) : (
                    <>
                        <table className="data-table clients-table">
                            <thead>
                                <tr>
                                    <th className="sortable" onClick={() => handleSort('name')}>
                                        Client
                                        {sortField === 'name' && (
                                            sortDirection === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
                                        )}
                                    </th>
                                    <th>Contact</th>
                                    <th className="sortable" onClick={() => handleSort('insurance')}>
                                        Insurance
                                        {sortField === 'insurance' && (
                                            sortDirection === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
                                        )}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('provider')}>
                                        Provider
                                        {sortField === 'provider' && (
                                            sortDirection === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
                                        )}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('lastVisit')}>
                                        Last Visit
                                        {sortField === 'lastVisit' && (
                                            sortDirection === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
                                        )}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('status')}>
                                        Status
                                        {sortField === 'status' && (
                                            sortDirection === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />
                                        )}
                                    </th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client) => (
                                    <tr key={client.id}>
                                        <td>
                                            <Link to={`/clients/${client.id}`} className="client-cell">
                                                <div className="client-avatar">
                                                    {client.firstName[0]}{client.lastName[0]}
                                                </div>
                                                <div className="client-info">
                                                    <p className="client-name">{client.firstName} {client.lastName}</p>
                                                    <p className="client-meta">Age {calculateAge(client.dateOfBirth)} · DOB {formatDate(client.dateOfBirth)}</p>
                                                </div>
                                            </Link>
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                <span className="contact-item">
                                                    <Phone size={14} weight="regular" />
                                                    {client.phone}
                                                </span>
                                                <span className="contact-item">
                                                    <EnvelopeSimple size={14} weight="regular" />
                                                    {client.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-semibold">{client.insurance}</span>
                                        </td>
                                        <td>
                                            <span>{client.provider}</span>
                                        </td>
                                        <td>
                                            <span>{formatDate(client.lastVisit)}</span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${client.status}`}>
                                                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <ActionMenu items={getClientActions(client)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredClients.length === 0 && (
                            <EmptyState
                                variant={searchQuery || statusFilter !== 'all' ? 'no-results' : 'no-data'}
                                title={searchQuery || statusFilter !== 'all' ? 'No clients found' : 'No clients yet'}
                                description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Add your first client to get started'}
                                actionLabel={!searchQuery && statusFilter === 'all' ? 'Add Client' : undefined}
                                onAction={!searchQuery && statusFilter === 'all' ? () => setIsAddModalOpen(true) : undefined}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Add Client Modal */}
            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddClient}
            />

            {/* Edit Client Modal */}
            <EditClientModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setSelectedClient(null)
                }}
                onSubmit={handleUpdateClient}
                clientData={selectedClient ? clientToFormData(selectedClient) : null}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false)
                    setSelectedClient(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Client"
                message={selectedClient
                    ? `Are you sure you want to delete ${selectedClient.firstName} ${selectedClient.lastName}? This action cannot be undone.`
                    : ''
                }
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Import Clients Modal */}
            <ImportClientsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={(count) => {
                    toast.success(`Imported ${count} clients`)
                    // TODO: Refresh client list after import
                }}
            />
        </DashboardLayout>
    )
}
