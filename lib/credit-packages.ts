export type CreditPackageId = 'starter' | 'popular' | 'best_value' | 'premium'

export interface CreditPackage {
  id: CreditPackageId
  name: string
  credits: number
  price: number // KES
}

// Canonical source of truth for pricing. The client only ever sends a
// packageId — never a price or credit amount — so a tampered client request
// can't grant free or inflated credits.
export const CREDIT_PACKAGES: Record<CreditPackageId, CreditPackage> = {
  starter: { id: 'starter', name: 'Starter', credits: 100, price: 200 },
  popular: { id: 'popular', name: 'Popular', credits: 250, price: 450 },
  best_value: { id: 'best_value', name: 'Value', credits: 500, price: 800 },
  premium: { id: 'premium', name: 'Premium', credits: 1000, price: 1500 },
}

export const CREDIT_PACKAGE_LIST = Object.values(CREDIT_PACKAGES)
