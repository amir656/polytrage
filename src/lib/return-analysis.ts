/**
 * Return Analysis and Benchmarking
 * 
 * Calculates annualized returns and compares against S&P 500 benchmark
 * to ensure arbitrage opportunities are worth the time and risk.
 */

export interface ReturnAnalysis {
  rawReturn: number           // Raw profit margin %
  timeToResolution: number    // Days until event resolves
  annualizedReturn: number    // APY %
  sp500Benchmark: number      // S&P 500 10-year average
  beatsBenchmark: boolean     // Whether APY beats S&P 500
  riskAdjustedScore: number   // Risk-adjusted return score
  timeCategory: 'short' | 'medium' | 'long' // Time bucket
}

export class ReturnAnalyzer {
  // S&P 500 average annual return over last 10 years (2014-2024)
  private readonly SP500_10_YEAR_AVERAGE = 12.8 // %

  // Risk-free rate (current 10-year Treasury)
  private readonly RISK_FREE_RATE = 4.5 // %

  // Risk premium required for prediction market arbitrage
  private readonly ARBITRAGE_RISK_PREMIUM = 8.0 // % (additional return required)

  calculateReturnAnalysis(
    profitMargin: number, 
    resolutionDate: Date,
    confidence: number = 100
  ): ReturnAnalysis {
    const now = new Date()
    const timeToResolution = Math.max(1, Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) // Days
    
    // Calculate annualized return
    const annualizedReturn = this.calculateAnnualizedReturn(profitMargin, timeToResolution)
    
    // Determine required benchmark based on time horizon
    const requiredReturn = this.calculateRequiredReturn(timeToResolution)
    
    // Risk-adjusted score considering confidence
    const riskAdjustedScore = this.calculateRiskAdjustedScore(
      annualizedReturn, 
      confidence, 
      timeToResolution
    )

    return {
      rawReturn: profitMargin,
      timeToResolution,
      annualizedReturn,
      sp500Benchmark: requiredReturn,
      beatsBenchmark: annualizedReturn >= requiredReturn,
      riskAdjustedScore,
      timeCategory: this.categorizeTimeHorizon(timeToResolution)
    }
  }

  private calculateAnnualizedReturn(profitMargin: number, days: number): number {
    // Formula: ((1 + return)^(365/days)) - 1
    const periodicReturn = profitMargin / 100
    const annualized = Math.pow(1 + periodicReturn, 365 / days) - 1
    return annualized * 100
  }

  private calculateRequiredReturn(days: number): number {
    // Short-term trades need higher returns due to opportunity cost
    if (days <= 30) {
      // For trades under 30 days, require at least 50% APY
      return Math.max(50, this.SP500_10_YEAR_AVERAGE + this.ARBITRAGE_RISK_PREMIUM)
    } else if (days <= 180) {
      // For trades under 6 months, require 25% APY minimum
      return Math.max(25, this.SP500_10_YEAR_AVERAGE + this.ARBITRAGE_RISK_PREMIUM)
    } else if (days <= 365) {
      // For trades under 1 year, beat S&P + risk premium
      return this.SP500_10_YEAR_AVERAGE + this.ARBITRAGE_RISK_PREMIUM
    } else {
      // For long-term trades, just beat S&P 500 + modest premium
      return this.SP500_10_YEAR_AVERAGE + 5
    }
  }

  private calculateRiskAdjustedScore(
    annualizedReturn: number, 
    confidence: number, 
    days: number
  ): number {
    // Adjust return for confidence level
    const confidenceAdjusted = annualizedReturn * (confidence / 100)
    
    // Penalize longer time horizons (liquidity risk)
    const liquidityPenalty = days > 365 ? 0.8 : days > 180 ? 0.9 : 1.0
    
    // Final risk-adjusted score
    return confidenceAdjusted * liquidityPenalty
  }

  private categorizeTimeHorizon(days: number): 'short' | 'medium' | 'long' {
    if (days <= 90) return 'short'
    if (days <= 365) return 'medium'
    return 'long'
  }

  // Get human-readable explanation of the analysis
  getAnalysisExplanation(analysis: ReturnAnalysis): string {
    const { rawReturn, timeToResolution, annualizedReturn, beatsBenchmark, timeCategory } = analysis

    if (timeToResolution <= 7) {
      return `${rawReturn.toFixed(1)}% return in ${timeToResolution} days = ${annualizedReturn.toFixed(0)}% APY. Excellent short-term opportunity!`
    } else if (timeToResolution <= 30) {
      return `${rawReturn.toFixed(1)}% return in ${timeToResolution} days = ${annualizedReturn.toFixed(0)}% APY. Strong monthly return.`
    } else if (timeToResolution <= 90) {
      return `${rawReturn.toFixed(1)}% return in ${timeToResolution} days = ${annualizedReturn.toFixed(0)}% APY. ${beatsBenchmark ? 'Beats' : 'Below'} quarterly benchmark.`
    } else if (timeToResolution <= 365) {
      return `${rawReturn.toFixed(1)}% return in ${Math.round(timeToResolution/30)} months = ${annualizedReturn.toFixed(0)}% APY. ${beatsBenchmark ? 'Outperforms' : 'Underperforms'} S&P 500.`
    } else {
      const years = (timeToResolution / 365).toFixed(1)
      return `${rawReturn.toFixed(1)}% return over ${years} years = ${annualizedReturn.toFixed(1)}% APY. ${beatsBenchmark ? 'Modest outperformance' : 'Below market returns'}.`
    }
  }

  // Filter opportunities that meet time-adjusted return thresholds
  filterViableOpportunities<T extends { profitMargin: number }>(
    opportunities: (T & { resolutionDate?: Date })[],
    minAnnualizedReturn?: number
  ): (T & { returnAnalysis: ReturnAnalysis })[] {
    return opportunities
      .map(opp => ({
        ...opp,
        returnAnalysis: this.calculateReturnAnalysis(
          opp.profitMargin,
          opp.resolutionDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Default 90 days
          85 // Default confidence
        )
      }))
      .filter(opp => {
        const threshold = minAnnualizedReturn || opp.returnAnalysis.sp500Benchmark
        return opp.returnAnalysis.beatsBenchmark && opp.returnAnalysis.annualizedReturn >= threshold
      })
      .sort((a, b) => b.returnAnalysis.riskAdjustedScore - a.returnAnalysis.riskAdjustedScore)
  }

  // Quick check if an opportunity is worth pursuing
  isOpportunityViable(
    profitMargin: number, 
    resolutionDate: Date, 
    confidence: number = 85
  ): boolean {
    const analysis = this.calculateReturnAnalysis(profitMargin, resolutionDate, confidence)
    return analysis.beatsBenchmark && analysis.riskAdjustedScore >= 15 // Minimum 15% risk-adjusted return
  }
}

// Singleton instance
export const returnAnalyzer = new ReturnAnalyzer()

// Utility function for quick APY calculation
export function calculateAPY(profitPercent: number, days: number): number {
  if (days <= 0) return 0
  const periodicReturn = profitPercent / 100
  return (Math.pow(1 + periodicReturn, 365 / days) - 1) * 100
}

// Utility function to format time duration
export function formatTimeDuration(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} hours`
  if (days < 7) return `${days} days`
  if (days < 30) return `${Math.round(days / 7)} weeks`
  if (days < 365) return `${Math.round(days / 30)} months`
  return `${(days / 365).toFixed(1)} years`
}