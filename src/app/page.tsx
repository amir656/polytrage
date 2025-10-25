'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from '@/components/wallet-connect'
import { BalanceCard } from '@/components/balance-card'
import { OpportunityCard } from '@/components/opportunity-card'
import { CrossMarketOpportunityCard } from '@/components/cross-market-opportunity-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArbitrageOpportunity } from '@/types'
import { CrossMarketOpportunity } from '@/lib/multi-market-arbitrage'
import { Bot, TrendingUp, Zap, MessageCircle } from 'lucide-react'
import Link from 'next/link'

// Mock cross-market arbitrage opportunities
const mockCrossMarketOpportunities: CrossMarketOpportunity[] = [
  {
    id: '1',
    market: 'Will Bitcoin reach $100,000 by December 31, 2024?',
    marketOdds: 75,
    oraclePrice: 0.75,
    impliedPrice: 0.78,
    profitMargin: 3.2,
    confidence: 92,
    detectedAt: new Date(Date.now() - 300000),
    status: 'pending',
    buyMarket: {
      platform: 'polymarket',
      eventId: 'btc-100k-2024',
      question: 'Will Bitcoin reach $100,000 by December 31, 2024?',
      outcome: 'YES',
      odds: 75,
      price: 0.75,
      volume: 1250000,
      resolutionDate: new Date('2024-12-31'),
      lastUpdated: new Date()
    },
    sellMarket: {
      platform: 'augur',
      eventId: 'btc-reach-100k',
      question: 'Bitcoin to reach $100k by end of 2024?',
      outcome: 'YES',
      odds: 78,
      price: 0.78,
      volume: 850000,
      resolutionDate: new Date('2024-12-31'),
      lastUpdated: new Date()
    },
    spreadPercent: 4.0,
    returnAnalysis: {
      rawReturn: 3.2,
      timeToResolution: 68,
      annualizedReturn: 18.2,
      sp500Benchmark: 20.8,
      beatsBenchmark: false,
      riskAdjustedScore: 16.7,
      timeCategory: 'short'
    },
    eventMatching: {
      confidence: 92,
      keywords: ['bitcoin', '100k', '2024', 'reach']
    }
  },
  {
    id: '2',
    market: 'Trump wins 2024 presidential election',
    marketOdds: 45,
    oraclePrice: 0.43,
    impliedPrice: 0.45,
    profitMargin: 1.7,
    confidence: 88,
    detectedAt: new Date(Date.now() - 600000),
    status: 'pending',
    buyMarket: {
      platform: 'augur',
      eventId: 'us-election-trump',
      question: 'Trump wins 2024 presidential election',
      outcome: 'YES',
      odds: 43,
      price: 0.43,
      volume: 3200000,
      resolutionDate: new Date('2024-11-06'),
      lastUpdated: new Date()
    },
    sellMarket: {
      platform: 'polymarket',
      eventId: 'trump-wins-2024',
      question: 'Will Donald Trump win the 2024 US Presidential Election?',
      outcome: 'YES',
      odds: 45,
      price: 0.45,
      volume: 5000000,
      resolutionDate: new Date('2024-11-06'),
      lastUpdated: new Date()
    },
    spreadPercent: 4.7,
    returnAnalysis: {
      rawReturn: 1.7,
      timeToResolution: 12,
      annualizedReturn: 57.3,
      sp500Benchmark: 50,
      beatsBenchmark: true,
      riskAdjustedScore: 50.4,
      timeCategory: 'short'
    },
    eventMatching: {
      confidence: 88,
      keywords: ['trump', '2024', 'election', 'wins']
    }
  }
]

export default function Home() {
  const { isConnected, address } = useAccount()
  const [crossMarketOpportunities, setCrossMarketOpportunities] = useState<CrossMarketOpportunity[]>(mockCrossMarketOpportunities)
  const [executingTrade, setExecutingTrade] = useState<string | null>(null)

  const handleExecuteTrade = async (opportunityId: string) => {
    setExecutingTrade(opportunityId)
    // Simulate trade execution
    setTimeout(() => {
      setCrossMarketOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, status: 'executed' as const }
            : opp
        )
      )
      setExecutingTrade(null)
    }, 2000)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Bot className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">ArbitrageAI</CardTitle>
            <p className="text-muted-foreground">
              Autonomous Prediction Market Arbitrage Platform
            </p>
          </CardHeader>
          <CardContent>
            <WalletConnect />
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Cross-market arbitrage detection</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Polymarket, Augur, PlotX price monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>Automated execution via Vincent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold">ArbitrageAI</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/chat"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>ASI:One Chat</span>
              </Link>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <BalanceCard 
          balance={1234.56}
          activeTrades={2}
          totalPnL={456.78}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cross-Market Arbitrage Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {crossMarketOpportunities.length > 0 ? (
                  <div className="space-y-4">
                    {crossMarketOpportunities.map((opportunity) => (
                      <CrossMarketOpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        onExecute={handleExecuteTrade}
                        disabled={executingTrade === opportunity.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cross-market arbitrage opportunities detected</p>
                    <p className="text-sm">Scanning Polymarket, Augur, and PlotX...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agent Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Scanner Agent</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Analyzer Agent</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Executor Agent</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">5 min ago</span>
                    <span>BTC opportunity detected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">10 min ago</span>
                    <span>ETH trade executed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">15 min ago</span>
                    <span>Scanner updated prices</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
