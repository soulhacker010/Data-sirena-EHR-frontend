import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginSchema } from '../lib/validationSchemas'
import {
    Eye,
    EyeSlash,
    EnvelopeSimple,
    Lock
} from '@phosphor-icons/react'

export default function LoginPage() {
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    })

    const handleChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const result = loginSchema.safeParse(formData)
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setErrors(fieldErrors)
            return
        }

        setIsLoading(true)
        // TODO: Add actual authentication
        setTimeout(() => {
            localStorage.setItem('sirena_auth', 'true')
            setIsLoading(false)
            navigate('/dashboard')
        }, 1500)
    }

    return (
        <div className="auth-layout">
            {/* Left Panel - Form */}
            <div className="auth-form-panel">
                <div className="auth-form-container">
                    {/* Logo */}
                    <div className="auth-logo">
                        <img src="/images/EHRlogo.png" alt="Sirena Health" className="auth-logo-img" />
                    </div>

                    {/* Welcome Text */}
                    <div className="auth-header">
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">Sign in to your account to continue</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email address</label>
                            <div className="form-input-wrapper">
                                <EnvelopeSimple size={20} weight="regular" className="form-input-icon" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className={`form-input${errors.email ? ' input-error' : ''}`}
                                />
                            </div>
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="form-input-wrapper">
                                <Lock size={20} weight="regular" className="form-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className={`form-input${errors.password ? ' input-error' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="form-input-toggle"
                                >
                                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <span className="field-error">{errors.password}</span>}
                        </div>

                        {/* Remember & Forgot */}
                        <div className="form-row">
                            <label className="form-checkbox">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => handleChange('rememberMe', e.target.checked)}
                                />
                                <span>Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="form-link">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="auth-spinner"></span>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="auth-footer">
                        Need an account?{' '}
                        <Link to="/register" className="auth-footer-link">Contact your administrator</Link>
                    </p>
                </div>
            </div>

            {/* Right Panel - Doctor Image */}
            <div className="auth-image-panel">
                <img
                    src="/images/doctorsidelogin.webp"
                    alt="Healthcare Professional"
                    className="auth-image"
                />
                <div className="auth-image-overlay"></div>

                {/* Overlay Content */}
                <div className="auth-image-content">
                    <h2 className="auth-image-title">Sirena Health EHR</h2>
                    <p className="auth-image-subtitle">
                        Streamline your practice with our complete electronic health records solution
                    </p>
                </div>
            </div>
        </div>
    )
}
