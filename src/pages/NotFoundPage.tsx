import { useNavigate } from 'react-router-dom'
import { House, ArrowLeft } from '@phosphor-icons/react'

export default function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="not-found-logo">
                    <img src="/images/EHRlogo.png" alt="Sirena Health" className="not-found-logo-img" />
                </div>

                <div className="not-found-code">404</div>

                <h1 className="not-found-title">Page not found</h1>
                <p className="not-found-description">
                    The page you're looking for doesn't exist or has been moved.
                    Let's get you back on track.
                </p>

                <div className="not-found-actions">
                    <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                        <House size={18} weight="bold" />
                        Go to Dashboard
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} weight="bold" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    )
}
