import { ArbitrageOpportunity, PythPriceData, PolymarketMarket } from '@/types'
import { pythService } from './pyth'
import { polymarketService } from './polymarket'
import { calculateProfitMargin } from './utils'

export class ArbitrageDetector {
  private minProfitMargin: number = 3 // 3% minimum profit
  private maxPriceAge: number = 60000 // 60 seconds max price age

  constructor(minProfitMargin?: number) {
    if (minProfitMargin) {
      this.minProfitMargin = minProfitMargin
    }
  }

  async detectOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      // Fetch current prices and market data
      const [priceData, markets] = await Promise.all([
        this.fetchPriceData(),
        polymarketService.getMarkets()
      ])

      const opportunities: ArbitrageOpportunity[] = []

      // Analyze each market for arbitrage opportunities
      for (const market of markets) {
        const opportunity = await this.analyzeMarket(market, priceData)
        if (opportunity && opportunity.profitMargin >= this.minProfitMargin) {
          opportunities.push(opportunity)
        }
      }

      // Sort by profit margin (highest first)
      return opportunities.sort((a, b) => b.profitMargin - a.profitMargin)
    } catch (error) {
      console.error('Error detecting arbitrage opportunities:', error)
      return []
    }
  }

  private async fetchPriceData(): Promise<{ btc: PythPriceData; eth: PythPriceData }> {
    const prices = await pythService.fetchAllPrices()
    
    // Validate price freshness
    const now = Date.now()
    const btcAge = now - (prices.btc.publishTime * 1000)
    const ethAge = now - (prices.eth.publishTime * 1000)

    if (btcAge > this.maxPriceAge || ethAge > this.maxPriceAge) {
      throw new Error('Price data is too old')
    }

    return prices
  }

  private async analyzeMarket(
    market: PolymarketMarket, 
    priceData: { btc: PythPriceData; eth: PythPriceData }
  ): Promise<ArbitrageOpportunity | null> {
    try {
      let oraclePrice: number
      let impliedPrice: number

      // Map market to corresponding oracle price
      if (market.question.toLowerCase().includes('bitcoin') || market.question.toLowerCase().includes('btc')) {
        oraclePrice = priceData.btc.price
        impliedPrice = this.calculateImpliedPrice(market.odds, 100000) // BTC $100k target
      } else if (market.question.toLowerCase().includes('ethereum') || market.question.toLowerCase().includes('eth')) {
        oraclePrice = priceData.eth.price
        impliedPrice = this.calculateImpliedPrice(market.odds, 5000) // ETH $5k target
      } else {
        // Skip non-crypto price markets for now
        return null
      }

      const profitMargin = calculateProfitMargin(oraclePrice, impliedPrice)
      const confidence = this.calculateConfidence(market, priceData, profitMargin)

      // Only return opportunities with positive profit margin
      if (profitMargin <= 0) {
        return null
      }

      return {
        id: `${market.id}-${Date.now()}`,
        market: market.question,
        marketOdds: market.odds,
        oraclePrice,
        impliedPrice,
        profitMargin,
        confidence,
        detectedAt: new Date(),
        status: 'pending'
      }
    } catch (error) {
      console.error(`Error analyzing market ${market.id}:`, error)
      return null
    }
  }

  private calculateImpliedPrice(marketOdds: number, targetPrice: number): number {
    // Convert market odds to implied probability
    const impliedProbability = marketOdds / 100
    
    // Calculate what the current price should be based on market odds
    // If market says 75% chance BTC hits $100k, implied current fair value is lower
    const impliedCurrentPrice = targetPrice * (1 - impliedProbability) + (targetPrice * 0.1) * impliedProbability
    
    return impliedCurrentPrice
  }

  private calculateConfidence(
    market: PolymarketMarket, 
    priceData: { btc: PythPriceData; eth: PythPriceData },
    profitMargin: number
  ): number {
    let confidence = 50 // Base confidence

    // Higher volume = more confidence
    if (market.volume > 1000000) confidence += 20
    else if (market.volume > 100000) confidence += 10

    // Higher profit margin = more confidence (up to a point)
    if (profitMargin > 10) confidence += 30
    else if (profitMargin > 5) confidence += 20
    else if (profitMargin > 3) confidence += 10

    // Price confidence from Pyth oracle
    const relevantPrice = market.question.toLowerCase().includes('btc') ? priceData.btc : priceData.eth
    const priceConfidenceRatio = relevantPrice.confidence / relevantPrice.price
    
    if (priceConfidenceRatio < 0.001) confidence += 15 // Very confident price
    else if (priceConfidenceRatio < 0.01) confidence += 10
    else if (priceConfidenceRatio > 0.05) confidence -= 10 // Less confident price

    return Math.min(Math.max(confidence, 0), 100)
  }

  // Real-time opportunity monitoring
  async startMonitoring(callback: (opportunities: ArbitrageOpportunity[]) => void): Promise<() => void> {
    const interval = setInterval(async () => {
      try {
        const opportunities = await this.detectOpportunities()
        callback(opportunities)
      } catch (error) {
        console.error('Error in arbitrage monitoring:', error)
      }
    }, 30000) // Check every 30 seconds

    // Return cleanup function
    return () => clearInterval(interval)
  }
}

export const arbitrageDetector = new ArbitrageDetector()