/**
 * Global client-side telemetry and error reporter for Avora ERP.
 * Dispatches immediate error notifications to developer webhooks (Discord / Slack / Teams)
 * when unhandled exceptions occur in user browsers.
 */

export function reportClientError(error: Error | string, componentStack?: string): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  console.error('[Avora Telemetry] Unhandled client exception:', message, stack, componentStack)

  const webhookUrl = import.meta.env.VITE_ERROR_WEBHOOK_URL
  if (!webhookUrl) return

  const snippet = (stack || componentStack || message).slice(0, 1000)
  const payload = {
    text: `🚨 **[Avora ERP Frontend Error]**\n**URL:** \`${window.location.href}\`\n**Error:** \`${message}\`\n**Timestamp:** \`${new Date().toISOString()}\`\n\`\`\`\n${snippet}\n\`\`\``,
  }

  try {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Ignore background reporting errors
    })
  } catch {
    // Ignore synchronous fetch errors
  }
}

export function initGlobalErrorListeners(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(
      event.reason instanceof Error
        ? event.reason
        : `Unhandled Promise Rejection: ${String(event.reason)}`,
    )
  })
}
