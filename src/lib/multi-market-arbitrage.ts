/**
 * Multi-Market Arbitrage Detection
 * 
 * Finds arbitrage opportunities where the same outcome has different odds
 * across Polymarket, Augur, and PlotX prediction markets.
 */

import { ArbitrageOpportunity } from '@/types'
import { returnAnalyzer, ReturnAnalysis } from './return-analysis'

export interface MarketPrice {
  platform: 'polymarket' | 'augur' | 'plotx'
  eventId: string
  question: string
  outcome: 'YES' | 'NO'
  odds: number // Probability in percentage (0-100)
  price: number // Price to buy this outcome
  volume: number
  resolutionDate: Date // When the event resolves
  lastUpdated: Date
}

export interface CrossMarketOpportunity extends ArbitrageOpportunity {
  buyMarket: MarketPrice  // Where to buy (lower price)
  sellMarket: MarketPrice // Where to sell (higher price)
  spreadPercent: number   // Price difference as percentage
  returnAnalysis: ReturnAnalysis // Time-adjusted return analysis
  eventMatching: {
    confidence: number    // How confident we are these are the same event
    keywords: string[]    // Matching keywords found
  }
}

export class MultiMarketArbitrage {
  private polymarketService: any
  private augurService: any
  private plotXService: any

  constructor() {
    // Initialize market services
    this.polymarketService = new PolymarketService()
    this.augurService = new AugurService()
    this.plotXService = new PlotXService()
  }

  async detectCrossMarketArbitrage(): Promise<CrossMarketOpportunity[]> {
    try {
      // Fetch current prices from all platforms
      const [polymarketPrices, augurPrices, plotXPrices] = await Promise.all([
        this.polymarketService.getAllMarkets(),
        this.augurService.getAllMarkets(),
        this.plotXService.getAllMarkets()
      ])

      const allPrices = [
        ...polymarketPrices.map(p => ({ ...p, platform: 'polymarket' as const })),
        ...augurPrices.map(p => ({ ...p, platform: 'augur' as const })),
        ...plotXPrices.map(p => ({ ...p, platform: 'plotx' as const }))
      ]

      // Find matching events across platforms
      const matchedEvents = this.findMatchingEvents(allPrices)

      // Calculate arbitrage opportunities
      const opportunities: CrossMarketOpportunity[] = []
      
      for (const eventGroup of matchedEvents) {
        const arb = this.calculateArbitrage(eventGroup)
        if (arb) {
          // Only include opportunities that beat S&P 500 on risk-adjusted basis
          if (arb.returnAnalysis.beatsBenchmark && arb.returnAnalysis.riskAdjustedScore >= 15) {
            opportunities.push(arb)
          }
        }
      }

      // Sort by risk-adjusted score (best risk-adjusted returns first)
      return opportunities.sort((a, b) => b.returnAnalysis.riskAdjustedScore - a.returnAnalysis.riskAdjustedScore)

    } catch (error) {
      console.error('Error detecting cross-market arbitrage:', error)
      return []
    }
  }

  private findMatchingEvents(allPrices: MarketPrice[]): MarketPrice[][] {
    const eventGroups: Map<string, MarketPrice[]> = new Map()

    // Group events by normalized question text
    for (const price of allPrices) {
      const normalizedQuestion = this.normalizeQuestion(price.question)
      const key = this.generateEventKey(normalizedQuestion, price.outcome)
      
      if (!eventGroups.has(key)) {
        eventGroups.set(key, [])
      }
      eventGroups.get(key)!.push(price)
    }

    // Return only groups with multiple platforms
    return Array.from(eventGroups.values())
      .filter(group => {
        const platforms = new Set(group.map(p => p.platform))
        return platforms.size >= 2 // At least 2 different platforms
      })
  }

  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
  }

  private generateEventKey(question: string, outcome: string): string {
    // Extract key terms that identify the same event
    const keyTerms = this.extractKeyTerms(question)
    return `${keyTerms.join('_')}_${outcome.toLowerCase()}`
  }

  private extractKeyTerms(question: string): string[] {
    // Common prediction market topics
    const importantTerms = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'trump', 'biden', 'election', 
      '2024', '2025', 'price', 'reaches', 'above', 'below', 'wins'
    ]
    
    const words = question.toLowerCase().split(' ')
    return words.filter(word => 
      importantTerms.includes(word) || 
      /^\d+k?$/.test(word) || // Numbers like "100k"
      word.length > 6        // Long words likely to be specific
    )
  }

  private calculateArbitrage(eventGroup: MarketPrice[]): CrossMarketOpportunity | null {
    if (eventGroup.length < 2) return null

    // Find highest and lowest prices for the same outcome
    const sortedByPrice = eventGroup.sort((a, b) => a.price - b.price)
    const buyMarket = sortedByPrice[0]  // Lowest price (best to buy)
    const sellMarket = sortedByPrice[sortedByPrice.length - 1] // Highest price (best to sell)

    const spreadPercent = ((sellMarket.price - buyMarket.price) / buyMarket.price) * 100
    const profitMargin = spreadPercent - 1 // Subtract estimated fees

    if (profitMargin <= 0) return null

    // Calculate event matching confidence
    const eventMatching = this.calculateEventMatchingConfidence(eventGroup)

    // Calculate time-adjusted return analysis
    const returnAnalysis = returnAnalyzer.calculateReturnAnalysis(
      profitMargin,
      buyMarket.resolutionDate,
      eventMatching.confidence
    )

    return {
      id: `cross_market_${Date.now()}`,
      market: buyMarket.question,
      marketOdds: buyMarket.odds,
      oraclePrice: buyMarket.price,
      impliedPrice: sellMarket.price,
      profitMargin,
      confidence: eventMatching.confidence,
      detectedAt: new Date(),
      status: 'pending',
      
      // Cross-market specific fields
      buyMarket,
      sellMarket,
      spreadPercent,
      returnAnalysis,
      eventMatching
    }
  }

  private calculateEventMatchingConfidence(eventGroup: MarketPrice[]): {
    confidence: number
    keywords: string[]
  } {
    const questions = eventGroup.map(e => e.question.toLowerCase())
    const allWords = questions.flatMap(q => q.split(' '))
    
    // Find common words
    const wordCounts = new Map<string, number>()
    allWords.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    
    const commonWords = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= 2 && word.length > 3)
      .map(([word]) => word)
    
    // Calculate confidence based on common terms
    let confidence = 50 // Base confidence
    
    if (commonWords.length >= 3) confidence += 30
    else if (commonWords.length >= 2) confidence += 20
    else if (commonWords.length >= 1) confidence += 10
    
    // Check for exact number matches (like "$100k")
    const numbers = questions.flatMap(q => q.match(/\d+k?/g) || [])
    const uniqueNumbers = new Set(numbers)
    if (uniqueNumbers.size === 1 && numbers.length >= 2) {
      confidence += 25 // Same numbers across platforms
    }
    
    // Check for date matches
    const dates = questions.flatMap(q => q.match(/\d{4}|december|january|november/g) || [])
    if (dates.length >= 2) {
      confidence += 15
    }

    return {
      confidence: Math.min(confidence, 95),
      keywords: commonWords
    }
  }

  // Real-time monitoring for cross-market opportunities
  async startCrossMarketMonitoring(
    callback: (opportunities: CrossMarketOpportunity[]) => void
  ): Promise<() => void> {
    const interval = setInterval(async () => {
      try {
        const opportunities = await this.detectCrossMarketArbitrage()
        if (opportunities.length > 0) {
          callback(opportunities)
        }
      } catch (error) {
        console.error('Error in cross-market monitoring:', error)
      }
    }, 45000) // Check every 45 seconds (less frequent than single-market)

    return () => clearInterval(interval)
  }
}

