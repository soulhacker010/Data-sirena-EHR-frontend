import apiClient from './client'
import type { OrganizationSettings } from '../types'

export interface NotificationPreferences {
    email_appointments: boolean
    email_billing: boolean
    email_notes: boolean
    sms_reminders: boolean
    auth_alerts: boolean
    denial_alerts: boolean
}

export const settingsApi = {
    /**
     * GET /api/v1/auth/organization/
     * Returns the current user's organization settings.
     */
    getOrganization: async (): Promise<OrganizationSettings> => {
        const { data } = await apiClient.get<OrganizationSettings>('/auth/organization/')
        return data
    },

    /**
     * PUT /api/v1/auth/organization/
     * Updates the organization settings (admin only).
     */
    updateOrganization: async (payload: Partial<OrganizationSettings>): Promise<OrganizationSettings> => {
        const { data } = await apiClient.put<OrganizationSettings>('/auth/organization/', payload)
        return data
    },

    /**
     * GET /api/v1/auth/notifications/preferences/
     * Returns the current user's notification preferences.
     */
    getNotificationPreferences: async (): Promise<NotificationPreferences> => {
        const { data } = await apiClient.get<NotificationPreferences>('/auth/notifications/preferences/')
        return data
    },

    /**
     * PUT /api/v1/auth/notifications/preferences/
     * Updates the current user's notification preferences.
     */
    updateNotificationPreferences: async (payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
        const { data } = await apiClient.put<NotificationPreferences>('/auth/notifications/preferences/', payload)
        return data
    },
}
