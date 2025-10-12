"""
Agent Coordinator for ArbitrageAI Platform
Coordinates Scanner, Analyzer, and Executor agents

This script demonstrates the multi-agent collaboration for the hackathon demo.
In production, agents would run independently on Agentverse.
"""

import asyncio
import json
import time
from typing import Dict, List
import logging

# Import agent classes
from scanner_agent import ScannerAgent
from analyzer_agent import AnalyzerAgent, demonstrate_metta_reasoning
from executor_agent import ExecutorAgent, demonstrate_vincent_execution

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentCoordinator:
    """Coordinates the multi-agent arbitrage system"""
    
    def __init__(self):
        # Initialize agents
        self.scanner = ScannerAgent("agent1q_scanner_demo")
        self.analyzer = AnalyzerAgent("agent1q_analyzer_demo") 
        self.executor = ExecutorAgent("agent1q_executor_demo")
        
        # Message queues for agent communication
        self.opportunity_queue = asyncio.Queue()
        self.recommendation_queue = asyncio.Queue()
        
        # System metrics
        self.metrics = {
            "opportunities_detected": 0,
            "opportunities_analyzed": 0,
            "trades_executed": 0,
            "total_profit": 0.0,
            "system_uptime": time.time()
        }
    
    async def start_system(self):
        """Start the complete multi-agent system"""
        logger.info("🚀 Starting ArbitrageAI Multi-Agent System")
        
        # Demonstrate individual components first
        await self.run_demonstrations()
        
        # Start coordinated agent loop
        await self.run_coordinated_loop()
    
    async def run_demonstrations(self):
        """Run demonstrations of each component"""
        logger.info("\n=== COMPONENT DEMONSTRATIONS ===")
        
        # Demo MeTTa reasoning
        demonstrate_metta_reasoning()
        await asyncio.sleep(2)
        
        # Demo Vincent integration
        await demonstrate_vincent_execution()
        await asyncio.sleep(2)
        
        logger.info("\n=== STARTING COORDINATED AGENT SYSTEM ===")
    
    async def run_coordinated_loop(self):
        """Run the coordinated multi-agent loop"""
        
        # Start all agent tasks concurrently
        tasks = [
            asyncio.create_task(self.scanner_task()),
            asyncio.create_task(self.analyzer_task()),
            asyncio.create_task(self.executor_task()),
            asyncio.create_task(self.metrics_task())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            logger.info("System shutdown requested")
            for task in tasks:
                task.cancel()
    
    async def scanner_task(self):
        """Scanner agent task - detect opportunities"""
        while True:
            try:
                logger.info("🔍 Scanner: Scanning for opportunities...")
                
                # Simulate scanner finding opportunities
                await asyncio.sleep(30)  # Scan every 30 seconds
                
                # Get opportunities from scanner
                opportunities = await self.simulate_scanner_scan()
                
                if opportunities:
                    self.metrics["opportunities_detected"] += len(opportunities)
                    
                    # Send to analyzer via message queue
                    message = {
                        "type": "opportunities_detected",
                        "from": "scanner",
                        "timestamp": time.time(),
                        "opportunities": opportunities
                    }
                    
                    await self.opportunity_queue.put(message)
                    logger.info(f"🔍 Scanner: Found {len(opportunities)} opportunities")
                
            except Exception as e:
                logger.error(f"Scanner task error: {e}")
                await asyncio.sleep(5)
    
    async def analyzer_task(self):
        """Analyzer agent task - analyze opportunities with MeTTa"""
        while True:
            try:
                # Wait for opportunities from scanner
                message = await self.opportunity_queue.get()
                
                if message["type"] == "opportunities_detected":
                    opportunities = message["opportunities"]
                    logger.info(f"🧠 Analyzer: Analyzing {len(opportunities)} opportunities...")
                    
                    # Process each opportunity
                    for opp in opportunities:
                        analysis = self.analyzer.metta_engine.analyze_opportunity(opp)
                        self.metrics["opportunities_analyzed"] += 1
                        
                        logger.info(f"🧠 Analyzer: {opp['market']}")
                        logger.info(f"   Profit: {analysis.profit_margin:.1f}%")
                        logger.info(f"   Confidence: {analysis.confidence:.1f}%")
                        logger.info(f"   Risk: {analysis.risk_score:.1f}")
                        logger.info(f"   Recommendation: {analysis.recommendation}")
                        
                        # Send executable recommendations to executor
                        if analysis.recommendation == "EXECUTE":
                            recommendation = {
                                "type": "trade_recommendation",
                                "from": "analyzer",
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
                            
                            await self.recommendation_queue.put(recommendation)
                            logger.info(f"🧠 Analyzer: Recommending execution for {analysis.market}")
                
            except Exception as e:
                logger.error(f"Analyzer task error: {e}")
                await asyncio.sleep(1)
    
    async def executor_task(self):
        """Executor agent task - execute trades via Vincent"""
        while True:
            try:
                # Wait for trade recommendations
                message = await self.recommendation_queue.get()
                
                if message["type"] == "trade_recommendation":
                    recommendation = message["recommendation"]
                    logger.info(f"⚡ Executor: Executing trade for {recommendation['market']}")
                    
                    # Execute via Vincent
                    user_policy = self.executor.user_policies["0x_demo_user_address"]
                    execution = await self.executor.vincent.execute_trade(recommendation, user_policy)
                    
                    if execution.status == "executed":
                        self.metrics["trades_executed"] += 1
                        self.metrics["total_profit"] += execution.expected_profit
                        
                        logger.info(f"⚡ Executor: Trade executed successfully!")
                        logger.info(f"   Bet Size: ${execution.bet_size:.2f}")
                        logger.info(f"   Expected Profit: ${execution.expected_profit:.2f}")
                        logger.info(f"   TX Hash: {execution.tx_hash}")
                        
                    else:
                        logger.error(f"⚡ Executor: Trade failed - {execution.error_message}")
                
            except Exception as e:
                logger.error(f"Executor task error: {e}")
                await asyncio.sleep(1)
    
    async def metrics_task(self):
        """Print system metrics periodically"""
        while True:
            try:
                await asyncio.sleep(60)  # Print metrics every minute
                
                uptime = time.time() - self.metrics["system_uptime"]
                
                logger.info("\n📊 SYSTEM METRICS:")
                logger.info(f"   Uptime: {uptime:.0f} seconds")
                logger.info(f"   Opportunities Detected: {self.metrics['opportunities_detected']}")
                logger.info(f"   Opportunities Analyzed: {self.metrics['opportunities_analyzed']}")
                logger.info(f"   Trades Executed: {self.metrics['trades_executed']}")
                logger.info(f"   Total Expected Profit: ${self.metrics['total_profit']:.2f}")
                
            except Exception as e:
                logger.error(f"Metrics task error: {e}")
    
    async def simulate_scanner_scan(self) -> List[Dict]:
        """Simulate scanner finding opportunities"""
        # In production, this would use real Pyth + Polymarket data
        
        import random
        
        # Sometimes find opportunities, sometimes don't
        if random.random() < 0.7:  # 70% chance of finding opportunities
            opportunities = []
            
            # BTC opportunity
            if random.random() < 0.5:
                opportunities.append({
                    "market": "Will Bitcoin reach $100,000 by December 31, 2024?",
                    "market_odds": 75 + random.uniform(-5, 5),
                    "oracle_price": 98500 + random.uniform(-2000, 2000),
                    "implied_price": 93000 + random.uniform(-3000, 3000),
                    "profit_margin": random.uniform(3, 8),
                    "confidence": random.uniform(70, 90)
                })
            
            # ETH opportunity  
            if random.random() < 0.4:
                opportunities.append({
                    "market": "Will Ethereum reach $5,000 by December 31, 2024?",
                    "market_odds": 60 + random.uniform(-8, 8),
                    "oracle_price": 3800 + random.uniform(-200, 200),
                    "implied_price": 3500 + random.uniform(-300, 300),
                    "profit_margin": random.uniform(2, 6),
                    "confidence": random.uniform(65, 85)
                })
            
            return opportunities
        
        return []


# Main demo function
async def main():
    """Main entry point for agent coordination demo"""
    coordinator = AgentCoordinator()
    
    try:
        await coordinator.start_system()
    except KeyboardInterrupt:
        logger.info("👋 System shutting down gracefully...")


if __name__ == "__main__":
    print("🤖 ArbitrageAI Multi-Agent System")
    print("🏆 Targeting ASI Alliance, Pyth Network, and Lit Protocol prizes")
    print("🚀 Press Ctrl+C to stop\n")
    
    asyncio.run(main())