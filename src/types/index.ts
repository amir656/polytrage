export interface OracleOpportunity {
  id: string
  type: 'oracle'
  market: string
  conditionId: string
  asset: string
  side: 'YES' | 'NO'
  marketOdds: number
  marketUrl: string
  oraclePrice: number
  targetPrice: number
  profitMargin: number
  confidence: number
  status: 'pending' | 'placed' | 'dismissed'
  detectedAt: string
  updatedAt: string
}

export interface CrossVenueOpportunity {
  id: string
  type: 'cross_venue'
  market: string
  conditionId: string
  asset: string
  targetPrice: number
  leg1Venue: string
  leg1Url: string
  leg1Outcome: string
  leg1Price: number
  leg2Venue: string
  leg2Url: string
  leg2Outcome: string
  leg2Price: number
  spread: number
  profitMargin: number
  confidence: number
  status: 'pending' | 'placed' | 'dismissed'
  detectedAt: string
  updatedAt: string
}

export type Opportunity = OracleOpportunity | CrossVenueOpportunity

export interface DashboardData {
  lastScanAt: string | null
  opportunities: Opportunity[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}
