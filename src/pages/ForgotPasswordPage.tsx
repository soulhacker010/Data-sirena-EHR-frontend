import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EnvelopeSimple, ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { authApi } from '../api/auth'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) {
            setError('Please enter your email address.')
            return
        }
        setIsLoading(true)
        setError('')
        try {
            await authApi.requestPasswordReset(email.trim().toLowerCase())
            setSubmitted(true)
        } catch {
            setError('Something went wrong. Please try again.')
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

                    {submitted ? (
                        <div style={{ textAlign: 'center' }}>
                            <CheckCircle size={56} weight="fill" style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
                            <h1 className="auth-title">Check your email</h1>
                            <p className="auth-subtitle" style={{ marginBottom: 32 }}>
                                If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox (and spam folder).
                            </p>
                            <Link to="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h1 className="auth-title">Forgot password?</h1>
                                <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                <div className="form-group">
                                    <label className="form-label">Email address</label>
                                    <div className="form-input-wrapper">
                                        <EnvelopeSimple size={20} weight="regular" className="form-input-icon" />
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError('') }}
                                            className={`form-input${error ? ' input-error' : ''}`}
                                            autoFocus
                                        />
                                    </div>
                                    {error && <span className="field-error">{error}</span>}
                                </div>

                                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="auth-spinner"></span>
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send reset link'
                                    )}
                                </button>
                            </form>

                            <p className="auth-footer">
                                <Link to="/login" className="auth-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <ArrowLeft size={14} /> Back to sign in
                                </Link>
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