// Mock services for different platforms
class PolymarketService {
  async getAllMarkets(): Promise<Omit<MarketPrice, 'platform'>[]> {
    // Mock Polymarket data with various time horizons
    return [
      {
        eventId: 'btc-100k-2024',
        question: 'Will Bitcoin reach $100,000 by December 31, 2024?',
        outcome: 'YES',
        odds: 75,
        price: 0.75,
        volume: 1250000,
        resolutionDate: new Date('2024-12-31'),
        lastUpdated: new Date()
      },
      {
        eventId: 'trump-wins-2024',
        question: 'Will Donald Trump win the 2024 US Presidential Election?',
        outcome: 'YES',
        odds: 45,
        price: 0.45,
        volume: 5000000,
        resolutionDate: new Date('2024-11-06'), // Day after election
        lastUpdated: new Date()
      },
      {
        eventId: 'eth-merge-completion',
        question: 'ETH price above $5000 by end of Q1 2025?',
        outcome: 'YES',
        odds: 62,
        price: 0.62,
        volume: 800000,
        resolutionDate: new Date('2025-03-31'), // Q1 2025
        lastUpdated: new Date()
      }
    ]
  }
}

class AugurService {
  async getAllMarkets(): Promise<Omit<MarketPrice, 'platform'>[]> {
    // Mock Augur data - slightly different prices and times for same events
    return [
      {
        eventId: 'btc-reach-100k',
        question: 'Bitcoin to reach $100k by end of 2024?',
        outcome: 'YES',
        odds: 78,
        price: 0.78,
        volume: 850000,
        resolutionDate: new Date('2024-12-31'),
        lastUpdated: new Date()
      },
      {
        eventId: 'us-election-trump',
        question: 'Trump wins 2024 presidential election',
        outcome: 'YES',
        odds: 43,
        price: 0.43,
        volume: 3200000,
        resolutionDate: new Date('2024-11-06'),
        lastUpdated: new Date()
      },
      {
        eventId: 'short-term-btc',
        question: 'Bitcoin above $95k in next 30 days?',
        outcome: 'YES',
        odds: 35,
        price: 0.35,
        volume: 150000,
        resolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        lastUpdated: new Date()
      }
    ]
  }
}

class PlotXService {
  async getAllMarkets(): Promise<Omit<MarketPrice, 'platform'>[]> {
    // Mock PlotX data with time-sensitive opportunities
    return [
      {
        eventId: 'btc-100000-dec2024',
        question: 'BTC price above $100,000 by December 2024',
        outcome: 'YES',
        odds: 73,
        price: 0.73,
        volume: 420000,
        resolutionDate: new Date('2024-12-31'),
        lastUpdated: new Date()
      },
      {
        eventId: 'short-term-btc-plotx',
        question: 'Bitcoin hits $95k within 30 days',
        outcome: 'YES',
        odds: 40,
        price: 0.40,
        volume: 75000,
        resolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date()
      },
      {
        eventId: 'weekly-btc-target',
        question: 'BTC above $97k by next Friday',
        outcome: 'YES',
        odds: 55,
        price: 0.55,
        volume: 25000,
        resolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        lastUpdated: new Date()
      }
    ]
  }
}

export const multiMarketArbitrage = new MultiMarketArbitrage()