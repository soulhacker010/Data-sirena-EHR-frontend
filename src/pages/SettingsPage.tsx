import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
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
    CheckCircle
} from '@phosphor-icons/react'

interface SettingsSection {
    id: string
    label: string
    icon: React.ElementType
}

const settingsSections: SettingsSection[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'practice', label: 'Practice Info', icon: Buildings },
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

    // Profile state — from auth context
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: ''
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

    // Notification preferences — loaded from backend
    const [notifications, setNotifications] = useState({
        email_appointments: true,
        email_billing: true,
        email_notes: false,
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
                // Profile from auth context
                if (user) {
                    setProfile({
                        firstName: user.first_name || '',
                        lastName: user.last_name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        role: user.role || ''
                    })
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

                // Notification preferences
                const prefs = await settingsApi.getNotificationPreferences()
                setNotifications(prefs)
            } catch (err: any) {
                toast.error(err?.response?.data?.detail || 'Failed to load settings')
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
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update profile')
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
        } catch (err: any) {
            const detail = err?.response?.data
            if (typeof detail === 'object') {
                const fieldErrors: Record<string, string> = {}
                Object.entries(detail).forEach(([key, val]) => {
                    fieldErrors[key] = Array.isArray(val) ? (val as string[])[0] : String(val)
                })
                setPasswordErrors(fieldErrors)
            } else {
                toast.error('Failed to update password')
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
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to save settings')
        } finally {
            setIsSaving(false)
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
            const msg = ((err as Record<string, unknown>)?.response as Record<string, unknown>)?.data
                ? (((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, string>)?.detail || 'Failed to save preferences'
                : 'Failed to save preferences'
            toast.error(msg)
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
                        </div>
                    )}

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
                                    <label key={pref.key} className="toggle-row">
                                        <span>{pref.label}</span>
                                        <input
                                            type="checkbox"
                                            className="toggle-checkbox"
                                            checked={notifications[pref.key as keyof typeof notifications]}
                                            onChange={(e) => setNotifications(prev => ({
                                                ...prev,
                                                [pref.key]: e.target.checked
                                            }))}
                                        />
                                    </label>
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
