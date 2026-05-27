/**
 * Parse API error responses into user-friendly messages.
 *
 * The backend's custom_exception_handler wraps DRF errors into:
 *   { error: true, message: "first-error string", errors: { field: [...] } }
 *
 * Older endpoints may still return raw DRF formats:
 *   1. { detail: "Error message" }                       — auth / permission
 *   2. { field_name: ["Error 1", "Error 2"] }            — validation
 *
 * This utility recognises all three and falls back to a generic string only
 * when the response truly carries no usable information.
 */
export function getApiErrorMessage(err: unknown, fallback: string = 'Something went wrong'): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosErr = err as { response?: { data?: any } }
    const data = axiosErr?.response?.data

    if (!data) return fallback
    if (typeof data === 'string') return data

    // Custom wrapper format — most likely shape from this backend
    if (typeof data === 'object' && data.error === true) {
        // The wrapper already computed a "field: first-error" message.
        // Prefer it over re-scanning the errors map.
        if (typeof data.message === 'string' && data.message) return data.message
        if (data.errors && typeof data.errors === 'object') {
            const messages = Object.entries(data.errors)
                .map(([field, msgs]) => {
                    const label = field.replace(/_/g, ' ')
                    const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
                    return `${label}: ${text}`
                })
                .slice(0, 3)
                .join('\n')
            if (messages) return messages
        }
    }

    // Raw DRF formats (older endpoints)
    if (data.detail) return String(data.detail)

    if (typeof data === 'object') {
        const messages = Object.entries(data)
            .filter(([k]) => k !== 'error' && k !== 'errors' && k !== 'message')
            .map(([field, msgs]) => {
                const label = field.replace(/_/g, ' ')
                const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
                return `${label}: ${text}`
            })
            .slice(0, 3)
            .join('\n')
        if (messages) return messages
    }

    return fallback
}
