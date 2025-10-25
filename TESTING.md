# ArbitrageAI Testing Guide

This guide shows you how to test different parts of the ArbitrageAI infrastructure independently.

## 🖥️ Frontend Testing

### 1. Start the Development Server
```bash
npm run dev
```
Visit http://localhost:3000

### 2. Test Wallet Connection
- Click "Connect Wallet" 
- Use MetaMask or any Web3 wallet
- Should show connected address and balance cards

### 3. Test Dashboard UI
- **Without wallet**: Shows landing page with wallet connect
- **With wallet**: Shows dashboard with mock opportunities
- Navigate to `/chat` to test ASI:One interface

### 4. Test Chat Interface
- Visit http://localhost:3000/chat
- Try these commands:
  - "Show me current opportunities"
  - "What's my profit today?"
  - "Pause all trading"
  - "How does arbitrage work?"

## 🔮 Pyth Network Integration Testing

### 1. Test Price API
```bash
# Test price fetching
curl "http://localhost:3000/api/prices?symbols=BTC,ETH"

# Expected response:
{
  "success": true,
  "data": {
    "btc": {
      "price": 98500,
      "confidence": 120,
      "publishTime": 1697123456
    },
    "eth": {
      "price": 3800,
      "confidence": 5,
      "publishTime": 1697123456
    }
  }
}
```

### 2. Test Arbitrage Detection
```bash
# Test arbitrage detection
curl "http://localhost:3000/api/arbitrage?minProfit=3&limit=5"
```

### 3. Test Real Pyth Integration
Create a test script:
```javascript
// test-pyth.js
import { pythService } from './src/lib/pyth.js'

async function testPyth() {
  try {
    console.log('Testing Pyth price fetching...')
    
    // Test individual price
    const btcPrice = await pythService.fetchPrice('BTC')
    console.log('BTC Price:', btcPrice)
    
    // Test all prices
    const allPrices = await pythService.fetchAllPrices()
    console.log('All Prices:', allPrices)
    
    // Test price update data
    const updateData = await pythService.getPriceUpdateData(['BTC', 'ETH'])
    console.log('Update Data:', updateData)
    
  } catch (error) {
    console.error('Pyth test failed:', error)
  }
}

testPyth()
```

Run with: `node test-pyth.js`

## 🤖 Fetch.ai Agent Testing

### 1. Test Individual Agents

#### Scanner Agent
```bash
cd agents
python3 scanner_agent.py
```

Expected output:
```
Scanner Agent agent1q_scanner_demo starting...
🔍 Scanner: Scanning for opportunities...
🔍 Scanner: Found 2 opportunities
Sending to Analyzer Agent: {...}
```

#### Analyzer Agent with MeTTa
```bash
cd agents
python3 analyzer_agent.py
```

Expected output:
```
=== MeTTa Reasoning Engine Demo ===
Market: Will Bitcoin reach $100,000 by December 31, 2024?
Profit Margin: 6.2%
Confidence: 85.0%
Risk Score: 45.0
Recommendation: EXECUTE
Optimal Bet Size: 15.00%
MeTTa Reasoning:
  • Strong profit margin (6.2%) detected
  • High confidence (85.0%) in opportunity
  • Strong historical accuracy for BTC predictions
  • Recommendation: EXECUTE
```

#### Executor Agent with Vincent Demo
```bash
cd agents
python3 executor_agent.py
```

Expected output:
```
=== Vincent Integration Demo ===
💰 EXECUTING TRADE VIA VINCENT:
Market: Will Bitcoin reach $100,000 by December 31, 2024?
Bet Size: $150.00
Expected Profit: $9.30
✅ Trade executed successfully!
Transaction Hash: 0xa1b2c3d4e5f6...
```

### 2. Test Complete Multi-Agent System
```bash
cd agents
python3 coordinator.py
```

This runs all agents together and shows:
- Agent coordination
- Message passing
- Real-time metrics
- System monitoring

Expected output:
```
🚀 Starting ArbitrageAI Multi-Agent System

=== COMPONENT DEMONSTRATIONS ===
[MeTTa reasoning demo]
[Vincent execution demo]

=== STARTING COORDINATED AGENT SYSTEM ===
🔍 Scanner: Scanning for opportunities...
🧠 Analyzer: Analyzing 2 opportunities...
⚡ Executor: Executing trade for BTC opportunity
📊 SYSTEM METRICS:
   Opportunities Detected: 3
   Trades Executed: 1
   Total Expected Profit: $62.00
```

## ⚡ Vincent Integration Testing

### 1. Test Vincent API Endpoints
```bash
# Test Vincent app creation
curl -X POST http://localhost:3000/api/vincent \
  -H "Content-Type: application/json" \
  -d '{"action": "create_app"}'

# Test bet size calculation
curl -X POST http://localhost:3000/api/vincent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "calculate_bet_size",
    "profitMargin": 6.2,
    "confidence": 85,
    "bankroll": 1000,
    "maxBetSize": 200
  }'

# Test user status
curl "http://localhost:3000/api/vincent?userAddress=0x742d35Cc6634C0532925a3b8D2C042bd8c82af"
```

