/**
 * Addendums (E11 + E18) — time-stamped, immutable amendments to a clinical
 * document. Addendums attach to one of three parent kinds: session note,
 * intake assessment, or treatment plan. The backend exposes a nested action
 * on each parent viewset, so we have three create/list pairs.
 *
 *   GET/POST  /notes/{id}/addendums/
 *   GET/POST  /intakes/{id}/addendums/
 *   GET/POST  /treatment-plans/{id}/addendums/
 *
 * Returns the same `Addendum` shape from each endpoint. Body is the only
 * writable field on create; author and timestamp are server-set.
 */
import apiClient from './client'

export interface Addendum {
    id: string
    body: string
    created_by_id: string
    created_by_name: string
    created_at: string
}

export type AddendumParentKind = 'note' | 'intake' | 'treatment-plan'

function urlFor(kind: AddendumParentKind, parentId: string): string {
    const segment = (
        kind === 'note' ? 'notes'
        : kind === 'intake' ? 'intakes'
        : 'treatment-plans'
    )
    return `/${segment}/${parentId}/addendums/`
}

export const addendumsApi = {
    list: async (kind: AddendumParentKind, parentId: string): Promise<Addendum[]> => {
        const { data } = await apiClient.get<Addendum[]>(urlFor(kind, parentId))
        return data
    },

    create: async (
        kind: AddendumParentKind,
        parentId: string,
        body: string,
    ): Promise<Addendum> => {
        const { data } = await apiClient.post<Addendum>(
            urlFor(kind, parentId),
            { body },
        )
        return data
    },
}
