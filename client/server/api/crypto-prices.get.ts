import { getDb, marketPrices } from '~/server/utils/db'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()

    const rows = await db
      .select()
      .from(marketPrices)
      .orderBy(asc(marketPrices.sort_order), asc(marketPrices.symbol))

    return rows
      .map((row) => {
        const price = parseFloat(row.price)
        if (!Number.isFinite(price) || price <= 0) return null

        return {
          symbol: row.symbol.replace(/USDT$/, ''),
          price,
          updated_at: row.updated_at,
        }
      })
      .filter((crypto): crypto is NonNullable<typeof crypto> => crypto !== null)
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch crypto prices'
    })
  }
})
