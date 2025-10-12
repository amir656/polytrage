import { NextRequest, NextResponse } from 'next/server'
import { vincentService } from '@/lib/vincent'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'create_app':
        const app = await vincentService.createApp()
        return NextResponse.json({
          success: true,
          data: app,
          timestamp: new Date()
        })

      case 'execute_bet':
        const { market, outcome, amount, delegation } = params
        
        if (!market || !outcome || !amount || !delegation) {
          return NextResponse.json({
            success: false,
            error: 'Missing required parameters: market, outcome, amount, delegation',
            timestamp: new Date()
          }, { status: 400 })
        }

        const result = await vincentService.executeBet(
          { market, outcome, amount },
          delegation
        )

        return NextResponse.json({
          success: result.success,
          data: result.success ? { txHash: result.txHash } : null,
          error: result.error,
          timestamp: new Date()
        })

      case 'register_ability':
        await vincentService.registerPolymarketAbility()
        return NextResponse.json({
          success: true,
          data: { message: 'Polymarket ability registered' },
          timestamp: new Date()
        })

      case 'calculate_bet_size':
        const { profitMargin, confidence, bankroll, maxBetSize } = params
        
        if (typeof profitMargin !== 'number' || typeof confidence !== 'number' || 
            typeof bankroll !== 'number' || typeof maxBetSize !== 'number') {
          return NextResponse.json({
            success: false,
            error: 'Invalid parameters for bet size calculation',
            timestamp: new Date()
          }, { status: 400 })
        }

        const optimalSize = vincentService.calculateOptimalBetSize(
          profitMargin,
          confidence,
          bankroll,
          maxBetSize
        )

        return NextResponse.json({
          success: true,
          data: { optimalBetSize: optimalSize },
          timestamp: new Date()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          timestamp: new Date()
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Vincent API error:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Vincent operation failed',
      timestamp: new Date()
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'userAddress parameter required',
        timestamp: new Date()
      }, { status: 400 })
    }

    const status = await vincentService.getUserStatus(userAddress)

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Vincent status error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user status',
      timestamp: new Date()
    }, { status: 500 })
  }
}