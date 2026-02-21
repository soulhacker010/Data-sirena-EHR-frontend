import apiClient from './client'
import type { Notification } from '../types'

export const notificationsApi = {
    getAll: async (): Promise<Notification[]> => {
        const { data } = await apiClient.get<Notification[]>('/notifications/')
        return data
    },

    markAsRead: async (id: string): Promise<Notification> => {
        const { data } = await apiClient.patch<Notification>(`/notifications/${id}/`, { is_read: true })
        return data
    },

    markAllRead: async (): Promise<{ marked_read: number }> => {
        const { data } = await apiClient.post<{ marked_read: number }>('/notifications/mark-all-read/')
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/notifications/${id}/`)
    },
}
