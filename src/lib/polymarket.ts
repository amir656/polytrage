import axios from 'axios'
import { appConfig } from './config'
import { PolymarketMarket } from '@/types'

export class PolymarketService {
  private baseURL: string

  constructor() {
    this.baseURL = appConfig.polymarketApiUrl
  }

  async getMarkets(limit: number = 20): Promise<PolymarketMarket[]> {
    try {
      // Mock data for now - replace with real Polymarket API calls
      const mockMarkets: PolymarketMarket[] = [
        {
          id: 'btc-100k-dec31',
          question: 'Will Bitcoin reach $100,000 by December 31, 2024?',
          outcome: 'YES',
          odds: 75,
          volume: 1250000,
          endDate: new Date('2024-12-31T23:59:59Z')
        },
        {
          id: 'eth-5k-dec31',
          question: 'Will Ethereum reach $5,000 by December 31, 2024?',
          outcome: 'YES',
          odds: 60,
          volume: 850000,
          endDate: new Date('2024-12-31T23:59:59Z')
        },
        {
          id: 'trump-wins-2024',
          question: 'Will Donald Trump win the 2024 US Presidential Election?',
          outcome: 'YES',
          odds: 45,
          volume: 25000000,
          endDate: new Date('2024-11-05T23:59:59Z')
        }
      ]

      return mockMarkets.slice(0, limit)
    } catch (error) {
      console.error('Error fetching Polymarket data:', error)
      throw error
    }
  }

  async getMarketById(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const markets = await this.getMarkets()
      return markets.find(market => market.id === marketId) || null
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error)
      throw error
    }
  }

  async getMarketOdds(marketId: string): Promise<number> {
    try {
      const market = await this.getMarketById(marketId)
      return market?.odds || 0
    } catch (error) {
      console.error(`Error fetching odds for market ${marketId}:`, error)
      throw error
    }
  }

  // Real implementation would use Polymarket CLOB API
  private async fetchFromCLOB(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      })
      return response.data
    } catch (error) {
      console.error('CLOB API error:', error)
      throw error
    }
  }
}

export const polymarketService = new PolymarketService()