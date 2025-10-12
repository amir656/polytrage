'use client'

import React from 'react'
import { ArbitrageOpportunity } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage, getTimeAgo } from '@/lib/utils'
import { TrendingUp, Clock, Target } from 'lucide-react'

interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity
  onExecute?: (opportunityId: string) => void
  disabled?: boolean
}

export function OpportunityCard({ opportunity, onExecute, disabled = false }: OpportunityCardProps) {
  const isProfitable = opportunity.profitMargin > 0
  const confidenceColor = opportunity.confidence >= 80 ? 'text-green-600' : 
                          opportunity.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'

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
          <div className={`flex items-center gap-1 ${confidenceColor}`}>
            <Target className="h-3 w-3" />
            <span>{opportunity.confidence}% confidence</span>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Oracle Price</p>
            <p className="font-medium">{formatCurrency(opportunity.oraclePrice)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Market Odds</p>
            <p className="font-medium">{opportunity.marketOdds}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Implied Price</p>
            <p className="font-medium">{formatCurrency(opportunity.impliedPrice)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Status</p>
            <p className={`font-medium capitalize ${
              opportunity.status === 'pending' ? 'text-yellow-600' :
              opportunity.status === 'executed' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {opportunity.status}
            </p>
          </div>
        </div>

        {isProfitable && opportunity.status === 'pending' && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Arbitrage Opportunity:</strong> Market undervalues this outcome by{' '}
              <strong>{formatPercentage(opportunity.profitMargin / 100)}</strong>
            </p>
          </div>
        )}

        {onExecute && opportunity.status === 'pending' && (
          <Button 
            onClick={() => onExecute(opportunity.id)}
            disabled={disabled || !isProfitable}
            className="w-full"
            variant={isProfitable ? "default" : "outline"}
          >
            {disabled ? 'Executing...' : isProfitable ? 'Execute Trade' : 'No Profit Available'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}