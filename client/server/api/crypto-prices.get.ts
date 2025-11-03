import { getDb, positions } from '~/server/utils/db'
import { eq, desc } from 'drizzle-orm'

// List of crypto symbols we want to track
const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'XRP']

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get the latest price for each crypto symbol from positions
    // We'll get the most recent current_price for each symbol
    const prices: Record<string, number> = {}
    
    for (const symbol of CRYPTO_SYMBOLS) {
      const latestPosition = await db
        .select({
          current_price: positions.current_price,
        })
        .from(positions)
        .where(eq(positions.symbol, symbol))
        .orderBy(desc(positions.updated_at))
        .limit(1)
      
      if (latestPosition.length > 0) {
        prices[symbol] = parseFloat(latestPosition[0].current_price)
      }
    }
    
    // Return in the format expected by the UI
    return CRYPTO_SYMBOLS.map(symbol => {
      const symbolNames: Record<string, string> = {
        BTC: 'Bitcoin',
        ETH: 'Ethereum',
        SOL: 'Solana',
        BNB: 'Binance Coin',
        DOGE: 'Dogecoin',
        XRP: 'XRP',
      }
      
      return {
        symbol,
        name: symbolNames[symbol] || symbol,
        price: prices[symbol] || 0,
      }
    }).filter(crypto => crypto.price > 0) // Only return cryptos with prices
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch crypto prices'
    })
  }
})
