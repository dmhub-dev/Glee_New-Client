export interface TableCategory {
  id: string
  name: string
  capacity: number
  minimumSpend: number
  depositAmount: number
  requiresFullPayment: boolean
  count: number
}

export interface Venue {
  id: string
  vendorId: string
  name: string
  description: string
  location: string
  heroBannerUrl?: string
  galleryUrls?: string[]
  tableCategories: TableCategory[]
  bookingRules?: string
  status: 'active' | 'inactive' | 'pending_approval'
}
