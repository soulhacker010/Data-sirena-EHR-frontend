import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../utils/errors'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { useAuth } from '../context'
import { authApi, settingsApi } from '../api'
import { passwordChangeSchema } from '../lib/validationSchemas'
import {
    User,
    Bell,
    Buildings,
    Lock,
    EnvelopeSimple,
    Phone,
    MapPin,
    CheckCircle,
    Plus,
    Trash,
    IdentificationBadge,
    Waveform,
} from '@phosphor-icons/react'
import { BLSDefaultsSection } from '../components/bls'

interface SettingsSection {
    id: string
    label: string
    icon: React.ElementType
}

const settingsSections: SettingsSection[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'practice', label: 'Practice Info', icon: Buildings },
    { id: 'bls', label: 'BLS Defaults', icon: Waveform },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
]

export default function SettingsPage() {
    const { user } = useAuth()
    const [activeSection, setActiveSection] = useState('profile')
    const [saved, setSaved] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const isAdmin = user?.role === 'admin'

    // Profile state — from auth context + /auth/me/ for the admin-managed
    // fields (npi, credentials, licenses, ein) that AuthContext doesn't carry.
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        // Admin-managed (read-only on this page)
        credentials: '',
        licenses: [] as string[],
        npi: '',
        ein: '',
    })
    const [isProfileSaving, setIsProfileSaving] = useState(false)

    // Practice/org state — from settings API
    const [practice, setPractice] = useState({
        name: '',
        address: '',
        contact_phone: '',
        contact_email: '',
        tax_id: ''
    })

    // NPI management state
    const [npis, setNpis] = useState<Array<{ id: string; npi_number: string; business_name: string; is_active: boolean }>>([])
    const [newNpi, setNewNpi] = useState({ npi_number: '', business_name: '' })
    const [isNpiSaving, setIsNpiSaving] = useState(false)

    // Notification preferences — loaded from backend
    const [notifications, setNotifications] = useState({
        email_appointments: true,
        email_billing: true,
        email_notes: true,
        sms_reminders: true,
        auth_alerts: true,
        denial_alerts: true
    })

    // Password
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

    // Load real data
    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                // Profile from auth context (basics) + /auth/me/ for the
                // admin-managed fields. AuthContext only carries the slim
                // AuthUser shape; the full User has npi/credentials/licenses/ein.
                if (user) {
                    setProfile(prev => ({
                        ...prev,
                        firstName: user.first_name || '',
                        lastName: user.last_name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        role: user.role || '',
                    }))
                }
                try {
                    const me = await authApi.getProfile()
                    setProfile(prev => ({
                        ...prev,
                        credentials: me.credentials || '',
                        licenses: me.licenses || [],
                        npi: me.npi || '',
                        ein: me.ein || '',
                    }))
                } catch {
                    // Non-fatal — the page still renders the editable basics.
                }

                // Organization settings
                const org = await settingsApi.getOrganization()
                setPractice({
                    name: org.name || '',
                    address: org.address || '',
                    contact_phone: org.contact_phone || '',
                    contact_email: org.contact_email || '',
                    tax_id: org.tax_id || ''
                })

                // Load NPIs
                try {
                    const { default: apiClient } = await import('../api/client')
                    const npiRes = await apiClient.get('/auth/npis/')
                    setNpis(npiRes.data || [])
                } catch (err: unknown) {
                    toast.error(getApiErrorMessage(err, 'Failed to load NPIs'))
                }

                // Notification preferences
                const prefs = await settingsApi.getNotificationPreferences()
                setNotifications(prefs)
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load settings'))
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [user])

    const handleSaveProfile = async () => {
        try {
            setIsProfileSaving(true)
            await authApi.updateProfile({
                first_name: profile.firstName,
                last_name: profile.lastName,
                phone: profile.phone,
            })
            toast.success('Profile updated successfully')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to update profile'))
        } finally {
            setIsProfileSaving(false)
        }
    }

    const handlePasswordFieldChange = (field: string, value: string) => {
        setPasswordData(prev => ({ ...prev, [field]: value }))
        if (passwordErrors[field]) {
            setPasswordErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const handlePasswordUpdate = async () => {
        const result = passwordChangeSchema.safeParse(passwordData)
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setPasswordErrors(fieldErrors)
            return
        }

        try {
            setIsSaving(true)
            await authApi.changePassword({
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword,
                confirm_password: passwordData.confirmPassword,
            })
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setPasswordErrors({})
            toast.success('Password updated successfully!')
        } catch (err: unknown) {
            const axiosData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
            if (axiosData && typeof axiosData === 'object' && !('detail' in axiosData)) {
                const fieldErrors: Record<string, string> = {}
                Object.entries(axiosData).forEach(([key, val]) => {
                    fieldErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val)
                })
                setPasswordErrors(fieldErrors)
            } else {
                toast.error(getApiErrorMessage(err, 'Failed to update password'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSavePractice = async () => {
        try {
            setIsSaving(true)
            await settingsApi.updateOrganization({
                name: practice.name,
                address: practice.address,
                contact_phone: practice.contact_phone,
                contact_email: practice.contact_email,
                tax_id: practice.tax_id,
            })
            setSaved(true)
            toast.success('Practice settings saved')
            setTimeout(() => setSaved(false), 3000)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save settings'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddNpi = async () => {
        if (!newNpi.npi_number) {
            toast.error('Enter an NPI number in the left field')
            return
        }
        if (newNpi.npi_number.length !== 10) {
            toast.error(`NPI must be exactly 10 digits — you entered ${newNpi.npi_number.length} digits`)
            return
        }
        if (!newNpi.business_name.trim()) {
            toast.error('Enter your practice / business name in the right field')
            return
        }
        setIsNpiSaving(true)
        try {
            const { default: apiClient } = await import('../api/client')
            const { data } = await apiClient.post('/auth/npis/', {
                npi_number: newNpi.npi_number,
                business_name: newNpi.business_name,
                is_active: true,
            })
            setNpis(prev => [...prev, data])
            setNewNpi({ npi_number: '', business_name: '' })
            toast.success('NPI added')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to add NPI'))
        } finally {
            setIsNpiSaving(false)
        }
    }

    const handleDeleteNpi = async (id: string) => {
        if (!window.confirm('Remove this NPI?')) return
        try {
            const { default: apiClient } = await import('../api/client')
            await apiClient.delete(`/auth/npis/${id}/`)
            setNpis(prev => prev.filter(n => n.id !== id))
            toast.success('NPI removed')
        } catch {
            toast.error('Failed to remove NPI')
        }
    }

    const handleSaveNotifications = async () => {
        try {
            setIsSaving(true)
            await settingsApi.updateNotificationPreferences(notifications)
            setSaved(true)
            toast.success('Notification preferences saved')
            setTimeout(() => setSaved(false), 3000)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save preferences'))
        } finally {
            setIsSaving(false)
        }
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
                <h1 className="page-title">
                    <Buildings size={28} weight="duotone" />
                    Settings
                </h1>
                <p className="page-subtitle">Manage your profile, practice, and preferences</p>
            </div>

            <div className="settings-layout">
                {/* Sidebar tabs */}
                <div className="settings-sidebar">
                    {settingsSections.map(section => (
                        <button
                            key={section.id}
                            className={`settings-tab ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <section.icon size={20} />
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="settings-content">
                    {/* ─── Profile Section ──────────────────────────── */}
                    {activeSection === 'profile' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Profile Information</h2>
                            <p className="settings-section-desc">Update your name. Email and role can only be changed by an administrator.</p>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <EnvelopeSimple size={16} /> Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input-basic"
                                        value={profile.email}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button className="btn-primary" onClick={handleSaveProfile} disabled={isProfileSaving}>
                                    {isProfileSaving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>

                            {/* ─── Provider IDs (read-only, admin-managed) ─── */}
                            {/* Only clinical roles need NPI / EIN — front_desk and biller
                                bill nothing under their own identity. Hide the section
                                for them so the page doesn't show useless empty rows. */}
                            {['admin', 'supervisor', 'clinician'].includes(profile.role) && (
                            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                                <h3 className="settings-section-title" style={{ fontSize: '1rem' }}>Provider IDs</h3>
                                <p className="settings-section-desc">
                                    These billing-critical fields can only be updated by an administrator. If anything below is missing or wrong, ask your admin to fix it from User Management.
                                </p>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Credentials</label>
                                        <input
                                            type="text"
                                            className="form-input-basic"
                                            value={profile.credentials || '—'}
                                            disabled
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State Licenses</label>
                                        <input
                                            type="text"
                                            className="form-input-basic"
                                            value={(profile.licenses || []).join(', ') || '—'}
                                            disabled
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Individual NPI</label>
                                        <input
                                            type="text"
                                            className="form-input-basic"
                                            value={profile.npi || '—'}
                                            disabled
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">EIN</label>
                                        <input
                                            type="text"
                                            className="form-input-basic"
                                            value={profile.ein || '—'}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>
                    )}

                    {/* ─── Practice Section ──────────────────────────── */}
                    {activeSection === 'practice' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Practice Information</h2>
                            <p className="settings-section-desc">
                                {isAdmin
                                    ? "Your organization's details used on invoices and claims."
                                    : "Your organization's details (read-only — only administrators can edit)."}
                            </p>

                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <Buildings size={16} /> Practice Name
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={practice.name}
                                        onChange={(e) => setPractice(prev => ({ ...prev, name: e.target.value }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <MapPin size={16} /> Address
                                    </label>
                                    <textarea
                                        className="form-input-basic"
                                        rows={2}
                                        value={practice.address}
                                        onChange={(e) => setPractice(prev => ({ ...prev, address: e.target.value }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <Phone size={16} /> Phone
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={practice.contact_phone}
                                        onChange={(e) => setPractice(prev => ({ ...prev, contact_phone: e.target.value }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <EnvelopeSimple size={16} /> Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input-basic"
                                        value={practice.contact_email}
                                        onChange={(e) => setPractice(prev => ({ ...prev, contact_email: e.target.value }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tax ID</label>
                                    <input
                                        type="text"
                                        className="form-input-basic"
                                        value={practice.tax_id}
                                        onChange={(e) => setPractice(prev => ({ ...prev, tax_id: e.target.value }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="form-actions">
                                    <button className="btn-primary" onClick={handleSavePractice} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    {saved && (
                                        <span className="save-indicator">
                                            <CheckCircle size={18} weight="fill" /> Saved
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* ─── NPI Management ──────────────────────── */}
                            <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <IdentificationBadge size={20} /> Provider NPIs
                                </h3>
                                <p className="settings-section-desc" style={{ marginBottom: '1rem' }}>
                                    National Provider Identifiers used on intakes and claims. Add your practice's NPI here.
                                </p>

                                {npis.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        {npis.map(npi => (
                                            <div key={npi.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '0.375rem',
                                                marginBottom: '0.5rem', border: '1px solid #e5e7eb',
                                            }}>
                                                <div>
                                                    <strong>{npi.npi_number}</strong>
                                                    <span style={{ marginLeft: '0.75rem', color: '#6b7280' }}>{npi.business_name}</span>
                                                </div>
                                                {isAdmin && (
                                                    <button
                                                        className="btn-icon-sm btn-danger"
                                                        title="Remove NPI"
                                                        onClick={() => handleDeleteNpi(npi.id)}
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isAdmin && (
                                    <div style={{
                                        background: '#f9fafb', border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem', padding: '1rem', marginTop: '0.5rem',
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontWeight: 600 }}>NPI Number *</label>
                                                <input
                                                    type="text"
                                                    className="form-input-basic"
                                                    placeholder="e.g. 1234567890"
                                                    maxLength={10}
                                                    value={newNpi.npi_number}
                                                    onChange={e => setNewNpi(prev => ({ ...prev, npi_number: e.target.value.replace(/\D/g, '') }))}
                                                />
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem', display: 'block' }}>
                                                    {newNpi.npi_number.length}/10 digits
                                                </span>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontWeight: 600 }}>Business / Practice Name *</label>
                                                <input
                                                    type="text"
                                                    className="form-input-basic"
                                                    placeholder="e.g. Baker Street Behavioral Health"
                                                    value={newNpi.business_name}
                                                    onChange={e => setNewNpi(prev => ({ ...prev, business_name: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            className="btn-primary"
                                            onClick={handleAddNpi}
                                            disabled={isNpiSaving}
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            <Plus size={16} /> {isNpiSaving ? 'Adding...' : 'Add NPI'}
                                        </button>
                                    </div>
                                )}

                                {npis.length === 0 && !isAdmin && (
                                    <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                        No NPIs configured. Ask an administrator to add one.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── BLS Defaults Section ────────────────────────── */}
                    {activeSection === 'bls' && <BLSDefaultsSection />}

                    {/* ─── Notifications Section ──────────────────────── */}
                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Notification Preferences</h2>
                            <p className="settings-section-desc">Choose how you'd like to be notified.</p>

                            <div className="notification-prefs">
                                {[
                                    { key: 'email_appointments', label: 'Email — Appointment reminders' },
                                    { key: 'email_billing', label: 'Email — Billing updates' },
                                    { key: 'email_notes', label: 'Email — Note reminders' },
                                    { key: 'sms_reminders', label: 'SMS — Session reminders' },
                                    { key: 'auth_alerts', label: 'Authorization expiration alerts' },
                                    { key: 'denial_alerts', label: 'Claim denial alerts' },
                                ].map(pref => (
                                    <div key={pref.key} className="toggle-row">
                                        <span>{pref.label}</span>
                                        <label className="toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={notifications[pref.key as keyof typeof notifications]}
                                                onChange={(e) => setNotifications(prev => ({
                                                    ...prev,
                                                    [pref.key]: e.target.checked
                                                }))}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="form-actions">
                                <button className="btn-primary" onClick={handleSaveNotifications} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Security Section ──────────────────────── */}
                    {activeSection === 'security' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Change Password</h2>
                            <p className="settings-section-desc">Update your account password.</p>

                            <div className="form-grid single-column">
                                <div className="form-group">
                                    <label className="form-label">Current Password</label>
                                    <input
                                        type="password"
                                        className={`form-input-basic ${passwordErrors.current_password || passwordErrors.currentPassword ? 'error' : ''}`}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
                                        placeholder="Enter current password"
                                    />
                                    {(passwordErrors.current_password || passwordErrors.currentPassword) && (
                                        <p className="form-error">{passwordErrors.current_password || passwordErrors.currentPassword}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        type="password"
                                        className={`form-input-basic ${passwordErrors.new_password || passwordErrors.newPassword ? 'error' : ''}`}
                                        value={passwordData.newPassword}
                                        onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                    {(passwordErrors.new_password || passwordErrors.newPassword) && (
                                        <p className="form-error">{passwordErrors.new_password || passwordErrors.newPassword}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className={`form-input-basic ${passwordErrors.confirm_password || passwordErrors.confirmPassword ? 'error' : ''}`}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                    {(passwordErrors.confirm_password || passwordErrors.confirmPassword) && (
                                        <p className="form-error">{passwordErrors.confirm_password || passwordErrors.confirmPassword}</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button className="btn-primary" onClick={handlePasswordUpdate} disabled={isSaving}>
                                    {isSaving ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </DashboardLayout>
    )
}
