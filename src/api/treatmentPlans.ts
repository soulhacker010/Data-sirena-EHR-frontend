import apiClient from './client'

export interface TreatmentPlanGoal {
    id: string
    problem: string
    long_term_goal: string
    objectives: string
    target_date: string
    progress: string
    notes: string
    goal_type: string
    status: 'continued' | 'modified' | 'met' | 'discontinued' | 'new'
    linked_note_ids: string[]
}

export interface TreatmentPlan {
    id: string
    client_id: string
    client_name: string
    provider_id: string
    provider_name: string
    from_intake: string | null
    goals: TreatmentPlanGoal[]
    plan_data: Record<string, unknown>
    start_date: string
    review_date: string | null
    is_active: boolean
    version: number
    status: 'draft' | 'active' | 'signed' | 'co_signed' | 'expired'
    is_locked: boolean
    signature_data: string
    signed_at: string | null
    co_signed_by: string | null
    co_signer_name: string | null
    co_signed_at: string | null
    supervisor_signature: string
    created_at: string
    updated_at: string
}

export interface TreatmentPlanListItem {
    id: string
    client_name: string
    provider_name: string
    start_date: string
    review_date: string | null
    is_active: boolean
    version: number
    status: string
    is_locked: boolean
    created_at: string
}

export interface PaginatedPlans {
    count: number
    next: string | null
    previous: string | null
    results: TreatmentPlanListItem[]
}

export interface PlanFilters {
    client?: string
    is_active?: boolean
    status?: string
    page?: number
}

export const treatmentPlansApi = {
    getAll: async (filters?: PlanFilters): Promise<PaginatedPlans> => {
        const { data } = await apiClient.get<PaginatedPlans>('/treatment-plans/', { params: filters })
        return data
    },

    getById: async (id: string): Promise<TreatmentPlan> => {
        const { data } = await apiClient.get<TreatmentPlan>(`/treatment-plans/${id}/`)
        return data
    },

    create: async (payload: {
        client_id: string
        start_date: string
        goals: TreatmentPlanGoal[]
        plan_data: Record<string, unknown>
        review_date?: string
        from_intake?: string
    }): Promise<TreatmentPlan> => {
        const { data } = await apiClient.post<TreatmentPlan>('/treatment-plans/', payload)
        return data
    },

    update: async (id: string, payload: {
        goals: TreatmentPlanGoal[]
        plan_data: Record<string, unknown>
        start_date?: string
        review_date?: string
        version?: number
    }): Promise<TreatmentPlan> => {
        const { data } = await apiClient.put<TreatmentPlan>(`/treatment-plans/${id}/`, payload)
        return data
    },

    sign: async (id: string, signatureData: string): Promise<TreatmentPlan> => {
        const { data } = await apiClient.post<TreatmentPlan>(`/treatment-plans/${id}/sign/`, { signature_data: signatureData })
        return data
    },

    coSign: async (id: string, signatureData: string): Promise<TreatmentPlan> => {
        const { data } = await apiClient.post<TreatmentPlan>(`/treatment-plans/${id}/co-sign/`, { signature_data: signatureData })
        return data
    },

    copyFromPrevious: async (clientId: string): Promise<TreatmentPlan> => {
        const { data } = await apiClient.get<TreatmentPlan>('/treatment-plans/copy-from-previous/', { params: { client: clientId } })
        return data
    },

    pullIntakeStrengths: async (clientId: string): Promise<Record<string, string>> => {
        const { data } = await apiClient.get<Record<string, string>>('/treatment-plans/pull-intake-strengths/', { params: { client: clientId } })
        return data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/treatment-plans/${id}/`)
    },
}
