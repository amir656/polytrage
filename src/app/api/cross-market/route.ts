import { NextRequest, NextResponse } from 'next/server'
import { multiMarketArbitrage } from '@/lib/multi-market-arbitrage'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minSpread = parseFloat(searchParams.get('minSpread') || '2')
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '70')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Detect cross-market arbitrage opportunities
    const opportunities = await multiMarketArbitrage.detectCrossMarketArbitrage()
    
    // Filter by user criteria
    const filteredOpportunities = opportunities.filter(opp => 
      opp.spreadPercent >= minSpread && 
      opp.confidence >= minConfidence
    ).slice(0, limit)

    const response: ApiResponse<typeof filteredOpportunities> = {
      success: true,
      data: filteredOpportunities,
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error detecting cross-market arbitrage:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect cross-market arbitrage',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platforms, eventTypes, minSpread, minConfidence } = body

    // Custom cross-market detection with specific parameters
    const opportunities = await multiMarketArbitrage.detectCrossMarketArbitrage()
    
    // Apply custom filters
    const customFiltered = opportunities.filter(opp => {
      // Filter by platforms if specified
      if (platforms && platforms.length > 0) {
        const hasRequiredPlatforms = platforms.some((platform: string) => 
          opp.buyMarket.platform === platform || opp.sellMarket.platform === platform
        )
        if (!hasRequiredPlatforms) return false
      }

      // Filter by event types if specified
      if (eventTypes && eventTypes.length > 0) {
        const hasEventType = eventTypes.some((type: string) => 
          opp.market.toLowerCase().includes(type.toLowerCase())
        )
        if (!hasEventType) return false
      }

      // Apply spread and confidence filters
      if (minSpread && opp.spreadPercent < minSpread) return false
      if (minConfidence && opp.confidence < minConfidence) return false

      return true
    })

    const response: ApiResponse<typeof customFiltered> = {
      success: true,
      data: customFiltered,
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in custom cross-market detection:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process cross-market request',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}