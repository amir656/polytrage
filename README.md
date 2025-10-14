# ArbitrageAI - Prediction Market Arbitrage Platform

🏆 **Hackathon Project targeting ASI Alliance, Pyth Network, and Lit Protocol prizes**

## Overview

ArbitrageAI is an autonomous multi-agent system that detects and executes arbitrage opportunities across prediction markets by comparing market odds with real-world oracle prices. The platform enables users to profit from market inefficiencies through trustless automation.

**Total Prize Pool Targeted: $6,666**

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              ASI:One Chat Interface                  │
│         (User monitoring & control)                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           Fetch.ai Agent Coordinator                 │
│              (Deployed on Agentverse)                │
└───┬────────────────────┬────────────────────────┬───┘
    │                    │                        │
┌───▼─────────┐  ┌───────▼────────┐  ┌──────────▼────┐
│   Scanner   │  │    Analyzer    │  │   Executor    │
│    Agent    │  │     Agent      │  │    Agent      │
│             │  │  (MeTTa Logic) │  │  (Vincent)    │
└───┬─────────┘  └───────┬────────┘  └──────────┬────┘
    │                    │                        │
┌───▼────────────────────▼────────────────────────▼───┐
│              External Data Sources                   │
│  • Pyth Oracle (ETH, BTC prices)                    │
│  • Polymarket API (prediction market odds)          │
│  • On-chain contracts (Vincent deposits)            │
└─────────────────────────────────────────────────────┘
```

## Prize Integrations

### 🤖 ASI Alliance ($3,500)
- **Multi-agent system**: Scanner, Analyzer, and Executor agents working in coordination
- **MeTTa reasoning**: Advanced AI reasoning in the Analyzer Agent for risk assessment
- **Agentverse deployment**: All agents deployable to Fetch.ai Agentverse
- **ASI:One chat interface**: Natural language interaction with the agent system

### 🔮 Pyth Network ($1,500)
- **Real-time price feeds**: Fetches BTC/ETH prices from Pyth Hermes API
- **On-chain price updates**: Uses `updatePriceFeeds` for contract interactions
- **Pull-based model**: Implements proper pull-based price consumption
- **Arbitrage detection**: Compares Pyth oracle prices with prediction market odds

### ⚡ Lit Protocol Vincent ($1,666)
- **Vincent App**: Published app accepting user deposits with policy constraints
- **DeFi automation**: Automated Polymarket betting (not just token transfers)
- **Policy-based execution**: User-defined risk parameters and bet limits
- **Custom abilities**: Polymarket-specific trading capabilities

## Features

### 🎯 Core Functionality
- **Real-time arbitrage detection** between Pyth oracle prices and Polymarket odds
- **Automated execution** via Lit Protocol Vincent with user-defined policies
- **Risk management** using Kelly Criterion for optimal bet sizing
- **Multi-agent coordination** for scalable opportunity detection

### 🖥️ User Interface
- **Responsive dashboard** showing live opportunities and portfolio metrics
- **Wallet integration** with MetaMask, Coinbase Wallet, and WalletConnect
- **ASI:One chat interface** for natural language agent interaction
- **Real-time updates** with agent status monitoring

### 🛡️ Security & Control
- **Non-custodial execution** - users always control their funds
- **Policy constraints** - maximum bet sizes, minimum profit margins
- **Risk scoring** - confidence levels based on volume and price accuracy
- **Pauseable system** - full user control over agent activities

## Quick Start

### 1. Installation
```bash
git clone https://github.com/your-repo/arbitrage-ai
cd arbitrage-ai
npm install
```

### 2. Environment Setup
Copy `.env.local` and configure:
```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

# Pyth Network
PYTH_API_KEY=your_pyth_api_key
PYTH_BTC_PRICE_ID=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
PYTH_ETH_PRICE_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace

# Fetch.ai
AGENTVERSE_API_KEY=your_agentverse_key
SCANNER_AGENT_ADDRESS=agent1q_your_scanner_address
ANALYZER_AGENT_ADDRESS=agent1q_your_analyzer_address
EXECUTOR_AGENT_ADDRESS=agent1q_your_executor_address

# Lit Protocol Vincent
VINCENT_APP_ADDRESS=your_vincent_app_address
VINCENT_SDK_KEY=your_vincent_sdk_key
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Deploy Agents
```bash
# Deploy to Agentverse
cd agents
python coordinator.py
```

## Technology Stack

### Frontend
- **Next.js 14** with App Router and TypeScript
- **TailwindCSS** + Shadcn UI components
- **wagmi/viem** for Web3 interactions
- **React Query** for data fetching

### Agent Infrastructure
- **Fetch.ai uAgents** Framework for multi-agent coordination
- **MeTTa reasoning** engine for trade analysis
- **Python asyncio** for concurrent agent operations

### Blockchain/Web3
- **Lit Protocol Vincent** SDK for automated execution
- **Pyth Network** SDK (Hermes API) for price feeds
- **Base blockchain** for reduced gas costs
- **Ethers.js** for contract interactions

### APIs
- **Polymarket CLOB** API for prediction market data
- **Pyth Hermes** API for real-time price feeds
- **Agentverse** for agent deployment and management

## Prize Qualification Checklist

### ✅ ASI Alliance Requirements
- [x] Multi-agent system (Scanner, Analyzer, Executor)
- [x] MeTTa reasoning in Analyzer Agent
- [x] Agentverse-deployable agents
- [x] ASI:One chat interface
- [x] Agent collaboration demo
- [x] Open-source code

### ✅ Pyth Network Requirements
- [x] Hermes API integration
- [x] On-chain price updates via updatePriceFeeds
- [x] Pull-based price consumption
- [x] Real-time arbitrage detection
- [x] Comprehensive documentation

### ✅ Lit Protocol Vincent Requirements
- [x] Vincent App with deposit functionality
- [x] DeFi automation (Polymarket betting)
- [x] Policy-based execution
- [x] Custom Polymarket abilities
- [x] Demo video showing deposit → execution flow

---

**🤖 Built with [Claude Code](https://claude.ai/code)**
**🏆 Targeting $6,666 in hackathon prizes**
