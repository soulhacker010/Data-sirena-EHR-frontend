import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Butterfly, ArrowCounterClockwise, Warning } from '@phosphor-icons/react'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/dashboard'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-page">
                    <div className="error-boundary-card">
                        <div className="error-boundary-icon">
                            <Warning size={64} weight="duotone" />
                        </div>

                        <div className="error-boundary-logo">
                            <Butterfly size={28} weight="duotone" />
                            <span>Sirena Health</span>
                        </div>

                        <h1 className="error-boundary-title">Something went wrong</h1>
                        <p className="error-boundary-description">
                            We encountered an unexpected error. Don't worry — your data is safe.
                            Please try reloading the page.
                        </p>

                        {this.state.error && (
                            <div className="error-boundary-detail">
                                <code>{this.state.error.message}</code>
                            </div>
                        )}

                        <div className="error-boundary-actions">
                            <button className="btn-primary" onClick={this.handleReload}>
                                <ArrowCounterClockwise size={18} weight="bold" />
                                Reload Application
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
