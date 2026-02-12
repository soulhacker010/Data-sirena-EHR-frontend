import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { userSchema } from '../lib/validationSchemas'
import { DashboardLayout } from '../components/layout'
import { Modal, EmptyState, PageSkeleton } from '../components/ui'
import {
    Users,
    MagnifyingGlass,
    PencilSimple,
    UserCirclePlus,
    CheckCircle,
    XCircle
} from '@phosphor-icons/react'

interface User {
    id: number
    firstName: string
    lastName: string
    email: string
    phone: string
    role: 'admin' | 'clinician' | 'supervisor' | 'biller' | 'front_desk'
    status: 'active' | 'inactive'
    lastLogin: string | null
    createdAt: string
}

const mockUsers: User[] = [
    { id: 1, firstName: 'Amanda', lastName: 'Wilson', email: 'amanda.wilson@sirenahealthehr.com', phone: '(555) 123-4567', role: 'admin', status: 'active', lastLogin: '2026-02-09T14:30:00', createdAt: '2024-01-15' },
    { id: 2, firstName: 'Jessica', lastName: 'Martinez', email: 'jessica.m@sirenahealthehr.com', phone: '(555) 234-5678', role: 'clinician', status: 'active', lastLogin: '2026-02-09T10:15:00', createdAt: '2024-02-01' },
    { id: 3, firstName: 'Robert', lastName: 'Kim', email: 'r.kim@sirenahealthehr.com', phone: '(555) 345-6789', role: 'clinician', status: 'active', lastLogin: '2026-02-08T16:45:00', createdAt: '2024-02-15' },
    { id: 4, firstName: 'Maria', lastName: 'Santos', email: 'maria.s@sirenahealthehr.com', phone: '(555) 456-7890', role: 'supervisor', status: 'active', lastLogin: '2026-02-09T09:00:00', createdAt: '2024-01-20' },
    { id: 5, firstName: 'David', lastName: 'Chen', email: 'd.chen@sirenahealthehr.com', phone: '(555) 567-8901', role: 'biller', status: 'active', lastLogin: '2026-02-09T11:30:00', createdAt: '2024-03-01' },
    { id: 6, firstName: 'Sarah', lastName: 'Thompson', email: 's.thompson@sirenahealthehr.com', phone: '(555) 678-9012', role: 'front_desk', status: 'inactive', lastLogin: '2026-01-15T14:00:00', createdAt: '2024-02-10' },
]

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    clinician: 'Clinician',
    supervisor: 'Supervisor',
    biller: 'Biller',
    front_desk: 'Front Desk'
}

const roleColors: Record<string, string> = {
    admin: 'badge-admin',
    clinician: 'badge-clinician',
    supervisor: 'badge-supervisor',
    biller: 'badge-biller',
    front_desk: 'badge-frontdesk'
}

export default function UsersPage() {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const [users, setUsers] = useState<User[]>(mockUsers)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'clinician' as User['role']
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (formErrors[field]) {
            setFormErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const filteredUsers = users.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        return matchesSearch && matchesRole
    })

    const formatDate = (date: string | null) => {
        if (!date) return 'Never'
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleAddUser = () => {
        const result = userSchema.safeParse(formData)
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setFormErrors(fieldErrors)
            return
        }

        const newUser: User = {
            id: Math.max(...users.map(u => u.id)) + 1,
            ...formData,
            status: 'active',
            lastLogin: null,
            createdAt: new Date().toISOString()
        }
        setUsers([...users, newUser])
        setIsAddModalOpen(false)
        resetForm()
        toast.success(`${formData.firstName} ${formData.lastName} added`)
    }

    const handleEditUser = () => {
        if (!selectedUser) return

        const result = userSchema.safeParse(formData)
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setFormErrors(fieldErrors)
            return
        }

        setUsers(prev => prev.map(u =>
            u.id === selectedUser.id ? { ...u, ...formData } : u
        ))
        setIsEditModalOpen(false)
        setSelectedUser(null)
        resetForm()
        toast.success('User updated successfully')
    }

    const handleDeactivate = (user: User) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active'
        setUsers(prev => prev.map(u =>
            u.id === user.id ? { ...u, status: newStatus } : u
        ))
        toast.success(`${user.firstName} ${user.lastName} ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    }

    const openEditModal = (user: User) => {
        setSelectedUser(user)
        setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role
        })
        setIsEditModalOpen(true)
    }

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'clinician'
        })
        setFormErrors({})
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
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <Users size={28} weight="duotone" className="page-title-icon" />
                        User Management
                    </h1>
                    <p className="page-subtitle">{users.filter(u => u.status === 'active').length} active users</p>
                </div>
                <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                    <UserCirclePlus size={18} weight="bold" />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-input">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Administrators</option>
                    <option value="clinician">Clinicians</option>
                    <option value="supervisor">Supervisors</option>
                    <option value="biller">Billers</option>
                    <option value="front_desk">Front Desk</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="card-body p-0">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={user.status === 'inactive' ? 'row-inactive' : ''}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="user-name">{user.firstName} {user.lastName}</p>
                                                <p className="user-phone">{user.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge ${roleColors[user.role]}`}>
                                            {roleLabels[user.role]}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                                            {user.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="text-muted">{formatDate(user.lastLogin)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => openEditModal(user)} title="Edit">
                                                <PencilSimple size={18} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDeactivate(user)}
                                                title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.status === 'active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <EmptyState
                        variant={searchQuery || roleFilter !== 'all' ? 'no-results' : 'no-data'}
                        title={searchQuery || roleFilter !== 'all' ? 'No users found' : 'No users yet'}
                        description={searchQuery || roleFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Add your first user to get started'}
                        actionLabel={!searchQuery && roleFilter === 'all' ? 'Add User' : undefined}
                        onAction={!searchQuery && roleFilter === 'all' ? () => setIsAddModalOpen(true) : undefined}
                    />
                )}
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); resetForm(); }}
                title="Add New User"
            >
                <div className="modal-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                className={formErrors.firstName ? 'input-error' : ''}
                                placeholder="Enter first name"
                            />
                            {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                className={formErrors.lastName ? 'input-error' : ''}
                                placeholder="Enter last name"
                            />
                            {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className={formErrors.email ? 'input-error' : ''}
                            placeholder="user@example.com"
                        />
                        {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="(555) 123-4567"
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleFieldChange('role', e.target.value)}
                        >
                            <option value="clinician">Clinician</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="biller">Biller</option>
                            <option value="front_desk">Front Desk</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={handleAddUser}>
                            Add User
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); resetForm(); }}
                title="Edit User"
            >
                <div className="modal-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                className={formErrors.firstName ? 'input-error' : ''}
                            />
                            {formErrors.firstName && <span className="field-error">{formErrors.firstName}</span>}
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                className={formErrors.lastName ? 'input-error' : ''}
                            />
                            {formErrors.lastName && <span className="field-error">{formErrors.lastName}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className={formErrors.email ? 'input-error' : ''}
                        />
                        {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleFieldChange('role', e.target.value)}
                        >
                            <option value="clinician">Clinician</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="biller">Biller</option>
                            <option value="front_desk">Front Desk</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); resetForm(); }}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={handleEditUser}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
