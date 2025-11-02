# CoinSwitch API Reference for Trading Bot

This document maps all required CoinSwitch API endpoints to calculate the necessary indicators and data shown in `sample.md`.

## Required Data from Sample.md

### Market Data Required:
1. **Current Price** - For current market price
2. **Mid Prices** - (bid + ask) / 2 from order book
3. **Candlestick Data** - For calculating:
   - EMA (20-period, 50-period)
   - MACD indicators
   - RSI indicators (7-period, 14-period)
   - ATR indicators (3-period, 14-period)
   - Volume data (current and average)
4. **Open Interest** - For futures/perps trading
5. **Funding Rate** - For futures/perps trading

### Account Data Required:
1. **Portfolio Balance** - Available cash, account value
2. **Open Positions** - Current positions with entry price, quantity, leverage, PnL
3. **Order Status** - For tracking orders

---

## SPOT Trading APIs (Public)

### 1. Server Time
**Purpose**: Get server time for signature generation and timestamp validation
- **Endpoint**: `GET /trade/api/v2/time`
- **Auth**: Public (no auth required)
- **Usage**: Essential for signature generation in authenticated requests

### 2. Ticker 24hr (Specific Coin)
**Purpose**: Get current price and 24hr statistics for a specific trading pair
- **Endpoint**: `GET /trade/api/v2/24hr/ticker`
- **Auth**: Public
- **Parameters**:
  - `symbol`: Trading pair (e.g., "ETHUSDT")
  - `exchange`: Exchange name (e.g., "coinswitchx")
- **Returns**: Current price, 24hr high/low, volume, etc.
- **Used For**: `current_price` in sample.md

### 3. Ticker 24hr (All Pairs)
**Purpose**: Get 24hr statistics for all trading pairs
- **Endpoint**: `GET /trade/api/v2/24hr/all-pairs/ticker`
- **Auth**: Public
- **Parameters**: None (or optional exchange filter)
- **Used For**: Getting current prices for multiple coins at once

### 4. Depth (Order Book)
**Purpose**: Get order book depth for calculating mid prices
- **Endpoint**: `GET /trade/api/v2/depth`
- **Auth**: Public
- **Parameters**:
  - `symbol`: Trading pair
  - `exchange`: Exchange name
  - `limit`: Number of orders to return (optional)
- **Returns**: Bid and ask prices with quantities
- **Used For**: Calculating `mid prices` = (best_bid + best_ask) / 2

### 5. Candles
**Purpose**: Get historical candlestick (OHLCV) data for technical indicators
- **Endpoint**: `GET /trade/api/v2/candles`
- **Auth**: Public (or Authenticated depending on exchange)
- **Parameters**:
  - `symbol`: Trading pair
  - `interval`: Time interval (e.g., "3m" for 3 minutes, "4h" for 4 hours, "1d" for daily)
  - `start_time`: Start timestamp (milliseconds)
  - `end_time`: End timestamp (milliseconds)
  - `exchange`: Exchange name
- **Returns**: Array of candlestick data [open, high, low, close, volume, timestamp]
- **Used For**: 
  - Calculating EMA indicators (20-period, 50-period)
  - Calculating MACD indicators
  - Calculating RSI indicators (7-period, 14-period)
  - Calculating ATR indicators (3-period, 14-period)
  - Getting volume data (current and average)

### 6. Trades
**Purpose**: Get recent trade history
- **Endpoint**: `GET /trade/api/v2/trades`
- **Auth**: Public
- **Parameters**:
  - `symbol`: Trading pair
  - `exchange`: Exchange name
  - `limit`: Number of trades to return
- **Returns**: Recent trades with price, quantity, timestamp
- **Used For**: Alternative source for recent price data

---

## Futures Trading APIs

