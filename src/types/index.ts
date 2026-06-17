export interface Opportunity {
  id: string
  market: string
  marketUrl: string
  conditionId: string
  asset: string
  side: 'YES' | 'NO'
  marketOdds: number
  oraclePrice: number
  targetPrice: number
  profitMargin: number
  confidence: number
  status: 'pending' | 'placed' | 'dismissed'
  detectedAt: string
  updatedAt: string
}

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
