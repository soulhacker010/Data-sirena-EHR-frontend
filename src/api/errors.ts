/**
 * Parse API error responses into user-friendly messages.
 *
 * DRF returns errors in two formats:
 * 1. { detail: "Error message" } — for permission/auth errors
 * 2. { field_name: ["Error 1", "Error 2"] } — for validation errors
 *
 * This utility handles both and returns a readable string.
 */
export function getApiErrorMessage(err: any, fallback: string = 'Something went wrong'): string {
    const data = err?.response?.data

    if (!data) return fallback

    // Format 1: { detail: "..." }
    if (typeof data === 'string') return data
    if (data.detail) return data.detail

    // Format 2: { field: ["error"] } — DRF validation errors
    if (typeof data === 'object') {
        const messages = Object.entries(data)
            .map(([field, msgs]) => {
                const label = field.replace(/_/g, ' ')
                const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
                return `${label}: ${text}`
            })
            .slice(0, 3) // Show at most 3 errors
            .join('\n')
        return messages || fallback
    }

    return fallback
}
