import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'
import { reportClientError } from '../../lib/telemetry'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    reportClientError(error, errorInfo?.componentStack || undefined)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger ring-8 ring-danger-soft/50">
            <AlertTriangle className="size-7" />
          </div>

          <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {this.props.fallbackTitle || 'Something went wrong in this module'}
          </h2>

          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering this view. Your other department workspaces remain intact.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <div className="mt-4 max-h-48 max-w-2xl overflow-auto rounded-lg border border-border bg-subtle p-3 text-left font-mono text-xs text-danger">
              <p className="font-bold">{this.state.error.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={this.handleReset}>
              <RefreshCw className="size-3.5" />
              <span>Reload View</span>
            </Button>
            <Button variant="outline" size="sm" onClick={this.handleGoHome}>
              <Home className="size-3.5" />
              <span>Return to Overview</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
