import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { passwordChangeSchema } from '../lib/validationSchemas'
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
    const [activeSection, setActiveSection] = useState('profile')
    const [saved, setSaved] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    // Profile form state
    const [profile, setProfile] = useState({
        firstName: 'Amanda',
        lastName: 'Wilson',
        email: 'amanda.wilson@sirenahealthehr.com',
        phone: '(555) 123-4567',
        role: 'Administrator'
    })

    // Practice form state
    const [practice, setPractice] = useState({
        name: 'Sirena Health ABA Center',
        address: '123 Medical Plaza Dr',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        phone: '(512) 555-1234',
        email: 'info@sirenahealthaba.com',
        npi: '1234567890',
        taxId: '12-3456789'
    })

    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailAppointments: true,
        emailBilling: true,
        emailNotes: false,
        smsReminders: true,
        authAlerts: true,
        denialAlerts: true
    })

    // Password form state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

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

    const handlePasswordUpdate = () => {
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

        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setPasswordErrors({})
        toast.success('Password updated successfully!')
    }

    const handleSave = () => {
        setSaved(true)
        toast.success('Settings saved successfully')
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
                <div className="page-header-content">
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your account and practice settings</p>
                </div>
            </div>

            <div className="settings-layout">
                {/* Settings Navigation */}
                <div className="settings-nav">
                    {settingsSections.map(section => (
                        <button
                            key={section.id}
                            className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <section.icon size={20} weight={activeSection === section.id ? 'fill' : 'regular'} />
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="settings-content">
                    {/* Profile Section */}
                    {activeSection === 'profile' && (
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h2>Profile Settings</h2>
                                <p>Update your personal information</p>
                            </div>

                            <div className="settings-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name</label>
                                        <input
                                            type="text"
                                            value={profile.firstName}
                                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name</label>
                                        <input
                                            type="text"
                                            value={profile.lastName}
                                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <div className="input-with-icon">
                                            <EnvelopeSimple size={18} />
                                            <input
                                                type="email"
                                                value={profile.email}
                                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <div className="input-with-icon">
                                            <Phone size={18} />
                                            <input
                                                type="tel"
                                                value={profile.phone}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Role</label>
                                    <input type="text" value={profile.role} disabled className="input-disabled" />
                                    <p className="form-hint">Contact an administrator to change your role</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Practice Section */}
                    {activeSection === 'practice' && (
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h2>Practice Information</h2>
                                <p>Update your practice details</p>
                            </div>

                            <div className="settings-form">
                                <div className="form-group">
                                    <label>Practice Name</label>
                                    <input
                                        type="text"
                                        value={practice.name}
                                        onChange={(e) => setPractice({ ...practice, name: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Address</label>
                                    <div className="input-with-icon">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            value={practice.address}
                                            onChange={(e) => setPractice({ ...practice, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row form-row-3">
                                    <div className="form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            value={practice.city}
                                            onChange={(e) => setPractice({ ...practice, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            value={practice.state}
                                            onChange={(e) => setPractice({ ...practice, state: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>ZIP Code</label>
                                        <input
                                            type="text"
                                            value={practice.zipCode}
                                            onChange={(e) => setPractice({ ...practice, zipCode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Practice Phone</label>
                                        <input
                                            type="tel"
                                            value={practice.phone}
                                            onChange={(e) => setPractice({ ...practice, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Practice Email</label>
                                        <input
                                            type="email"
                                            value={practice.email}
                                            onChange={(e) => setPractice({ ...practice, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>NPI Number</label>
                                        <input
                                            type="text"
                                            value={practice.npi}
                                            onChange={(e) => setPractice({ ...practice, npi: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tax ID</label>
                                        <input
                                            type="text"
                                            value={practice.taxId}
                                            onChange={(e) => setPractice({ ...practice, taxId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h2>Notification Preferences</h2>
                                <p>Choose how you want to be notified</p>
                            </div>

                            <div className="settings-form">
                                <div className="settings-group">
                                    <h3>Email Notifications</h3>
                                    <div className="toggle-group">
                                        <label className="toggle-label">
                                            <span>Appointment reminders</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.emailAppointments}
                                                onChange={(e) => setNotifications({ ...notifications, emailAppointments: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                        <label className="toggle-label">
                                            <span>Billing updates</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.emailBilling}
                                                onChange={(e) => setNotifications({ ...notifications, emailBilling: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                        <label className="toggle-label">
                                            <span>Session note reminders</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.emailNotes}
                                                onChange={(e) => setNotifications({ ...notifications, emailNotes: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <h3>SMS Notifications</h3>
                                    <div className="toggle-group">
                                        <label className="toggle-label">
                                            <span>Appointment reminders via SMS</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.smsReminders}
                                                onChange={(e) => setNotifications({ ...notifications, smsReminders: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <h3>System Alerts</h3>
                                    <div className="toggle-group">
                                        <label className="toggle-label">
                                            <span>Authorization usage alerts</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.authAlerts}
                                                onChange={(e) => setNotifications({ ...notifications, authAlerts: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                        <label className="toggle-label">
                                            <span>Claim denial notifications</span>
                                            <input
                                                type="checkbox"
                                                checked={notifications.denialAlerts}
                                                onChange={(e) => setNotifications({ ...notifications, denialAlerts: e.target.checked })}
                                            />
                                            <span className="toggle-switch"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Section */}
                    {activeSection === 'security' && (
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h2>Security Settings</h2>
                                <p>Manage your password and security options</p>
                            </div>

                            <div className="settings-form">
                                <div className="settings-group">
                                    <h3>Change Password</h3>
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter current password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
                                            className={passwordErrors.currentPassword ? 'input-error' : ''}
                                        />
                                        {passwordErrors.currentPassword && <span className="field-error">{passwordErrors.currentPassword}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            placeholder="Enter new password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                                            className={passwordErrors.newPassword ? 'input-error' : ''}
                                        />
                                        {passwordErrors.newPassword && <span className="field-error">{passwordErrors.newPassword}</span>}
                                        <p className="form-hint">Must be at least 8 characters with one number and one special character</p>
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                                            className={passwordErrors.confirmPassword ? 'input-error' : ''}
                                        />
                                        {passwordErrors.confirmPassword && <span className="field-error">{passwordErrors.confirmPassword}</span>}
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        onClick={handlePasswordUpdate}
                                    >Update Password</button>
                                </div>

                                <div className="settings-group">
                                    <h3>Session Settings</h3>
                                    <div className="form-group">
                                        <label>Auto-logout after inactivity</label>
                                        <select defaultValue="30">
                                            <option value="15">15 minutes</option>
                                            <option value="30">30 minutes</option>
                                            <option value="60">1 hour</option>
                                            <option value="120">2 hours</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Appearance Section */}
                    {activeSection === 'appearance' && (
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h2>Appearance</h2>
                                <p>Customize how Sirena looks</p>
                            </div>

                            <div className="settings-form">
                                <div className="settings-group">
                                    <h3>Theme</h3>
                                    <div className="theme-options">
                                        <button
                                            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                                            onClick={() => setTheme('light')}
                                        >
                                            <Sun size={24} weight="duotone" />
                                            <span>Light</span>
                                        </button>
                                        <button
                                            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                                            onClick={() => setTheme('dark')}
                                        >
                                            <Moon size={24} weight="duotone" />
                                            <span>Dark</span>
                                        </button>
                                    </div>
                                    <p className="form-hint">Dark mode coming soon!</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="settings-actions">
                        <button className="btn-primary" onClick={handleSave}>
                            {saved ? (
                                <>
                                    <CheckCircle size={18} weight="fill" />
                                    Saved!
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
