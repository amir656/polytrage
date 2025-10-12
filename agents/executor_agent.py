"""
Executor Agent for ArbitrageAI Platform
Deployed on Fetch.ai Agentverse

This agent receives trade recommendations from Analyzer Agent and executes
them using Lit Protocol Vincent for non-custodial automated trading.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import aiohttp


@dataclass
class TradeExecution:
    trade_id: str
    market: str
    bet_size: float
    expected_profit: float
    tx_hash: Optional[str]
    status: str  # "pending", "executed", "failed"
    timestamp: float
    error_message: Optional[str] = None


class VincentIntegration:
    """Integration with Lit Protocol Vincent for automated execution"""
    
    def __init__(self, vincent_app_address: str, base_rpc_url: str):
        self.vincent_app_address = vincent_app_address
        self.base_rpc_url = base_rpc_url
        self.polymarket_clob_address = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
        
    async def execute_trade(self, recommendation: Dict, user_policy: Dict) -> TradeExecution:
        """Execute trade through Vincent App"""
        try:
            trade_id = f"trade_{int(time.time())}"
            
            # Check policy compliance
            if not self._check_policy_compliance(recommendation, user_policy):
                return TradeExecution(
                    trade_id=trade_id,
                    market=recommendation["market"],
                    bet_size=0,
                    expected_profit=0,
                    tx_hash=None,
                    status="failed",
                    timestamp=time.time(),
                    error_message="Policy compliance check failed"
                )
            
            # Calculate actual bet size based on user policy
            actual_bet_size = min(
                recommendation["bet_size"] * user_policy["bankroll"],
                user_policy["max_bet_size"]
            )
            
            if actual_bet_size < user_policy.get("min_bet_size", 10):
                return TradeExecution(
                    trade_id=trade_id,
                    market=recommendation["market"],
                    bet_size=0,
                    expected_profit=0,
                    tx_hash=None,
                    status="failed",
                    timestamp=time.time(),
                    error_message="Bet size below minimum threshold"
                )
            
            # Execute via Vincent
            tx_hash = await self._execute_via_vincent(recommendation, actual_bet_size, user_policy)
            
            expected_profit = actual_bet_size * (recommendation["profit_margin"] / 100)
            
            return TradeExecution(
                trade_id=trade_id,
                market=recommendation["market"],
                bet_size=actual_bet_size,
                expected_profit=expected_profit,
                tx_hash=tx_hash,
                status="executed" if tx_hash else "failed",
                timestamp=time.time()
            )
            
        except Exception as e:
            return TradeExecution(
                trade_id=f"trade_{int(time.time())}",
                market=recommendation.get("market", "unknown"),
                bet_size=0,
                expected_profit=0,
                tx_hash=None,
                status="failed",
                timestamp=time.time(),
                error_message=str(e)
            )
    
    def _check_policy_compliance(self, recommendation: Dict, user_policy: Dict) -> bool:
        """Check if recommendation complies with user policy"""
        
        # Check minimum profit margin
        if recommendation["profit_margin"] < user_policy.get("min_profit_margin", 3.0):
            return False
        
        # Check confidence threshold
        if recommendation["confidence"] < user_policy.get("min_confidence", 60.0):
            return False
        
        # Check risk score
        if recommendation["risk_score"] > user_policy.get("max_risk_score", 70.0):
            return False
        
        # Check if market is approved
        approved_markets = user_policy.get("approved_markets", [])
        if approved_markets and not any(market in recommendation["market"] for market in approved_markets):
            return False
        
        return True
    
    async def _execute_via_vincent(self, recommendation: Dict, bet_size: float, user_policy: Dict) -> Optional[str]:
        """Execute trade through Vincent App"""
        try:
            # For demo purposes, simulate Vincent execution
            # In production, this would interact with actual Vincent SDK
            
            print(f"\n💰 EXECUTING TRADE VIA VINCENT:")
            print(f"Market: {recommendation['market']}")
            print(f"Bet Size: ${bet_size:.2f}")
            print(f"Expected Profit: ${bet_size * recommendation['profit_margin'] / 100:.2f}")
            
            # Simulate Vincent App execution steps:
            
            # 1. Check user delegation
            delegation_valid = await self._check_user_delegation(user_policy["user_address"])
            if not delegation_valid:
                raise Exception("User delegation expired or invalid")
            
            # 2. Prepare transaction data
            tx_data = {
                "to": self.polymarket_clob_address,
                "data": self._encode_polymarket_bet(recommendation, bet_size),
                "value": 0,
                "gasLimit": 200000
            }
            
            # 3. Execute through Vincent (simulated)
            await asyncio.sleep(2)  # Simulate transaction time
            
            # Generate mock transaction hash
            mock_tx_hash = f"0x{''.join([hex(int(time.time()) + i)[2:] for i in range(8)])}"
            
            print(f"✅ Trade executed successfully!")
            print(f"Transaction Hash: {mock_tx_hash}")
            
            return mock_tx_hash
            
        except Exception as e:
            print(f"❌ Vincent execution failed: {e}")
            raise e
    
    async def _check_user_delegation(self, user_address: str) -> bool:
        """Check if user delegation is valid"""
        # In production, verify Vincent delegation on-chain
        # For demo, always return True
        return True
    
    def _encode_polymarket_bet(self, recommendation: Dict, bet_size: float) -> str:
        """Encode Polymarket bet transaction data"""
        # In production, properly encode CLOB contract call
        # For demo, return mock data
        return "0x1234567890abcdef"


class ExecutorAgent:
    def __init__(self, agent_address: str):
        self.agent_address = agent_address
        self.analyzer_agent_address = "agent1q_analyzer_address_here"
        self.vincent = VincentIntegration(
            vincent_app_address="0x_vincent_app_address_here",
            base_rpc_url="https://mainnet.base.org"
        )
        self.active_trades = {}
        self.user_policies = {}  # In production, fetch from database
        
        # Demo user policy
        self.user_policies["0x_demo_user_address"] = {
            "user_address": "0x_demo_user_address",
            "bankroll": 1000.0,  # $1000
            "max_bet_size": 200.0,  # $200 max per bet
            "min_bet_size": 10.0,   # $10 minimum
            "min_profit_margin": 4.0,  # 4% minimum profit
            "min_confidence": 70.0,     # 70% minimum confidence
            "max_risk_score": 65.0,     # 65 max risk score
            "approved_markets": ["Bitcoin", "Ethereum", "BTC", "ETH"],
            "is_active": True
        }
    
    async def start_executing(self):
        """Main execution loop"""
        print(f"Executor Agent {self.agent_address} starting...")
        
        while True:
            try:
                # In production, listen for trade recommendations
                # For demo, check for pending executions
                await self.monitor_active_trades()
                await asyncio.sleep(15)  # Check every 15 seconds
                
            except Exception as e:
                print(f"Error in execution loop: {e}")
                await asyncio.sleep(5)
    
    async def receive_trade_recommendation(self, message: Dict):
        """Receive trade recommendation from Analyzer Agent"""
        try:
            if message.get("type") == "trade_recommendation":
                recommendation = message.get("recommendation", {})
                
                print(f"\n📨 Received trade recommendation:")
                print(f"Market: {recommendation.get('market')}")
                print(f"Profit: {recommendation.get('profit_margin', 0):.2f}%")
                print(f"Confidence: {recommendation.get('confidence', 0):.1f}%")
                
                # For demo, use default user policy
                user_address = "0x_demo_user_address"
                user_policy = self.user_policies.get(user_address)
                
                if not user_policy or not user_policy["is_active"]:
                    print("❌ No active user policy found")
                    return
                
                # Execute trade
                execution = await self.vincent.execute_trade(recommendation, user_policy)
                
                # Store execution record
                self.active_trades[execution.trade_id] = execution
                
                # Log result
                if execution.status == "executed":
                    print(f"✅ Trade executed successfully!")
                    print(f"Trade ID: {execution.trade_id}")
                    print(f"Bet Size: ${execution.bet_size:.2f}")
                    print(f"Expected Profit: ${execution.expected_profit:.2f}")
                    print(f"TX Hash: {execution.tx_hash}")
                else:
                    print(f"❌ Trade execution failed: {execution.error_message}")
                
        except Exception as e:
            print(f"Error processing trade recommendation: {e}")
    
    async def monitor_active_trades(self):
        """Monitor active trades for settlement"""
        for trade_id, execution in list(self.active_trades.items()):
            if execution.status == "executed":
                # In production, monitor on-chain for settlement
                # For demo, simulate trade monitoring
                elapsed_time = time.time() - execution.timestamp
                
                if elapsed_time > 300:  # 5 minutes for demo
                    print(f"🔄 Monitoring trade {trade_id} - {elapsed_time:.0f}s elapsed")
    
    async def update_user_policy(self, user_address: str, policy_update: Dict):
        """Update user trading policy"""
        if user_address in self.user_policies:
            self.user_policies[user_address].update(policy_update)
            print(f"📝 Updated policy for user {user_address}")
        else:
            print(f"❌ User {user_address} not found")
    
    def get_trade_history(self, user_address: str) -> List[TradeExecution]:
        """Get trade history for user"""
        return [trade for trade in self.active_trades.values() 
                if user_address in self.user_policies]


# Demo function for Vincent integration
async def demonstrate_vincent_execution():
    """Demonstrate Vincent-based trade execution"""
    print("\n=== Vincent Integration Demo ===")
    
    # Mock trade recommendation from Analyzer Agent
    recommendation = {
        "market": "Will Bitcoin reach $100,000 by December 31, 2024?",
        "action": "EXECUTE",
        "bet_size": 0.15,  # 15% of bankroll
        "profit_margin": 6.2,
        "confidence": 85.0,
        "risk_score": 45.0,
        "reasoning": ["Strong profit margin", "High confidence", "Good historical accuracy"]
    }
    
    # Mock user policy
    user_policy = {
        "user_address": "0x742d35Cc6634C0532925a3b8D2C042bd8c82af",
        "bankroll": 1000.0,
        "max_bet_size": 200.0,
        "min_bet_size": 10.0,
        "min_profit_margin": 4.0,
        "min_confidence": 70.0,
        "max_risk_score": 65.0,
        "approved_markets": ["Bitcoin", "Ethereum"],
        "is_active": True
    }
    
    vincent = VincentIntegration("0x_vincent_app", "https://mainnet.base.org")
    execution = await vincent.execute_trade(recommendation, user_policy)
    
    print(f"Execution Result:")
    print(f"  Status: {execution.status}")
    print(f"  Bet Size: ${execution.bet_size:.2f}")
    print(f"  Expected Profit: ${execution.expected_profit:.2f}")
    print(f"  TX Hash: {execution.tx_hash}")


# Agent entry point for Agentverse deployment
async def main():
    """Main entry point for the Executor Agent"""
    agent_address = "agent1q_executor_address_here"
    executor = ExecutorAgent(agent_address)
    
    # Demo Vincent execution
    await demonstrate_vincent_execution()
    
    # Start execution loop
    await executor.start_executing()


if __name__ == "__main__":
    asyncio.run(main())