### 2. Test Vincent Service Directly
Create a test script:
```javascript
// test-vincent.js
import { vincentService } from './src/lib/vincent.js'

async function testVincent() {
  console.log('Testing Vincent integration...')
  
  // Test app creation
  const app = await vincentService.createApp()
  console.log('Vincent App:', app)
  
  // Test bet size calculation
  const betSize = vincentService.calculateOptimalBetSize(
    6.2, // profit margin
    85,  // confidence
    1000, // bankroll
    200   // max bet size
  )
  console.log('Optimal Bet Size:', betSize)
  
  // Test user status
  const status = await vincentService.getUserStatus('0x123...')
  console.log('User Status:', status)
}

testVincent()
```

## 🔧 Integration Testing

### 1. End-to-End Arbitrage Flow
Create an integration test:
```javascript
// test-e2e.js
import { arbitrageDetector } from './src/lib/arbitrage.js'
import { pythService } from './src/lib/pyth.js'
import { polymarketService } from './src/lib/polymarket.js'

async function testE2E() {
  console.log('Testing end-to-end arbitrage flow...')
  
  // 1. Test price fetching
  const prices = await pythService.fetchAllPrices()
  console.log('✅ Prices fetched:', prices)
  
  // 2. Test market data
  const markets = await polymarketService.getMarkets()
  console.log('✅ Markets fetched:', markets.length)
  
  // 3. Test arbitrage detection
  const opportunities = await arbitrageDetector.detectOpportunities()
  console.log('✅ Opportunities found:', opportunities.length)
  
  // 4. Test opportunity details
  opportunities.forEach(opp => {
    console.log(`📊 ${opp.market}:`)
    console.log(`   Profit: ${opp.profitMargin.toFixed(2)}%`)
    console.log(`   Confidence: ${opp.confidence.toFixed(1)}%`)
  })
}

testE2E()
```

### 2. Test Real-time Monitoring
```javascript
// test-monitoring.js
import { arbitrageDetector } from './src/lib/arbitrage.js'

async function testMonitoring() {
  console.log('Starting real-time monitoring test...')
  
  const stopMonitoring = await arbitrageDetector.startMonitoring((opportunities) => {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Found ${opportunities.length} opportunities`)
    
    opportunities.forEach(opp => {
      if (opp.profitMargin > 5) {
        console.log(`🚨 HIGH PROFIT: ${opp.market} - ${opp.profitMargin.toFixed(2)}%`)
      }
    })
  })
  
  // Stop after 5 minutes
  setTimeout(() => {
    stopMonitoring()
    console.log('Monitoring stopped')
  }, 5 * 60 * 1000)
}

testMonitoring()
```

## 🧪 Component-Specific Tests

### 1. Test MeTTa Reasoning Independently
```python
# In agents/ directory
python3 -c "
from analyzer_agent import MeTTaReasoning

metta = MeTTaReasoning()
opportunity = {
    'market': 'Test Market',
    'profit_margin': 7.5,
    'confidence': 90.0
}
analysis = metta.analyze_opportunity(opportunity)
print(f'Recommendation: {analysis.recommendation}')
print(f'Bet Size: {analysis.bet_size:.2%}')
for reason in analysis.reasoning:
    print(f'- {reason}')
"
```

### 2. Test Polymarket Integration
```bash
curl "http://localhost:3000/api/arbitrage" | jq '.data[] | {market: .market, profit: .profitMargin}'
```

### 3. Test Price Confidence Scoring
Check the arbitrage detection logic:
```javascript
// In browser console at localhost:3000
fetch('/api/prices?symbols=BTC')
  .then(r => r.json())
  .then(data => {
    const btc = data.data.btc
    const confidenceRatio = btc.confidence / btc.price
    console.log('Price confidence ratio:', confidenceRatio)
    console.log('Price freshness:', Date.now() - btc.publishTime * 1000, 'ms ago')
  })
```

## 🔍 Debugging Tips

### 1. Check Agent Logs
Each agent prints detailed logs. Look for:
- `🔍 Scanner:` - Market scanning activity
- `🧠 Analyzer:` - MeTTa reasoning output  
- `⚡ Executor:` - Trade execution results

### 2. Monitor API Endpoints
Use browser dev tools Network tab to monitor:
- `/api/prices` - Price fetching
- `/api/arbitrage` - Opportunity detection
- `/api/vincent` - Vincent operations

### 3. Test Individual Functions
Use the browser console at localhost:3000 to test:
```javascript
// Test wallet connection
console.log(window.ethereum)

// Test API calls
fetch('/api/arbitrage').then(r => r.json()).then(console.log)
```

## 🚀 Performance Testing

### 1. Load Test Price API
```bash
# Install hey (HTTP load testing tool)
brew install hey

# Test price API performance
hey -n 100 -c 10 http://localhost:3000/api/prices
```

### 2. Test Agent Coordination Speed
Modify `coordinator.py` to log timing:
```python
import time
start_time = time.time()
# ... agent operations ...
print(f"Operation completed in {time.time() - start_time:.2f}s")
```

This testing guide covers all major components and integration points. Start with the frontend testing, then move to individual agents, and finally test the complete system integration.