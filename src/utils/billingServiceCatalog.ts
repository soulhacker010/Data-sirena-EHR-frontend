export interface BillingServiceCatalogEntry {
    code: string
    description: string
}

export const BILLING_SERVICE_CATALOG: BillingServiceCatalogEntry[] = [
    { code: '97151', description: 'Behavior identification assessment' },
    { code: '97153', description: 'Adaptive behavior treatment by protocol' },
    { code: '97155', description: 'Adaptive behavior treatment with protocol modification' },
    { code: '97156', description: 'Family adaptive behavior treatment guidance' },
    { code: '97157', description: 'Multiple-family group adaptive behavior treatment guidance' },
]

export const getBillingServiceDescription = (serviceCode: string) =>
    BILLING_SERVICE_CATALOG.find(entry => entry.code === serviceCode)?.description || ''
