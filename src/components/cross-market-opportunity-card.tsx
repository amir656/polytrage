'use client'

import React from 'react'
import { CrossMarketOpportunity } from '@/lib/multi-market-arbitrage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage, getTimeAgo } from '@/lib/utils'
import { formatTimeDuration } from '@/lib/return-analysis'
import { TrendingUp, Clock, Target, ArrowRightLeft, ShoppingCart, DollarSign, Calendar, Zap } from 'lucide-react'

interface CrossMarketOpportunityCardProps {
  opportunity: CrossMarketOpportunity
  onExecute?: (opportunityId: string) => void
  disabled?: boolean
}

export function CrossMarketOpportunityCard({ 
  opportunity, 
  onExecute, 
  disabled = false 
}: CrossMarketOpportunityCardProps) {
  const isProfitable = opportunity.profitMargin > 0
  const confidenceColor = opportunity.confidence >= 80 ? 'text-green-600' : 
                          opportunity.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'

  const platformColors = {
    polymarket: 'bg-purple-100 text-purple-800',
    augur: 'bg-blue-100 text-blue-800',
    plotx: 'bg-green-100 text-green-800'
  }

  return (
    <Card className={`transition-all hover:shadow-md ${isProfitable ? 'border-green-200' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{opportunity.market}</CardTitle>
          <div className={`flex items-center gap-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-4 w-4" />
            <span className="font-bold">{formatPercentage(opportunity.profitMargin / 100)}</span>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{getTimeAgo(opportunity.detectedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatTimeDuration(opportunity.returnAnalysis.timeToResolution)}</span>
          </div>
          <div className={`flex items-center gap-1 ${confidenceColor}`}>
            <Target className="h-3 w-3" />
            <span>{opportunity.confidence.toFixed(1)}% match</span>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cross-Market Arbitrage Details */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Cross-Market Arbitrage</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Buy Side */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3 w-3 text-green-600" />
                <span className="font-medium text-green-700">Buy at</span>
              </div>
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                platformColors[opportunity.buyMarket.platform]
              }`}>
                {opportunity.buyMarket.platform.toUpperCase()}
              </div>
              <p className="text-green-700 font-medium">
                ${opportunity.buyMarket.price.toFixed(3)} ({opportunity.buyMarket.odds}%)
              </p>
            </div>

            {/* Sell Side */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-blue-600" />
                <span className="font-medium text-blue-700">Sell at</span>
              </div>
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                platformColors[opportunity.sellMarket.platform]
              }`}>
                {opportunity.sellMarket.platform.toUpperCase()}
              </div>
              <p className="text-blue-700 font-medium">
                ${opportunity.sellMarket.price.toFixed(3)} ({opportunity.sellMarket.odds}%)
              </p>
            </div>
          </div>
        </div>

        {/* Opportunity Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Price Spread</p>
            <p className="font-medium text-orange-600">
              {formatPercentage(opportunity.spreadPercent / 100)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Profit After Fees</p>
            <p className="font-medium text-green-600">
              {formatPercentage(opportunity.profitMargin / 100)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Buy Volume</p>
            <p className="font-medium">{formatCurrency(opportunity.buyMarket.volume)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Sell Volume</p>
            <p className="font-medium">{formatCurrency(opportunity.sellMarket.volume)}</p>
          </div>
        </div>

        {/* Event Matching Details */}
        {opportunity.eventMatching.keywords.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Matching Keywords:</p>
            <div className="flex flex-wrap gap-1">
              {opportunity.eventMatching.keywords.map((keyword, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Arbitrage Explanation */}
        {isProfitable && opportunity.status === 'pending' && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Arbitrage Strategy:</strong> Buy "{opportunity.buyMarket.outcome}" on{' '}
              <strong>{opportunity.buyMarket.platform}</strong> at ${opportunity.buyMarket.price.toFixed(3)}, 
              then sell on <strong>{opportunity.sellMarket.platform}</strong> at $
              {opportunity.sellMarket.price.toFixed(3)} for{' '}
              <strong>{formatPercentage(opportunity.profitMargin / 100)}</strong> profit.
            </p>
          </div>
        )}

        {/* Execution Button */}
        {onExecute && opportunity.status === 'pending' && (
          <Button 
            onClick={() => onExecute(opportunity.id)}
            disabled={disabled || !isProfitable}
            className="w-full"
            variant={isProfitable ? "default" : "outline"}
          >
            {disabled ? 'Executing...' : 
             isProfitable ? 'Execute Cross-Market Arbitrage' : 'No Profit Available'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}