interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    className?: string
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
    return (
        <div className={`loading-spinner-container ${className}`} role="status" aria-live="polite">
            <div className={`loading-spinner loading-spinner-${size}`} aria-hidden="true" />
            {text && <span className="loading-spinner-text">{text}</span>}
            {!text && <span className="sr-only">Loading</span>}
        </div>
    )
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="page-loader" role="status" aria-live="polite">
            <div className="page-loader-content">
                <div className="loading-spinner loading-spinner-lg" aria-hidden="true" />
                <span className="page-loader-text">{text}</span>
            </div>
        </div>
    )
}

export function ButtonLoader() {
    return <div className="button-loader" role="status" aria-label="Loading" />
}

export default LoadingSpinner
