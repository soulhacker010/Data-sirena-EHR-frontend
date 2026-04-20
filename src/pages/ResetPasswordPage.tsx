import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeSlash, Lock, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'react-hot-toast'
import { authApi } from '../api/auth'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const uid = searchParams.get('uid') || ''
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})

    const validate = () => {
        const next: typeof errors = {}
        if (password.length < 8) next.password = 'Password must be at least 8 characters.'
        if (password !== confirmPassword) next.confirm = 'Passwords do not match.'
        setErrors(next)
        return Object.keys(next).length === 0
    }

    if (!uid || !token) {
        return (
            <div className="auth-layout">
                <div className="auth-form-panel">
                    <div className="auth-form-container" style={{ textAlign: 'center' }}>
                        <h1 className="auth-title">Invalid link</h1>
                        <p className="auth-subtitle" style={{ marginBottom: 24 }}>This reset link is missing required information. Please request a new one.</p>
                        <Link to="/forgot-password" className="auth-submit-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                            Request new link
                        </Link>
                    </div>
                </div>
                <div className="auth-image-panel">
                    <img src="/images/doctorsidelogin.webp" alt="Healthcare Professional" className="auth-image" />
                    <div className="auth-image-overlay"></div>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            await authApi.confirmPasswordReset(uid, token, password)
            setSuccess(true)
            toast.success('Password reset successfully!')
            setTimeout(() => navigate('/login'), 2500)
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Invalid or expired reset link.'
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-layout">
            <div className="auth-form-panel">
                <div className="auth-form-container">
                    <div className="auth-logo">
                        <img src="/images/EHRlogo.png" alt="Sirena Health" className="auth-logo-img" />
                    </div>

                    {success ? (
                        <div style={{ textAlign: 'center' }}>
                            <CheckCircle size={56} weight="fill" style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
                            <h1 className="auth-title">Password reset!</h1>
                            <p className="auth-subtitle">Redirecting you to sign in...</p>
                        </div>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h1 className="auth-title">Set new password</h1>
                                <p className="auth-subtitle">Choose a strong password for your account.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                <div className="form-group">
                                    <label className="form-label">New password</label>
                                    <div className="form-input-wrapper">
                                        <Lock size={20} weight="regular" className="form-input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="At least 8 characters"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
                                            className={`form-input${errors.password ? ' input-error' : ''}`}
                                            autoFocus
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-input-toggle">
                                            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="field-error">{errors.password}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm new password</label>
                                    <div className="form-input-wrapper">
                                        <Lock size={20} weight="regular" className="form-input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Repeat your password"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirm: undefined })) }}
                                            className={`form-input${errors.confirm ? ' input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.confirm && <span className="field-error">{errors.confirm}</span>}
                                </div>

                                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="auth-spinner"></span>
                                            Resetting...
                                        </span>
                                    ) : (
                                        'Reset password'
                                    )}
                                </button>
                            </form>

                            <p className="auth-footer">
                                <Link to="/login" className="auth-footer-link">Back to sign in</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="auth-image-panel">
                <img src="/images/doctorsidelogin.webp" alt="Healthcare Professional" className="auth-image" />
                <div className="auth-image-overlay"></div>
                <div className="auth-image-content">
                    <h2 className="auth-image-title">Sirena Health EHR</h2>
                    <p className="auth-image-subtitle">Streamline your practice with our complete electronic health records solution</p>
                </div>
            </div>
        </div>
    )
}
