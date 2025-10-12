"""
Scanner Agent for ArbitrageAI Platform
Deployed on Fetch.ai Agentverse

This agent continuously monitors Polymarket and Pyth Network for arbitrage opportunities
and publishes findings to the Analyzer Agent.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional
import aiohttp
from dataclasses import dataclass


@dataclass
class OpportunityData:
    market: str
    market_odds: float
    oracle_price: float
    implied_price: float
    profit_margin: float
    confidence: float
    detected_at: float


class ScannerAgent:
    def __init__(self, agent_address: str):
        self.agent_address = agent_address
        self.pyth_endpoint = "https://hermes.pyth.network"
        self.polymarket_endpoint = "https://clob.polymarket.com"
        
        # Pyth price feed IDs
        self.price_ids = {
            "BTC": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
            "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
        }
        
        self.analyzer_agent_address = "agent1q_analyzer_address_here"
        self.last_scan_time = 0
        self.scan_interval = 30  # 30 seconds
        
    async def start_scanning(self):
        """Main scanning loop - runs continuously"""
        print(f"Scanner Agent {self.agent_address} starting...")
        
        while True:
            try:
                await self.scan_markets()
                await asyncio.sleep(self.scan_interval)
            except Exception as e:
                print(f"Error in scanning loop: {e}")
                await asyncio.sleep(5)  # Short retry delay
    
    async def scan_markets(self):
        """Scan for arbitrage opportunities"""
        try:
            # Fetch latest prices from Pyth
            prices = await self.fetch_pyth_prices()
            if not prices:
                print("Failed to fetch Pyth prices")
                return
            
            # Fetch Polymarket data
            markets = await self.fetch_polymarket_data()
            if not markets:
                print("Failed to fetch Polymarket data")
                return
            
            # Analyze each market for opportunities
            opportunities = []
            for market in markets:
                opportunity = self.analyze_market(market, prices)
                if opportunity and opportunity.profit_margin > 3.0:  # 3% minimum
                    opportunities.append(opportunity)
            
            # Send opportunities to Analyzer Agent
            if opportunities:
                await self.send_opportunities_to_analyzer(opportunities)
                print(f"Found {len(opportunities)} arbitrage opportunities")
            else:
                print("No profitable opportunities found")
                
            self.last_scan_time = time.time()
            
        except Exception as e:
            print(f"Error in scan_markets: {e}")
    
    async def fetch_pyth_prices(self) -> Optional[Dict]:
        """Fetch latest prices from Pyth Network"""
        try:
            price_ids = list(self.price_ids.values())
            url = f"{self.pyth_endpoint}/api/latest_price_feeds"
            
            async with aiohttp.ClientSession() as session:
                params = {"ids[]": price_ids}
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        prices = {}
                        for feed in data:
                            price_id = feed.get("id")
                            price_data = feed.get("price", {})
                            
                            # Map price ID back to symbol
                            symbol = None
                            for sym, pid in self.price_ids.items():
                                if pid == price_id:
                                    symbol = sym
                                    break
                            
                            if symbol and price_data:
                                price = int(price_data.get("price", 0))
                                expo = int(price_data.get("expo", 0))
                                actual_price = price * (10 ** expo)
                                
                                prices[symbol] = {
                                    "price": actual_price,
                                    "confidence": int(price_data.get("conf", 0)) * (10 ** expo),
                                    "publish_time": int(price_data.get("publish_time", 0))
                                }
                        
                        return prices
                    else:
                        print(f"Pyth API error: {response.status}")
                        return None
                        
        except Exception as e:
            print(f"Error fetching Pyth prices: {e}")
            return None
    
    async def fetch_polymarket_data(self) -> List[Dict]:
        """Fetch market data from Polymarket"""
        # For hackathon demo, return mock data
        # In production, integrate with Polymarket CLOB API
        mock_markets = [
            {
                "id": "btc-100k-dec31",
                "question": "Will Bitcoin reach $100,000 by December 31, 2024?",
                "outcome": "YES",
                "odds": 75.0,
                "volume": 1250000,
                "target_price": 100000,
                "asset": "BTC"
            },
            {
                "id": "eth-5k-dec31", 
                "question": "Will Ethereum reach $5,000 by December 31, 2024?",
                "outcome": "YES",
                "odds": 60.0,
                "volume": 850000,
                "target_price": 5000,
                "asset": "ETH"
            }
        ]
        
        return mock_markets
    
    def analyze_market(self, market: Dict, prices: Dict) -> Optional[OpportunityData]:
        """Analyze a single market for arbitrage opportunity"""
        try:
            asset = market.get("asset")
            if asset not in prices:
                return None
            
            oracle_price = prices[asset]["price"]
            market_odds = market["odds"]
            target_price = market["target_price"]
            
            # Calculate implied price based on market odds
            # If market says 75% chance BTC hits $100k, what should current price be?
            implied_probability = market_odds / 100
            time_factor = 0.9  # Assume 90% of time period remaining
            
            # Simplified implied current price calculation
            implied_price = target_price * (1 - implied_probability * time_factor)
            
            # Calculate profit margin
            profit_margin = ((oracle_price - implied_price) / implied_price) * 100
            
            # Calculate confidence score
            confidence = self.calculate_confidence(market, prices[asset], profit_margin)
            
            return OpportunityData(
                market=market["question"],
                market_odds=market_odds,
                oracle_price=oracle_price,
                implied_price=implied_price,
                profit_margin=profit_margin,
                confidence=confidence,
                detected_at=time.time()
            )
            
        except Exception as e:
            print(f"Error analyzing market {market.get('id', 'unknown')}: {e}")
            return None
    
    def calculate_confidence(self, market: Dict, price_data: Dict, profit_margin: float) -> float:
        """Calculate confidence score for opportunity"""
        confidence = 50.0  # Base confidence
        
        # Volume factor
        volume = market.get("volume", 0)
        if volume > 1000000:
            confidence += 20
        elif volume > 100000:
            confidence += 10
        
        # Profit margin factor
        if profit_margin > 10:
            confidence += 30
        elif profit_margin > 5:
            confidence += 20
        elif profit_margin > 3:
            confidence += 10
        
        # Price confidence factor
        price_conf_ratio = price_data["confidence"] / price_data["price"]
        if price_conf_ratio < 0.001:
            confidence += 15
        elif price_conf_ratio < 0.01:
            confidence += 10
        elif price_conf_ratio > 0.05:
            confidence -= 10
        
        return min(max(confidence, 0), 100)
    
    async def send_opportunities_to_analyzer(self, opportunities: List[OpportunityData]):
        """Send discovered opportunities to Analyzer Agent"""
        try:
            message = {
                "type": "opportunities_detected",
                "from": self.agent_address,
                "timestamp": time.time(),
                "opportunities": [
                    {
                        "market": opp.market,
                        "market_odds": opp.market_odds,
                        "oracle_price": opp.oracle_price,
                        "implied_price": opp.implied_price,
                        "profit_margin": opp.profit_margin,
                        "confidence": opp.confidence,
                        "detected_at": opp.detected_at
                    }
                    for opp in opportunities
                ]
            }
            
            # In production, send via Fetch.ai messaging protocol
            # For demo, log the message
            print(f"Sending to Analyzer Agent: {json.dumps(message, indent=2)}")
            
        except Exception as e:
            print(f"Error sending opportunities to analyzer: {e}")


# Agent entry point for Agentverse deployment
async def main():
    """Main entry point for the Scanner Agent"""
    agent_address = "agent1q_scanner_address_here"
    scanner = ScannerAgent(agent_address)
    await scanner.start_scanning()


if __name__ == "__main__":
    asyncio.run(main())