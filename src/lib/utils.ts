import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function calculateProfitMargin(oraclePrice: number, impliedPrice: number): number {
  return ((impliedPrice - oraclePrice) / oraclePrice) * 100
}

export function calculateOptimalBetSize(
  profitMargin: number,
  bankroll: number,
  kellyFraction: number = 0.25
): number {
  // Simplified Kelly Criterion calculation
  const edge = profitMargin / 100
  const odds = 1 + edge
  const probability = 1 / odds
  
  const kellyPercent = (probability * odds - 1) / (odds - 1)
  return Math.max(0, Math.min(bankroll * kellyPercent * kellyFraction, bankroll * 0.1))
}

export function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}