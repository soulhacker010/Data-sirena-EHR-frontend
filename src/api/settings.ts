import apiClient from './client'
import type { OrganizationSettings } from '../types'

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
}
