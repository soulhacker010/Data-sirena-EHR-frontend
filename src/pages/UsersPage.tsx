import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../utils/errors'
import { DashboardLayout } from '../components/layout'
import { Modal, EmptyState, PageSkeleton } from '../components/ui'
import { usersApi } from '../api'
import { useAuth } from '../context'
import type { User } from '../types'
import {
    Users,
    MagnifyingGlass,
    PencilSimple,
    UserCirclePlus,
    CheckCircle,
    XCircle,
    EnvelopeSimple,
} from '@phosphor-icons/react'

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
    const { user } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Form state. `licenses` is comma-separated in the UI but stored as a
    // string array on the backend; we split on save and join on load.
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'clinician',
        password: '',
        credentials: '',
        licenses: '',
        npi: '',
        ein: '',
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [isSaving, setIsSaving] = useState(false)

    // Load users
    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            setIsLoading(true)
            const res = await usersApi.getAll({ page_size: 200 })
            setUsers(res.results)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to load users'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error on change
        if (formErrors[field]) {
            setFormErrors(prev => {
                const n = { ...prev }
                delete n[field]
                return n
            })
        }
    }

    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'Never'
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const validateForm = () => {
        const errors: Record<string, string> = {}
        if (!formData.firstName.trim()) errors.firstName = 'First name is required'
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
        if (!formData.email.trim()) errors.email = 'Email is required'
        if (!isEditModalOpen && !formData.password.trim()) {
            errors.password = 'Password is required'
        } else if (!isEditModalOpen && formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters'
        } else if (!isEditModalOpen && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)) {
            errors.password = 'Must include uppercase, lowercase, number, and special character'
        }
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format'
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleAddUser = async () => {
        if (isSaving) return
        if (!validateForm()) return
        if (!user?.organization_id) {
            toast.error('Unable to determine your organization. Please sign in again.')
            return
        }

        setIsSaving(true)
        // Comma-separated UI → backend string array. Trim each entry, drop
        // blanks, so " NJ-12345 ,   NY-67890 " becomes ['NJ-12345','NY-67890'].
        const parsedLicenses = formData.licenses
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        try {
            await usersApi.create({
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                role: formData.role,
                password: formData.password,
                organization_id: user.organization_id,
                phone: formData.phone || undefined,
                credentials: formData.credentials || undefined,
                licenses: parsedLicenses.length ? parsedLicenses : undefined,
                npi: formData.npi.trim() || undefined,
                ein: formData.ein.trim() || undefined,
            })
            toast.success(`${formData.firstName} ${formData.lastName} has been added`)
            setIsAddModalOpen(false)
            resetForm()
            loadUsers()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to add user'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleEditUser = async () => {
        if (isSaving) return
        if (!validateForm() || !editingUser) return

        setIsSaving(true)
        const parsedLicenses = formData.licenses
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        try {
            await usersApi.update(editingUser.id, {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                role: formData.role,
                phone: formData.phone || undefined,
                credentials: formData.credentials,
                licenses: parsedLicenses,
                npi: formData.npi.trim(),
                ein: formData.ein.trim(),
            })
            toast.success(`${formData.firstName} ${formData.lastName} has been updated`)
            setIsEditModalOpen(false)
            setEditingUser(null)
            resetForm()
            loadUsers()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to update user'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeactivate = async (user: User) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await usersApi.update(user.id, { is_active: !user.is_active })
            toast.success(`${user.first_name} ${user.last_name} ${user.is_active ? 'deactivated' : 'activated'}`)
            loadUsers()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to update status'))
        } finally {
            setIsSaving(false)
        }
    }

    /**
     * B12: Admin-initiated password reset. Sends the reset email to the
     * user's address — the link they receive is the same one that comes
     * from /forgot-password, so the staff member doesn't need to navigate
     * there themselves. Inactive users and users without an email are
     * rejected by the backend with a clean 400.
     */
    const handleSendResetLink = async (user: User) => {
        if (isSaving) return
        if (!user.is_active) {
            toast.error('Reactivate the user before sending a reset link.')
            return
        }
        setIsSaving(true)
        try {
            const result = await usersApi.sendResetLink(user.id)
            toast.success(result.detail || `Reset link sent to ${user.email}`)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to send reset link'))
        } finally {
            setIsSaving(false)
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setFormData({
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            password: '',
            credentials: user.credentials || '',
            licenses: (user.licenses || []).join(', '),
            npi: user.npi || '',
            ein: user.ein || '',
        })
        setFormErrors({})
        setIsEditModalOpen(true)
    }

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'clinician',
            password: '',
            credentials: '',
            licenses: '',
            npi: '',
            ein: '',
        })
        setFormErrors({})
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = `${user.first_name} ${user.last_name} ${user.email}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'inactive' && !user.is_active)
        return matchesSearch && matchesRole && matchesStatus
    })

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
                <div className="page-header-left">
                    <h1 className="page-title">
                        <Users size={28} weight="duotone" />
                        User Management
                    </h1>
                    <p className="page-subtitle">
                        {users.length} total users · {users.filter(u => u.is_active).length} active
                    </p>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true) }}>
                    <UserCirclePlus size={20} weight="bold" />
                    Add User
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
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
                    <option value="admin">Administrator</option>
                    <option value="clinician">Clinician</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="biller">Biller</option>
                    <option value="front_desk">Front Desk</option>
                </select>
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="card">
                <div className="card-body p-0">
                    {filteredUsers.length > 0 ? (
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
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-sm">
                                                    {user.first_name[0]}{user.last_name[0]}
                                                </div>
                                                <span className="user-name">{user.first_name} {user.last_name}</span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`badge ${roleColors[user.role] || 'badge-default'}`}>
                                                {roleLabels[user.role] || user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.is_active ? 'badge-active' : 'badge-inactive'}`}>
                                                {user.is_active ? (
                                                    <><CheckCircle size={14} weight="fill" /> Active</>
                                                ) : (
                                                    <><XCircle size={14} weight="fill" /> Inactive</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="text-muted">{formatDate(user.last_login)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon-sm"
                                                    title="Edit"
                                                    onClick={() => openEditModal(user)}
                                                >
                                                    <PencilSimple size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon-sm"
                                                    title="Send password reset link"
                                                    onClick={() => handleSendResetLink(user)}
                                                    disabled={!user.is_active || isSaving}
                                                >
                                                    <EnvelopeSimple size={16} />
                                                </button>
                                                <button
                                                    className={`btn-icon-sm ${user.is_active ? 'danger' : 'success'}`}
                                                    title={user.is_active ? 'Deactivate' : 'Activate'}
                                                    onClick={() => handleDeactivate(user)}
                                                >
                                                    {user.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState
                            variant="no-data"
                            title="No users found"
                            description="Try adjusting your search or filters."
                        />
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); resetForm() }}
                title="Add New User"
                size="md"
            >
                <div className="user-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input
                                type="text"
                                className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                                placeholder="First name"
                                value={formData.firstName}
                                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            />
                            {formErrors.firstName && <p className="form-error">{formErrors.firstName}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input
                                type="text"
                                className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                                placeholder="Last name"
                                value={formData.lastName}
                                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            />
                            {formErrors.lastName && <p className="form-error">{formErrors.lastName}</p>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input
                            type="email"
                            className={`form-input ${formErrors.email ? 'error' : ''}`}
                            placeholder="user@sirenahealthehr.com"
                            value={formData.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                        />
                        {formErrors.email && <p className="form-error">{formErrors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="(555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role *</label>
                        <select
                            className="form-select"
                            value={formData.role}
                            onChange={(e) => handleFieldChange('role', e.target.value)}
                        >
                            <option value="clinician">Clinician</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrator</option>
                            <option value="biller">Biller</option>
                            <option value="front_desk">Front Desk</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input
                            type="password"
                            className={`form-input ${formErrors.password ? 'error' : ''}`}
                            placeholder="Temporary password"
                            value={formData.password}
                            onChange={(e) => handleFieldChange('password', e.target.value)}
                        />
                        {formErrors.password && <p className="form-error">{formErrors.password}</p>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Credentials</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. PsyD, ABPP"
                            value={formData.credentials}
                            onChange={(e) => handleFieldChange('credentials', e.target.value)}
                        />
                        <p className="form-hint">Academic / professional credentials shown next to the provider's name.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Licenses</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="NJ-12345, NY-67890"
                            value={formData.licenses}
                            onChange={(e) => handleFieldChange('licenses', e.target.value)}
                        />
                        <p className="form-hint">State license numbers. Separate multiple with commas.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Individual NPI</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{10}"
                            maxLength={10}
                            className="form-input"
                            placeholder="10-digit NPI (e.g., 1659841096)"
                            value={formData.npi}
                            onChange={(e) => handleFieldChange('npi', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                        <p className="form-hint">Type 1 (individual) NPI used as the rendering provider on claims. Leave blank for non-clinical staff. Validated against the CMS Luhn check on save.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">EIN (optional)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{9}"
                            maxLength={9}
                            className="form-input"
                            placeholder="9 digits (e.g., 123456789)"
                            value={formData.ein}
                            onChange={(e) => handleFieldChange('ein', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        />
                        <p className="form-hint">Only fill in if this provider bills under their own EIN (1099 contractor with their own entity). Leave blank for W-2 staff — they bill under the practice EIN.</p>
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsAddModalOpen(false); resetForm() }}>Cancel</button>
                        <button className="btn-primary" onClick={handleAddUser}>
                            <UserCirclePlus size={18} />
                            Add User
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingUser(null); resetForm() }}
                title="Edit User"
                size="md"
            >
                <div className="user-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input
                                type="text"
                                className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                                value={formData.firstName}
                                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            />
                            {formErrors.firstName && <p className="form-error">{formErrors.firstName}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input
                                type="text"
                                className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                                value={formData.lastName}
                                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            />
                            {formErrors.lastName && <p className="form-error">{formErrors.lastName}</p>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className={`form-input${formErrors.email ? ' input-error' : ''}`}
                            value={formData.email}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, email: e.target.value }))
                                if (formErrors.email) {
                                    setFormErrors(prev => ({ ...prev, email: '' }))
                                }
                            }}
                        />
                        {formErrors.email && <p className="form-error">{formErrors.email}</p>}
                        <p className="form-hint">User signs in with this address. Changing it will require them to use the new one next time.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="(555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role *</label>
                        <select
                            className="form-select"
                            value={formData.role}
                            onChange={(e) => handleFieldChange('role', e.target.value)}
                        >
                            <option value="clinician">Clinician</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrator</option>
                            <option value="biller">Biller</option>
                            <option value="front_desk">Front Desk</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Credentials</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. PsyD, ABPP"
                            value={formData.credentials}
                            onChange={(e) => handleFieldChange('credentials', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Licenses</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="NJ-12345, NY-67890"
                            value={formData.licenses}
                            onChange={(e) => handleFieldChange('licenses', e.target.value)}
                        />
                        <p className="form-hint">Comma-separated state license numbers.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Individual NPI</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{10}"
                            maxLength={10}
                            className="form-input"
                            placeholder="10-digit NPI (e.g., 1659841096)"
                            value={formData.npi}
                            onChange={(e) => handleFieldChange('npi', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                        <p className="form-hint">Type 1 (individual) NPI used as the rendering provider on claims. Leave blank for non-clinical staff. Validated against the CMS Luhn check on save.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">EIN (optional)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{9}"
                            maxLength={9}
                            className="form-input"
                            placeholder="9 digits (e.g., 123456789)"
                            value={formData.ein}
                            onChange={(e) => handleFieldChange('ein', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        />
                        <p className="form-hint">Only fill in if this provider bills under their own EIN (1099 contractor with their own entity). Leave blank for W-2 staff — they bill under the practice EIN.</p>
                    </div>
                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditingUser(null); resetForm() }}>Cancel</button>
                        <button className="btn-primary" onClick={handleEditUser}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
