import { AppConfig } from '@/types'

export const appConfig: AppConfig = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org',
  pythContractAddress: process.env.NEXT_PUBLIC_PYTH_CONTRACT_ADDRESS || '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
  polymarketApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'https://clob.polymarket.com',
  vincentAppAddress: process.env.VINCENT_APP_ADDRESS || '',
}

export const pythPriceIds = {
  BTC: process.env.PYTH_BTC_PRICE_ID || '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: process.env.PYTH_ETH_PRICE_ID || '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
} as const

export const agentConfig = {
  scannerAgent: process.env.SCANNER_AGENT_ADDRESS || '',
  analyzerAgent: process.env.ANALYZER_AGENT_ADDRESS || '',
  executorAgent: process.env.EXECUTOR_AGENT_ADDRESS || '',
  agentverseApiKey: process.env.AGENTVERSE_API_KEY || '',
  agentSeed: process.env.AGENT_SEED || '',
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ArbitrageAI'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'