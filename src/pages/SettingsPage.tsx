import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { useAuth } from '../context'
import { authApi, settingsApi } from '../api'
import { passwordChangeSchema } from '../lib/validationSchemas'
import type { OrganizationSettings } from '../types'
import {
    User,
    Bell,
    Moon,
    Sun,
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
    { id: 'appearance', label: 'Appearance', icon: Moon },
]

export default function SettingsPage() {
    const { user } = useAuth()
    const [activeSection, setActiveSection] = useState('profile')
    const [saved, setSaved] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    // Profile state — from auth context
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: ''
    })

    // Practice/org state — from settings API
    const [practice, setPractice] = useState({
        name: '',
        address: '',
        contact_phone: '',
        contact_email: '',
        tax_id: ''
    })

    // Notification preferences (client-side for now)
    const [notifications, setNotifications] = useState({
        emailAppointments: true,
        emailBilling: true,
        emailNotes: false,
        smsReminders: true,
        authAlerts: true,
        denialAlerts: true
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
                        phone: '',
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
            } catch (err: any) {
                toast.error(err?.response?.data?.detail || 'Failed to load settings')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [user])

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

    const handleSaveNotifications = () => {
        // Notification prefs stored locally for now
        setSaved(true)
        toast.success('Notification preferences saved')
        setTimeout(() => setSaved(false), 3000)
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
                            <p className="settings-section-desc">Your personal information — contact your admin to update.</p>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={profile.firstName}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={profile.lastName}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <EnvelopeSimple size={16} /> Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={profile.email}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Practice Section ──────────────────────────── */}
                    {activeSection === 'practice' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Practice Information</h2>
                            <p className="settings-section-desc">Your organization's details used on invoices and claims.</p>

                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <Buildings size={16} /> Practice Name
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={practice.name}
                                        onChange={(e) => setPractice(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <MapPin size={16} /> Address
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        value={practice.address}
                                        onChange={(e) => setPractice(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <Phone size={16} /> Phone
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={practice.contact_phone}
                                        onChange={(e) => setPractice(prev => ({ ...prev, contact_phone: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        <EnvelopeSimple size={16} /> Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={practice.contact_email}
                                        onChange={(e) => setPractice(prev => ({ ...prev, contact_email: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tax ID</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={practice.tax_id}
                                        onChange={(e) => setPractice(prev => ({ ...prev, tax_id: e.target.value }))}
                                    />
                                </div>
                            </div>

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
                        </div>
                    )}

                    {/* ─── Notifications Section ──────────────────────── */}
                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Notification Preferences</h2>
                            <p className="settings-section-desc">Choose how you'd like to be notified.</p>

                            <div className="notification-prefs">
                                {[
                                    { key: 'emailAppointments', label: 'Email — Appointment reminders' },
                                    { key: 'emailBilling', label: 'Email — Billing updates' },
                                    { key: 'emailNotes', label: 'Email — Note reminders' },
                                    { key: 'smsReminders', label: 'SMS — Session reminders' },
                                    { key: 'authAlerts', label: 'Authorization expiration alerts' },
                                    { key: 'denialAlerts', label: 'Claim denial alerts' },
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
                                <button className="btn-primary" onClick={handleSaveNotifications}>
                                    Save Preferences
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
                                        className={`form-control ${passwordErrors.current_password || passwordErrors.currentPassword ? 'error' : ''}`}
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
                                        className={`form-control ${passwordErrors.new_password || passwordErrors.newPassword ? 'error' : ''}`}
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
                                        className={`form-control ${passwordErrors.confirm_password || passwordErrors.confirmPassword ? 'error' : ''}`}
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

                    {/* ─── Appearance Section ──────────────────────── */}
                    {activeSection === 'appearance' && (
                        <div className="settings-section">
                            <h2 className="settings-section-title">Appearance</h2>
                            <p className="settings-section-desc">Customize your display preferences.</p>

                            <div className="theme-toggle">
                                <button
                                    className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun size={24} weight={theme === 'light' ? 'fill' : 'regular'} />
                                    <span>Light</span>
                                </button>
                                <button
                                    className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon size={24} weight={theme === 'dark' ? 'fill' : 'regular'} />
                                    <span>Dark</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
