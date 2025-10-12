"""
Analyzer Agent for ArbitrageAI Platform
Deployed on Fetch.ai Agentverse

This agent receives opportunities from Scanner Agent, applies MeTTa reasoning
to assess risk/reward, and recommends trades to the Executor Agent.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import math


@dataclass
class OpportunityAnalysis:
    market: str
    profit_margin: float
    confidence: float
    risk_score: float
    recommendation: str  # "EXECUTE", "SKIP", "MONITOR"
    bet_size: float
    reasoning: List[str]


class MeTTaReasoning:
    """MeTTa-inspired reasoning engine for trade analysis"""
    
    def __init__(self):
        self.knowledge_base = {
            "market_patterns": {
                "crypto_volatility": 0.8,
                "prediction_market_accuracy": 0.7,
                "volume_confidence_threshold": 100000
            },
            "risk_parameters": {
                "max_profit_margin": 15.0,  # Above this seems too good to be true
                "min_confidence": 60.0,
                "max_risk_score": 70.0
            },
            "historical_performance": {
                "btc_predictions": {"accuracy": 0.72, "avg_margin": 4.2},
                "eth_predictions": {"accuracy": 0.68, "avg_margin": 3.8}
            }
        }
    
    def analyze_opportunity(self, opportunity: Dict) -> OpportunityAnalysis:
        """Apply MeTTa reasoning to analyze opportunity"""
        market = opportunity["market"]
        profit_margin = opportunity["profit_margin"]
        confidence = opportunity["confidence"]
        
        reasoning = []
        risk_score = 0.0
        
        # Rule 1: Profit margin analysis
        if profit_margin > self.knowledge_base["risk_parameters"]["max_profit_margin"]:
            risk_score += 30
            reasoning.append(f"High profit margin ({profit_margin:.1f}%) may indicate pricing error")
        elif profit_margin > 8.0:
            risk_score += 10
            reasoning.append(f"Strong profit margin ({profit_margin:.1f}%) detected")
        else:
            reasoning.append(f"Moderate profit margin ({profit_margin:.1f}%)")
        
        # Rule 2: Confidence assessment
        if confidence < self.knowledge_base["risk_parameters"]["min_confidence"]:
            risk_score += 25
            reasoning.append(f"Low confidence ({confidence:.1f}%) in opportunity")
        elif confidence > 85:
            risk_score -= 10
            reasoning.append(f"High confidence ({confidence:.1f}%) in opportunity")
        
        # Rule 3: Asset-specific historical performance
        asset_type = "btc" if "bitcoin" in market.lower() or "btc" in market.lower() else "eth"
        if asset_type in self.knowledge_base["historical_performance"]:
            hist_perf = self.knowledge_base["historical_performance"][f"{asset_type}_predictions"]
            if hist_perf["accuracy"] > 0.7:
                risk_score -= 5
                reasoning.append(f"Strong historical accuracy for {asset_type.upper()} predictions")
            else:
                risk_score += 10
                reasoning.append(f"Moderate historical accuracy for {asset_type.upper()} predictions")
        
        # Rule 4: Market volatility consideration
        volatility = self.knowledge_base["market_patterns"]["crypto_volatility"]
        if volatility > 0.7:
            risk_score += 15
            reasoning.append("High crypto market volatility increases risk")
        
        # Rule 5: Generate recommendation
        recommendation = self._generate_recommendation(profit_margin, confidence, risk_score)
        reasoning.append(f"Recommendation: {recommendation}")
        
        # Rule 6: Calculate optimal bet size using Kelly Criterion
        bet_size = self._calculate_kelly_bet_size(profit_margin, confidence, risk_score)
        
        return OpportunityAnalysis(
            market=market,
            profit_margin=profit_margin,
            confidence=confidence,
            risk_score=risk_score,
            recommendation=recommendation,
            bet_size=bet_size,
            reasoning=reasoning
        )
    
    def _generate_recommendation(self, profit_margin: float, confidence: float, risk_score: float) -> str:
        """Generate trading recommendation based on MeTTa rules"""
        
        # MeTTa-style logical rules
        if (profit_margin > 5.0 and 
            confidence > 70.0 and 
            risk_score < self.knowledge_base["risk_parameters"]["max_risk_score"]):
            return "EXECUTE"
        
        elif (profit_margin > 3.0 and 
              confidence > 60.0 and 
              risk_score < 80.0):
            return "MONITOR"
        
        else:
            return "SKIP"
    
    def _calculate_kelly_bet_size(self, profit_margin: float, confidence: float, risk_score: float) -> float:
        """Calculate optimal bet size using modified Kelly Criterion"""
        
        # Convert confidence to probability
        win_probability = confidence / 100.0
        
        # Convert profit margin to odds
        odds = 1 + (profit_margin / 100.0)
        
        # Kelly fraction: f = (bp - q) / b
        # where b = odds-1, p = win_probability, q = 1-p
        b = odds - 1
        p = win_probability
        q = 1 - p
        
        if b <= 0 or p <= 0:
            return 0.0
        
        kelly_fraction = (b * p - q) / b
        
        # Apply risk adjustment
        risk_adjustment = max(0.1, 1.0 - (risk_score / 100.0))
        adjusted_fraction = kelly_fraction * risk_adjustment
        
        # Cap at 10% of bankroll for safety
        return min(max(adjusted_fraction, 0.0), 0.10)


class AnalyzerAgent:
    def __init__(self, agent_address: str):
        self.agent_address = agent_address
        self.metta_engine = MeTTaReasoning()
        self.executor_agent_address = "agent1q_executor_address_here"
        self.scanner_agent_address = "agent1q_scanner_address_here"
        self.pending_opportunities = []
        
    async def start_analyzing(self):
        """Main analysis loop"""
        print(f"Analyzer Agent {self.agent_address} starting...")
        
        while True:
            try:
                # In production, listen for messages from Scanner Agent
                # For demo, simulate receiving opportunities
                await self.process_pending_opportunities()
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                print(f"Error in analysis loop: {e}")
                await asyncio.sleep(5)
    
    async def receive_opportunities(self, message: Dict):
        """Receive opportunities from Scanner Agent"""
        try:
            if message.get("type") == "opportunities_detected":
                opportunities = message.get("opportunities", [])
                print(f"Received {len(opportunities)} opportunities from Scanner")
                
                for opp in opportunities:
                    analysis = self.metta_engine.analyze_opportunity(opp)
                    
                    if analysis.recommendation == "EXECUTE":
                        await self.send_trade_recommendation(analysis)
                    elif analysis.recommendation == "MONITOR":
                        self.pending_opportunities.append(analysis)
                    
                    # Log reasoning
                    print(f"\n--- Analysis for {analysis.market} ---")
                    print(f"Profit: {analysis.profit_margin:.2f}%")
                    print(f"Confidence: {analysis.confidence:.1f}%")
                    print(f"Risk Score: {analysis.risk_score:.1f}")
                    print(f"Recommendation: {analysis.recommendation}")
                    print(f"Bet Size: {analysis.bet_size:.2%}")
                    print("Reasoning:")
                    for reason in analysis.reasoning:
                        print(f"  - {reason}")
                    
        except Exception as e:
            print(f"Error processing opportunities: {e}")
    
    async def process_pending_opportunities(self):
        """Re-analyze pending opportunities"""
        if not self.pending_opportunities:
            return
        
        updated_opportunities = []
        for analysis in self.pending_opportunities:
            # Re-evaluate based on time decay and new information
            updated_analysis = self._update_analysis(analysis)
            
            if updated_analysis.recommendation == "EXECUTE":
                await self.send_trade_recommendation(updated_analysis)
            elif updated_analysis.recommendation == "MONITOR":
                updated_opportunities.append(updated_analysis)
        
        self.pending_opportunities = updated_opportunities
    
    def _update_analysis(self, analysis: OpportunityAnalysis) -> OpportunityAnalysis:
        """Update analysis based on time decay and new factors"""
        # For demo, simple time decay
        time_factor = 0.95  # Slight confidence decay over time
        updated_confidence = analysis.confidence * time_factor
        
        # Re-run MeTTa reasoning with updated confidence
        mock_opportunity = {
            "market": analysis.market,
            "profit_margin": analysis.profit_margin,
            "confidence": updated_confidence
        }
        
        return self.metta_engine.analyze_opportunity(mock_opportunity)
    
    async def send_trade_recommendation(self, analysis: OpportunityAnalysis):
        """Send trade recommendation to Executor Agent"""
        try:
            message = {
                "type": "trade_recommendation",
                "from": self.agent_address,
                "timestamp": time.time(),
                "recommendation": {
                    "market": analysis.market,
                    "action": "EXECUTE",
                    "bet_size": analysis.bet_size,
                    "profit_margin": analysis.profit_margin,
                    "confidence": analysis.confidence,
                    "risk_score": analysis.risk_score,
                    "reasoning": analysis.reasoning
                }
            }
            
            # In production, send via Fetch.ai messaging
            # For demo, log the recommendation
            print(f"\n🚀 SENDING TRADE RECOMMENDATION TO EXECUTOR:")
            print(json.dumps(message, indent=2))
            
        except Exception as e:
            print(f"Error sending trade recommendation: {e}")


# MeTTa Knowledge Graph Demo
def demonstrate_metta_reasoning():
    """Demonstrate MeTTa-style reasoning with knowledge graphs"""
    print("\n=== MeTTa Reasoning Engine Demo ===")
    
    # Sample opportunity
    opportunity = {
        "market": "Will Bitcoin reach $100,000 by December 31, 2024?",
        "profit_margin": 6.2,
        "confidence": 85.0,
        "oracle_price": 98500,
        "implied_price": 93000
    }
    
    metta = MeTTaReasoning()
    analysis = metta.analyze_opportunity(opportunity)
    
    print(f"Market: {analysis.market}")
    print(f"Profit Margin: {analysis.profit_margin}%")
    print(f"Confidence: {analysis.confidence}%")
    print(f"Risk Score: {analysis.risk_score}")
    print(f"Recommendation: {analysis.recommendation}")
    print(f"Optimal Bet Size: {analysis.bet_size:.2%}")
    print("\nMeTTa Reasoning:")
    for reason in analysis.reasoning:
        print(f"  • {reason}")


# Agent entry point for Agentverse deployment
async def main():
    """Main entry point for the Analyzer Agent"""
    agent_address = "agent1q_analyzer_address_here"
    analyzer = AnalyzerAgent(agent_address)
    
    # Demo MeTTa reasoning
    demonstrate_metta_reasoning()
    
    # Start analysis loop
    await analyzer.start_analyzing()


if __name__ == "__main__":
    asyncio.run(main())