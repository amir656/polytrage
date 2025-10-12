'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, TrendingUp, Activity } from 'lucide-react'

interface BalanceCardProps {
  balance: number
  activeTrades: number
  totalPnL: number
  className?: string
}

export function BalanceCard({ balance, activeTrades, totalPnL, className }: BalanceCardProps) {
  const pnlColor = totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
  const pnlIcon = totalPnL >= 0 ? '↗' : '↘'

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          <p className="text-xs text-muted-foreground">
            Ready for arbitrage opportunities
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeTrades}</div>
          <p className="text-xs text-muted-foreground">
            Currently executing
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pnlColor}`}>
            {pnlIcon} {formatCurrency(Math.abs(totalPnL))}
          </div>
          <p className="text-xs text-muted-foreground">
            All-time profit/loss
          </p>
        </CardContent>
      </Card>
    </div>
  )
}