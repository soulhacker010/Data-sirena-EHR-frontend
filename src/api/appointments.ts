import apiClient from './client'
import type {
    Appointment,
    CreateAppointmentPayload,
    UpdateAppointmentPayload,
    AppointmentFilters,
    AppointmentStatus,
} from '../types'

export const appointmentsApi = {
    getAll: async (filters: AppointmentFilters): Promise<Appointment[]> => {
        const { data } = await apiClient.get<Appointment[]>('/appointments/', { params: filters })
        return data
    },

    getById: async (id: string): Promise<Appointment> => {
        const { data } = await apiClient.get<Appointment>(`/appointments/${id}/`)
        return data
    },

    create: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
        const { data } = await apiClient.post<Appointment>('/appointments/', payload)
        return data
    },

    update: async (id: string, payload: UpdateAppointmentPayload): Promise<Appointment> => {
        const { data } = await apiClient.put<Appointment>(`/appointments/${id}/`, payload)
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/appointments/${id}/`)
    },

    updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
        const { data } = await apiClient.post<Appointment>(`/appointments/${id}/status/`, { status })
        return data
    },
}
