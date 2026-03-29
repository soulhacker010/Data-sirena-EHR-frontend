import apiClient from './client'

export interface LocationOption {
    id: string
    name: string
    address: string
    city: string
    state: string
    zip_code: string
    is_telehealth: boolean
    is_active: boolean
}

export interface ProviderOption {
    id: string
    name: string
    first_name: string
    last_name: string
    role: string
    credentials: string
}

export const lookupsApi = {
    getLocations: async (): Promise<LocationOption[]> => {
        const { data } = await apiClient.get<LocationOption[]>('/auth/locations/')
        return data
    },

    getProviders: async (): Promise<ProviderOption[]> => {
        const { data } = await apiClient.get<ProviderOption[]>('/auth/providers/')
        return data
    },
}
