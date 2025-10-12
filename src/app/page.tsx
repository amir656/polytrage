'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from '@/components/wallet-connect'
import { BalanceCard } from '@/components/balance-card'
import { OpportunityCard } from '@/components/opportunity-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArbitrageOpportunity } from '@/types'
import { Bot, TrendingUp, Zap } from 'lucide-react'

// Mock data - will be replaced with real data
const mockOpportunities: ArbitrageOpportunity[] = [
  {
    id: '1',
    market: 'BTC > $100k by Dec 31',
    marketOdds: 75,
    oraclePrice: 98500,
    impliedPrice: 133333,
    profitMargin: 6.2,
    confidence: 85,
    detectedAt: new Date(Date.now() - 300000), // 5 minutes ago
    status: 'pending'
  },
  {
    id: '2',
    market: 'ETH > $5k by Dec 31',
    marketOdds: 60,
    oraclePrice: 3800,
    impliedPrice: 8333,
    profitMargin: 4.8,
    confidence: 72,
    detectedAt: new Date(Date.now() - 600000), // 10 minutes ago
    status: 'pending'
  }
]

export default function Home() {
  const { isConnected, address } = useAccount()
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(mockOpportunities)
  const [executingTrade, setExecutingTrade] = useState<string | null>(null)

  const handleExecuteTrade = async (opportunityId: string) => {
    setExecutingTrade(opportunityId)
    // Simulate trade execution
    setTimeout(() => {
      setOpportunities(prev => 
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
                <span>Multi-agent arbitrage detection</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Automated execution via Vincent</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>Powered by ASI Alliance & Pyth</span>
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
            <WalletConnect />
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
                  Live Arbitrage Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {opportunities.map((opportunity) => (
                      <OpportunityCard
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
                    <p>No arbitrage opportunities detected</p>
                    <p className="text-sm">Agents are scanning markets...</p>
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
