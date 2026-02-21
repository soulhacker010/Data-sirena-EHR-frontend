import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { ActionMenu, AddClientModal, EditClientModal, ConfirmDialog, ImportClientsModal, EmptyState, TableSkeleton } from '../components/ui'
import { clientsApi } from '../api'
import type { Client } from '../types'
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
const formatDate = (date: string | null | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Sort types
type SortField = 'name' | 'dob' | 'insurance' | 'lastVisit' | 'status'
type SortDirection = 'asc' | 'desc'

export default function ClientsPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [clients, setClients] = useState<Client[]>([])
    const [totalCount, setTotalCount] = useState(0)
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
    const [isSaving, setIsSaving] = useState(false)
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Open add modal if URL has ?action=add
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setIsAddModalOpen(true)
        }
    }, [searchParams])

    // Fetch clients from backend
    const fetchClients = useCallback(async () => {
        setIsLoading(true)
        try {
            const params: Record<string, string | boolean | number> = {}
            if (searchQuery) params.search = searchQuery
            if (statusFilter === 'active') params.status = 'active'
            else if (statusFilter === 'inactive') params.status = 'inactive'
            const response = await clientsApi.getAll(params)
            setClients(response.results)
            setTotalCount(response.count)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load clients')
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, statusFilter])

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

    // Handle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Sort clients client-side (API does search/filter)
    const sortedClients = useMemo(() => {
        const sorted = [...clients]
        sorted.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'name':
                    cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
                    break
                case 'dob':
                    cmp = (a.date_of_birth || '').localeCompare(b.date_of_birth || '')
                    break
                case 'insurance':
                    cmp = (a.insurance_primary_name || '').localeCompare(b.insurance_primary_name || '')
                    break
                case 'lastVisit':
                    cmp = (a.next_appointment || '').localeCompare(b.next_appointment || '')
                    break
                case 'status':
                    cmp = (a.is_active ? 'active' : 'inactive').localeCompare(b.is_active ? 'active' : 'inactive')
                    break
            }
            return sortDirection === 'asc' ? cmp : -cmp
        })
        return sorted
    }, [clients, sortField, sortDirection])

    // Convert Client type to form data for edit modal
    const clientToFormData = (client: Client) => ({
        id: client.id,
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
        insuranceName: client.insurance_primary_name || '',
        memberId: client.insurance_primary_id || '',
        groupNumber: client.insurance_primary_group || ''
    })

    // Action handlers
    const handleViewClient = (clientId: string) => {
        navigate(`/clients/${clientId}`)
    }

    const handleEditClient = (client: Client) => {
        setSelectedClient(client)
        setIsEditModalOpen(true)
    }

    const handleScheduleSession = (clientId: string) => {
        navigate(`/calendar?client=${clientId}`)
    }

    const handleDeleteClick = (client: Client) => {
        setSelectedClient(client)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedClient) return
        setIsDeleting(true)
        try {
            await clientsApi.delete(selectedClient.id)
            setClients(prev => prev.filter(c => c.id !== selectedClient.id))
            setTotalCount(prev => prev - 1)
            toast.success('Client deleted successfully')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to delete client')
        } finally {
            setIsDeleting(false)
            setIsDeleteDialogOpen(false)
            setSelectedClient(null)
        }
    }

    const handleAddClient = async (formData: any) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await clientsApi.create({
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
                insurance_primary_name: formData.insuranceName,
                insurance_primary_id: formData.memberId,
                insurance_primary_group: formData.groupNumber,
            })
            toast.success(`${formData.firstName} ${formData.lastName} added successfully`)
            setIsAddModalOpen(false)
            fetchClients() // Refresh list
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to add client')
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateClient = async (formData: any) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await clientsApi.update(formData.id, {
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
                insurance_primary_name: formData.insuranceName,
                insurance_primary_id: formData.memberId,
                insurance_primary_group: formData.groupNumber,
            })
            toast.success('Client updated successfully')
            setIsEditModalOpen(false)
            setSelectedClient(null)
            fetchClients() // Refresh list
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update client')
        } finally {
            setIsSaving(false)
        }
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
                    <p className="page-subtitle">{totalCount} total clients in your practice</p>
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
                                {sortedClients.map((client) => (
                                    <tr key={client.id}>
                                        <td>
                                            <Link to={`/clients/${client.id}`} className="client-cell">
                                                <div className="client-avatar">
                                                    {client.first_name[0]}{client.last_name[0]}
                                                </div>
                                                <div className="client-info">
                                                    <p className="client-name">{client.first_name} {client.last_name}</p>
                                                    <p className="client-meta">
                                                        {client.age != null ? `Age ${client.age}` : `Age ${calculateAge(client.date_of_birth)}`} · DOB {formatDate(client.date_of_birth)}
                                                    </p>
                                                </div>
                                            </Link>
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                {client.phone && (
                                                    <span className="contact-item">
                                                        <Phone size={14} weight="regular" />
                                                        {client.phone}
                                                    </span>
                                                )}
                                                {client.email && (
                                                    <span className="contact-item">
                                                        <EnvelopeSimple size={14} weight="regular" />
                                                        {client.email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-semibold">{client.insurance_primary_name || '—'}</span>
                                        </td>
                                        <td>
                                            <span>{formatDate(client.next_appointment)}</span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${client.is_active ? 'active' : 'inactive'}`}>
                                                {client.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <ActionMenu items={getClientActions(client)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedClients.length === 0 && (
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
                    ? `Are you sure you want to delete ${selectedClient.first_name} ${selectedClient.last_name}? This action cannot be undone.`
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
                    fetchClients() // Refresh after import
                }}
            />
        </DashboardLayout>
    )
}
