import { PythHttpClient, PriceServiceConnection } from '@pythnetwork/client'
import { PythPriceData } from '@/types'
import { pythPriceIds } from './config'

export class PythService {
  private client: PythHttpClient
  private connection: PriceServiceConnection

  constructor() {
    this.client = new PythHttpClient(
      'https://hermes.pyth.network',
      {}
    )
    this.connection = new PriceServiceConnection('https://hermes.pyth.network')
  }

  async fetchPrice(symbol: 'BTC' | 'ETH'): Promise<PythPriceData> {
    try {
      const priceId = pythPriceIds[symbol]
      const priceFeeds = await this.client.getLatestPriceFeeds([priceId])
      
      if (!priceFeeds || priceFeeds.length === 0) {
        throw new Error(`No price feed found for ${symbol}`)
      }

      const priceFeed = priceFeeds[0]
      const price = priceFeed.getPriceNoOlderThan(60) // Max 60 seconds old
      
      if (!price) {
        throw new Error(`Price data too old for ${symbol}`)
      }

      return {
        price: price.price * Math.pow(10, price.expo),
        confidence: price.conf * Math.pow(10, price.expo),
        publishTime: price.publishTime,
        expo: price.expo
      }
    } catch (error) {
      console.error(`Error fetching ${symbol} price:`, error)
      throw error
    }
  }

  async fetchAllPrices(): Promise<{ btc: PythPriceData; eth: PythPriceData }> {
    try {
      const [btcPrice, ethPrice] = await Promise.all([
        this.fetchPrice('BTC'),
        this.fetchPrice('ETH')
      ])

      return {
        btc: btcPrice,
        eth: ethPrice
      }
    } catch (error) {
      console.error('Error fetching all prices:', error)
      throw error
    }
  }

  async getPriceUpdateData(symbols: ('BTC' | 'ETH')[]): Promise<string[]> {
    try {
      const priceIds = symbols.map(symbol => pythPriceIds[symbol])
      const updateData = await this.connection.getPriceFeedsUpdateData(priceIds)
      return updateData
    } catch (error) {
      console.error('Error getting price update data:', error)
      throw error
    }
  }

  // Subscribe to real-time price updates
  subscribeToPrice(
    symbol: 'BTC' | 'ETH', 
    callback: (price: PythPriceData) => void
  ): () => void {
    const priceId = pythPriceIds[symbol]
    
    const unsubscribe = this.connection.subscribePriceFeedUpdates([priceId], (priceFeed) => {
      const price = priceFeed.getPriceUnchecked()
      
      callback({
        price: price.price * Math.pow(10, price.expo),
        confidence: price.conf * Math.pow(10, price.expo),
        publishTime: price.publishTime,
        expo: price.expo
      })
    })

    return unsubscribe
  }
}

// Singleton instance
export const pythService = new PythService()