import { NextRequest, NextResponse } from 'next/server'
import { pythService } from '@/lib/pyth'
import { ApiResponse, ArbitrageDetectionResult } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbols = searchParams.get('symbols')?.split(',') as ('BTC' | 'ETH')[] || ['BTC', 'ETH']

    // Fetch prices for requested symbols
    const pricePromises = symbols.map(symbol => pythService.fetchPrice(symbol))
    const prices = await Promise.all(pricePromises)

    const priceData = symbols.reduce((acc, symbol, index) => {
      acc[symbol.toLowerCase() as 'btc' | 'eth'] = prices[index]
      return acc
    }, {} as { btc?: any; eth?: any })

    const response: ApiResponse<typeof priceData> = {
      success: true,
      data: priceData,
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching prices:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prices',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid symbols parameter',
        timestamp: new Date()
      }, { status: 400 })
    }

    // Get price update data for on-chain updates
    const updateData = await pythService.getPriceUpdateData(symbols)

    const response: ApiResponse<{ updateData: string[] }> = {
      success: true,
      data: { updateData },
      timestamp: new Date()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting price update data:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get price update data',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}