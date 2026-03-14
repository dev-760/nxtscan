'use client'

import { Component, type ReactNode } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallbackMessage?: string
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * Catches unhandled React rendering errors and shows a graceful fallback
 * instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[50vh] flex items-center justify-center px-6">
                    <div className="glass-strong rounded-3xl p-10 max-w-md w-full text-center gradient-border">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-7 h-7 text-error" />
                        </div>
                        <h2 className="text-xl font-bold text-primary mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-secondary text-sm mb-6 leading-relaxed">
                            {this.props.fallbackMessage ??
                                'An unexpected error occurred. This has been logged automatically.'}
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-tertiary bg-white/[0.02] rounded-xl p-3 mb-6 text-left overflow-x-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all btn-premium"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
