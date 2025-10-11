// Core Data Models for ArbitrageAI Platform

export interface User {
  id: string;
  walletAddress: string;
  vincentDelegation: string;
  policy: UserPolicy;
  balance: number;
  createdAt: Date;
}

export interface UserPolicy {
  minProfitMargin: number; // percentage
  maxBetSize: number; // USDC
  approvedMarkets: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  isActive: boolean;
}

export interface ArbitrageOpportunity {
  id: string;
  market: string;
  marketOdds: number;
  oraclePrice: number;
  impliedPrice: number;
  profitMargin: number;
  confidence: number;
  detectedAt: Date;
  status: 'pending' | 'executed' | 'expired';
}

export interface Trade {
  id: string;
  userId: string;
  opportunityId: string;
  betSize: number;
  expectedProfit: number;
  actualProfit: number | null;
  txHash: string;
  executedAt: Date;
  settledAt: Date | null;
  status: 'pending' | 'won' | 'lost';
}

export interface AgentLog {
  id: string;
  agentName: 'scanner' | 'analyzer' | 'executor';
  action: string;
  data: any;
  timestamp: Date;
}

export interface PythPriceData {
  price: number;
  confidence: number;
  publishTime: number;
  expo: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  outcome: string;
  odds: number;
  volume: number;
  endDate: Date;
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'opportunity' | 'analysis' | 'execution';
  payload: any;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  agentName?: string;
}

// Agent Status Types
export type AgentStatus = 'active' | 'paused' | 'error' | 'offline';

export interface AgentStatusInfo {
  name: string;
  status: AgentStatus;
  lastHeartbeat: Date;
  metrics: {
    opportunitiesDetected?: number;
    tradesExecuted?: number;
    errorCount?: number;
  };
}

// Configuration Types
export interface AppConfig {
  chainId: number;
  rpcUrl: string;
  pythContractAddress: string;
  polymarketApiUrl: string;
  vincentAppAddress: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ArbitrageDetectionResult {
  opportunities: ArbitrageOpportunity[];
  priceData: {
    btc: PythPriceData;
    eth: PythPriceData;
  };
  marketData: PolymarketMarket[];
}