import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
})

// ─── Request Interceptor: attach Bearer token ────────────────────────────────
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('sirena_access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// ─── Response Interceptor: handle 401, attempt refresh ───────────────────────
let isRefreshing = false
let failedQueue: Array<{
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return apiClient(originalRequest)
                    })
                    .catch((err) => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            const refreshToken = localStorage.getItem('sirena_refresh_token')
            if (!refreshToken) {
                localStorage.removeItem('sirena_access_token')
                localStorage.removeItem('sirena_refresh_token')
                localStorage.removeItem('sirena_auth')
                window.location.href = '/login'
                return Promise.reject(error)
            }

            try {
                const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                    refresh: refreshToken,
                })
                localStorage.setItem('sirena_access_token', data.access)
                processQueue(null, data.access)
                originalRequest.headers.Authorization = `Bearer ${data.access}`
                return apiClient(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                localStorage.removeItem('sirena_access_token')
                localStorage.removeItem('sirena_refresh_token')
                localStorage.removeItem('sirena_auth')
                window.location.href = '/login'
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default apiClient
