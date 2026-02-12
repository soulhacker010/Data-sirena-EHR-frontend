interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    className?: string
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
    return (
        <div className={`loading-spinner-container ${className}`}>
            <div className={`loading-spinner loading-spinner-${size}`} />
            {text && <span className="loading-spinner-text">{text}</span>}
        </div>
    )
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="page-loader">
            <div className="page-loader-content">
                <div className="loading-spinner loading-spinner-lg" />
                <span className="page-loader-text">{text}</span>
            </div>
        </div>
    )
}

export function ButtonLoader() {
    return <div className="button-loader" />
}

export default LoadingSpinner
