import { NextRequest, NextResponse } from 'next/server'
import { arbitrageDetector } from '@/lib/arbitrage'
import { ApiResponse, ArbitrageOpportunity } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minProfit = parseFloat(searchParams.get('minProfit') || '3')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Create detector with custom minimum profit if provided
    const detector = new (arbitrageDetector.constructor as any)(minProfit)
    
    // Detect arbitrage opportunities
    const opportunities = await detector.detectOpportunities()
    
    // Limit results
    const limitedOpportunities = opportunities.slice(0, limit)

    const response: ApiResponse<ArbitrageOpportunity[]> = {
      success: true,
      data: limitedOpportunities,
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error detecting arbitrage opportunities:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect arbitrage opportunities',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { minProfitMargin, markets } = body

    if (minProfitMargin && (typeof minProfitMargin !== 'number' || minProfitMargin < 0)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid minProfitMargin parameter',
        timestamp: new Date()
      }, { status: 400 })
    }

    // Create custom detector
    const detector = new (arbitrageDetector.constructor as any)(minProfitMargin || 3)
    
    // Detect opportunities
    const opportunities = await detector.detectOpportunities()

    // Filter by specific markets if provided
    const filteredOpportunities = markets 
      ? opportunities.filter(opp => markets.includes(opp.market))
      : opportunities

    const response: ApiResponse<ArbitrageOpportunity[]> = {
      success: true,
      data: filteredOpportunities,
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in custom arbitrage detection:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect arbitrage opportunities',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}