### 7. Futures KLines (Candlestick Data)
**Purpose**: Get futures candlestick data for technical analysis
- **Endpoint**: `GET /trade/api/v2/futures/klines`
- **Auth**: Authenticated
- **Parameters**:
  - `symbol`: Trading pair (e.g., "ETHUSDT")
  - `interval`: Time interval ("3m", "4h", "1d", etc.)
  - `start_time`: Start timestamp
  - `end_time`: End timestamp
  - `exchange`: Exchange identifier (e.g., "EXCHANGE_2")
- **Returns**: Array of candlestick data [open, high, low, close, volume, timestamp]
- **Used For**: Same as SPOT candles but for futures/perps

### 8. Futures Ticker
**Purpose**: Get futures ticker data including open interest and funding rate
- **Endpoint**: `GET /trade/api/v2/futures/ticker`
- **Auth**: Authenticated (or Public depending on exchange)
- **Parameters**:
  - `symbol`: Trading pair
  - `exchange`: Exchange identifier
- **Returns**: Current price, 24hr stats, **open interest**, **funding rate**
- **Used For**: 
  - `Open Interest: Latest` and `Average` values
  - `Funding Rate` values

### 9. Futures Order Book
**Purpose**: Get futures order book depth
- **Endpoint**: `GET /trade/api/v2/futures/depth` or `/trade/api/v2/futures/orderbook`
- **Auth**: Public
- **Parameters**:
  - `symbol`: Trading pair
  - `exchange`: Exchange identifier
  - `limit`: Number of orders
- **Used For**: Mid price calculation for futures

### 10. Futures L2 Order Book
**Purpose**: Get level 2 order book (aggregated depth)
- **Endpoint**: `GET /trade/api/v2/futures/l2orderbook`
- **Auth**: Public
- **Parameters**: Same as above
- **Used For**: More detailed order book data

### 11. Futures Instrument Info
**Purpose**: Get instrument details including contract specifications
- **Endpoint**: `GET /trade/api/v2/futures/instrument/info`
- **Auth**: Public or Authenticated
- **Parameters**:
  - `symbol`: Trading pair
  - `exchange`: Exchange identifier
- **Returns**: Contract size, tick size, leverage limits, etc.
- **Used For**: Understanding contract specifications

---

## Account & Trading APIs (Authenticated)

### 12. Portfolio
**Purpose**: Get current portfolio balance and account value
- **Endpoint**: `GET /trade/api/v2/user/portfolio`
- **Auth**: Authenticated
- **Parameters**: None
- **Returns**: 
  - Available balance
  - Account value
  - Holdings for each coin
- **Used For**: 
  - `Available Cash` in sample.md
  - `Current Account Value` in sample.md

### 13. Futures Positions
**Purpose**: Get all open futures positions
- **Endpoint**: `GET /trade/api/v2/futures/positions`
- **Auth**: Authenticated
- **Parameters**:
  - `exchange`: Exchange identifier
  - `symbol`: Optional symbol filter
- **Returns**: 
  - Symbol, quantity, entry price
  - Current price, liquidation price
  - Unrealized PnL
  - Leverage
  - Notional value
- **Used For**: `Current live positions & performance` in sample.md

### 14. Futures Wallet Balance
**Purpose**: Get wallet balance for futures trading
- **Endpoint**: `GET /trade/api/v2/futures/wallet_balance`
- **Auth**: Authenticated
- **Parameters**: None (or exchange filter)
- **Returns**: Available balance, margin, etc.
- **Used For**: Available cash for futures trading

### 15. Open Orders
**Purpose**: Get all open orders
- **Endpoint**: `GET /trade/api/v2/orders`
- **Auth**: Authenticated
- **Parameters**:
  - `exchange`: Exchange identifier
  - `symbol`: Optional symbol filter
- **Returns**: List of open orders with status, price, quantity
- **Used For**: Tracking pending orders (stop loss, take profit orders)

### 16. Closed Orders
**Purpose**: Get closed/completed orders
- **Endpoint**: `GET /trade/api/v2/orders` (with status filter) or `/trade/api/v2/futures/orders/closed`
- **Auth**: Authenticated
- **Parameters**:
  - `exchange`: Exchange identifier
  - `symbol`: Optional symbol filter
  - `count`: Number of orders to return (default 500)
- **Returns**: List of closed orders with execution details
- **Used For**: Calculating performance metrics, Sharpe ratio

### 17. Get Order
**Purpose**: Get details of a specific order
- **Endpoint**: `GET /trade/api/v2/order` or `/trade/api/v2/futures/order`
- **Auth**: Authenticated
- **Parameters**:
  - `order_id`: Order identifier
- **Returns**: Order details including status, fills, etc.
- **Used For**: Checking order status (entry_oid, sl_oid, tp_oid)

---

## Supporting APIs

### 18. Active Coins
**Purpose**: Get list of all active coins/pairs available for trading
- **Endpoint**: `GET /trade/api/v2/coins`
- **Auth**: Public or Authenticated
- **Returns**: List of active trading pairs
- **Used For**: Getting available symbols to trade

### 19. Exchange Precision
**Purpose**: Get precision details for trading pairs
- **Endpoint**: `POST /trade/api/v2/exchangePrecision`
- **Auth**: Authenticated
- **Parameters**: Array of symbols or exchange identifier
- **Returns**: Precision for price, quantity, etc.
- **Used For**: Formatting order quantities and prices correctly

### 20. Trade Info
**Purpose**: Get comprehensive trading information
- **Endpoint**: `GET /trade/api/v2/tradeInfo`
- **Auth**: Authenticated
- **Returns**: Exchange precision, min/max limits, active coins
- **Used For**: Initial setup and validation

### 21. Trading Fee
**Purpose**: Get applicable trading fees
- **Endpoint**: `GET /trade/api/v2/tradingFee`
- **Auth**: Authenticated
- **Returns**: Fee structure including discount rates
- **Used For**: Calculating actual costs

### 22. Validate Keys
**Purpose**: Validate API keys
- **Endpoint**: `GET /trade/api/v2/validate/keys`
- **Auth**: Authenticated
- **Returns**: Validation status
- **Used For**: Testing API connectivity

### 23. Ping
**Purpose**: Test API connectivity
- **Endpoint**: `GET /trade/api/v2/ping`
- **Auth**: Authenticated
- **Returns**: Pong response
- **Used For**: Health checks

---

## WebSocket APIs (Real-time Data)

### Market Data WebSocket
**Purpose**: Real-time market data updates
- **Namespace**: `/spot/{exchange}` or `/futures/{exchange}`
- **Events**:
  - **Order Book**: Real-time order book updates
  - **Candlestick**: Real-time candlestick updates (1min intervals)
  - **Trades**: Real-time trade updates
  - **Ticker**: Real-time ticker updates
- **Used For**: 
  - Real-time mid price updates
  - Real-time indicator calculations
  - Avoiding polling delays

### User Data WebSocket
**Purpose**: Real-time user account updates
- **Namespace**: Private authenticated stream
- **Events**:
  - **Order Updates**: Real-time order status changes
  - **Balance Updates**: Real-time balance changes
- **Used For**: 
  - Real-time position updates
  - Real-time balance updates
  - Real-time order fill notifications

---

## API Implementation Checklist

### Market Data (for Indicators)
- [ ] Get server time for timestamp synchronization
- [ ] Fetch candles/KLines data for multiple timeframes:
  - [ ] 3-minute intervals (for intraday indicators)
  - [ ] 4-hour intervals (for longer-term context)
- [ ] Calculate EMA (20-period, 50-period) from candlestick data
- [ ] Calculate MACD from candlestick data
- [ ] Calculate RSI (7-period, 14-period) from candlestick data
- [ ] Calculate ATR (3-period, 14-period) from candlestick data
- [ ] Get order book depth for mid price calculation
- [ ] Get current ticker for latest price
- [ ] Get futures ticker for open interest and funding rate

### Account Data
- [ ] Get portfolio balance (available cash, account value)
- [ ] Get open positions (with entry price, current price, PnL, leverage)
- [ ] Get open orders (stop loss, take profit orders)
- [ ] Calculate performance metrics (total return, Sharpe ratio)

---

## Data Calculation Flow

### For Sample.md Requirements:

1. **Current Price**: 
   - Use `GET /trade/api/v2/24hr/ticker` or futures ticker

2. **Mid Prices (Intraday)**:
   - Poll `GET /trade/api/v2/depth` or futures order book every 3 minutes
   - Calculate: (best_bid + best_ask) / 2
   - Store historical mid prices

3. **EMA Indicators**:
   - Fetch candlestick data with `GET /trade/api/v2/candles` or futures klines
   - Use close prices to calculate EMA(20) and EMA(50)
   - For intraday: use 3-minute interval candles
   - For longer-term: use 4-hour interval candles

4. **MACD Indicators**:
   - Calculate from candlestick close prices
   - Need: EMA(12), EMA(26), Signal line (EMA of MACD)
   - Formula: MACD = EMA(12) - EMA(26)

5. **RSI Indicators**:
   - Calculate from candlestick close prices
   - RSI(7): 7-period RSI
   - RSI(14): 14-period RSI
   - Formula: RSI = 100 - (100 / (1 + RS)) where RS = avg gain / avg loss

6. **ATR Indicators**:
   - Calculate from candlestick high, low, close prices
   - ATR(3): 3-period ATR
   - ATR(14): 14-period ATR
   - Formula: True Range = max(high-low, abs(high-prev_close), abs(low-prev_close))
   - ATR = SMA of True Range

7. **Volume Data**:
   - Extract from candlestick data
   - Current volume from latest candle
   - Average volume from historical candles

8. **Open Interest & Funding Rate**:
   - Use `GET /trade/api/v2/futures/ticker`
   - Extract open interest (latest and average)
   - Extract funding rate

9. **Account Information**:
   - Use `GET /trade/api/v2/user/portfolio` for balance
   - Use `GET /trade/api/v2/futures/positions` for positions
   - Use `GET /trade/api/v2/orders` for order tracking
   - Calculate total return and Sharpe ratio from trade history

---

## Notes

1. **Authentication**: All authenticated endpoints require:
   - API Key in header: `X-AUTH-APIKEY`
   - Signature in header: `X-AUTH-SIGNATURE`
   - Epoch time in header: `X-AUTH-EPOCH`
   - Signature generation: `sign(method + endpoint + epochTime)`

2. **Time Intervals**: Supported intervals typically include:
   - `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `12h`, `1d`, `1w`

3. **Rate Limits**: Be aware of API rate limits, especially for:
   - Create Order API
   - Portfolio API
   - Open/Closed Orders APIs

4. **Futures vs Spot**: 
   - For futures/perps trading, use futures endpoints
   - For spot trading, use spot endpoints
   - Open interest and funding rate are futures-specific

5. **WebSocket vs REST**:
   - Use WebSocket for real-time updates (more efficient)
   - Use REST for historical data and account queries
   - Consider WebSocket for order book and candlestick updates

---

## Current Implementation Status

### ✅ Already Implemented (in `server/src/api.ts`):
1. ✅ Server Time - `GET /trade/api/v2/time`
2. ✅ Ping - `GET /trade/api/v2/ping`
3. ✅ Candles (Spot) - `GET /trade/api/v2/candles`
4. ✅ Futures KLines - `GET /trade/api/v2/futures/klines`
5. ✅ Futures Positions - `GET /trade/api/v2/futures/positions`
6. ✅ Futures Wallet Balance - `GET /trade/api/v2/futures/wallet_balance`
7. ✅ User Portfolio - `GET /trade/api/v2/user/portfolio`
8. ✅ Trades - `GET /trade/api/v2/trades` (used as order book)
9. ✅ Futures Order - `GET /trade/api/v2/futures/order`

### ❌ Missing APIs Needed for Sample.md:
1. ❌ **Ticker 24hr** - `GET /trade/api/v2/24hr/ticker` (for current price)
2. ❌ **Ticker 24hr All Pairs** - `GET /trade/api/v2/24hr/all-pairs/ticker`
3. ❌ **Depth (Order Book)** - `GET /trade/api/v2/depth` (for mid price calculation)
4. ❌ **Futures Ticker** - `GET /trade/api/v2/futures/ticker` (for open interest & funding rate)
5. ❌ **Futures Order Book** - `GET /trade/api/v2/futures/orderbook` or `/futures/depth`
6. ❌ **Open Orders** - `GET /trade/api/v2/orders` (with proper filters)
7. ❌ **Closed Orders** - `GET /trade/api/v2/futures/orders/closed` (for performance tracking)
8. ❌ **Active Coins** - `GET /trade/api/v2/coins`
9. ❌ **Exchange Precision** - `POST /trade/api/v2/exchangePrecision`
10. ❌ **Trade Info** - `GET /trade/api/v2/tradeInfo`
11. ❌ **Trading Fee** - `GET /trade/api/v2/tradingFee`

### ❌ Missing Indicator Calculations:
1. ❌ **RSI (7-period, 14-period)** - Need to implement RSI calculation
2. ❌ **ATR (3-period, 14-period)** - Need to implement ATR calculation
3. ❌ **EMA (50-period)** - Currently only EMA 20 is calculated
4. ❌ **Average Volume** - Need to calculate from historical candles

### ✅ Already Implemented Indicators (in `server/src/helpers/indicators.ts`):
1. ✅ Mid Price calculation
2. ✅ EMA calculation (20-period)
3. ✅ MACD calculation
4. ❌ RSI calculation (commented out, needs to be fixed/implemented)

---

## Priority Implementation Order

### High Priority (Required for Sample.md):
1. **Futures Ticker API** - Get open interest and funding rate
2. **Ticker 24hr API** - Get current price
3. **Depth API** - Get proper order book for mid price calculation
4. **RSI Indicator** - Implement/fix RSI calculation (7 & 14 period)
5. **ATR Indicator** - Implement ATR calculation (3 & 14 period)
6. **EMA 50** - Add 50-period EMA calculation
7. **Average Volume** - Calculate from historical candles

### Medium Priority (For complete functionality):
1. **Open Orders API** - Track pending orders
2. **Closed Orders API** - Calculate performance metrics
3. **Futures Order Book** - Alternative source for mid prices

### Low Priority (Nice to have):
1. **Active Coins API** - Get available trading pairs
2. **Exchange Precision API** - Format orders correctly
3. **Trade Info API** - Initial setup validation
4. **Trading Fee API** - Cost calculation

---

## Implementation Notes

### For Mid Price Calculation:
Currently using `(open + close) / 2` from candles, but sample.md shows mid prices from order book:
- Should use: `GET /trade/api/v2/depth` to get best bid and ask
- Calculate: `mid_price = (best_bid + best_ask) / 2`
- Poll this every 3 minutes for intraday series

### For Current Price:
- Use `GET /trade/api/v2/24hr/ticker` for spot
- Use `GET /trade/api/v2/futures/ticker` for futures (also provides OI and funding rate)

### For Open Interest & Funding Rate:
- Must use Futures Ticker endpoint (not available in spot ticker)
- Endpoint: `GET /trade/api/v2/futures/ticker`
- Parameters: `symbol`, `exchange`

---

## References

- CoinSwitch API Documentation: https://api-trading.coinswitch.co/
- Current Implementation: `server/src/api.ts`
- Indicators Implementation: `server/src/helpers/indicators.ts`
- Sample Data Requirements: `server/scrap/sample.md`

