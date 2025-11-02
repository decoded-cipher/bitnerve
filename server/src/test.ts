import {
  pingApi,
  getKlinesData,
  getFuturesPositions,
  getWalletBalance,
  getUserPortfolio,
  getOrder,
  getClosedOrders,
  createFuturesOrder,
  cancelFuturesOrder,
  getFuturesTicker,
  // getFuturesOrderBook,
  // getFuturesL2OrderBook,
  // getLeverage,
  // setLeverage,
  // getOpenOrders,
  cancelAllFuturesOrders,
  getFuturesInstrumentInfo,
} from './lib/api';
import { FUTURES_EXCHANGE, PerpetualFuturesSymbol } from './types';

import { getAccountSummary } from './lib/services';

(async () => {
  try {
    const symbol: PerpetualFuturesSymbol = 'ETHUSDT';


    // -------------------------- SUCCESS - WORKING ---------------------------


    // Test 1: Ping API
    // try {
    //   const ping = await pingApi();
    //   console.log(ping);
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- SUCCESS - WORKING ---------------------------


    // Test 2: Get Klines Data
    // try {
    //   const klines = await getKlinesData({
    //     symbol,
    //     interval: 5,
    //     start_time: Date.now() - (1000 * 60 * 60), // 1 hour ago
    //     end_time: Date.now(),
    //   });
    //   console.table(klines);
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------


    // Test 3: Get Futures Positions
    // try {
    //   const positions = await getFuturesPositions({ exchange: FUTURES_EXCHANGE });
    //   console.log('✓ Positions:', JSON.stringify(positions).substring(0, 150));
    // } catch (error: any) {
    //   console.log('✗ Positions Error:', error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------


    // Test 4: Get Wallet Balance
    // try {
    //   const balance = await getWalletBalance();
    //   console.log(JSON.stringify(balance, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- SUCCESS - WORKING ---------------------------


    // Test 5: Get User Portfolio
    // try {
    //   const portfolio = await getUserPortfolio();
    //   console.log(JSON.stringify(portfolio, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- SUCCESS - WORKING ---------------------------


    // Test 6: Get Futures Ticker
    // try {
    //   const ticker = await getFuturesTicker({ symbol, exchange: FUTURES_EXCHANGE });
    //   console.log(JSON.stringify(ticker, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------


    // Test 7: Get Futures Order Book
    // try {
    //   const orderBook = await getFuturesOrderBook({ symbol, exchange: FUTURES_EXCHANGE, limit: 5 });
    //   console.log(JSON.stringify(orderBook, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------


    // Test 8: Get Futures L2 Order Book
    // try {
    //   const l2OrderBook = await getFuturesL2OrderBook({ symbol, exchange: FUTURES_EXCHANGE, limit: 5 });
    //   console.log(JSON.stringify(l2OrderBook, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------



    // Test 9: Get Leverage
    // try {
    //   const leverage = await getLeverage({ symbol, exchange: FUTURES_EXCHANGE });
    //   console.log(JSON.stringify(leverage, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------



    // Test 10: Get Open Orders
    // try {
    //   const openOrders = await getOpenOrders({ exchange: FUTURES_EXCHANGE });
    //   console.log('✓ Open Orders:', Array.isArray(openOrders)
    //     ? `${openOrders.length} orders`
    //     : JSON.stringify(openOrders).substring(0, 150));
    // } catch (error: any) {
    //   console.error(error);
    // }


    // -------------------------- ERROR - NEEDS FIXING ---------------------------


    // Test 11: Get Closed Orders
    // try {
    //   const closedOrders = await getClosedOrders({ exchange: FUTURES_EXCHANGE, symbol });
    //   console.log(JSON.stringify(closedOrders, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }


    // -------------------------- SUCCESS - WORKING ---------------------------

    
    // Test 12: Get Futures Instrument Info
    // try {
    //   const instrumentInfo = await getFuturesInstrumentInfo({ symbol, exchange: FUTURES_EXCHANGE });
    //   console.log(JSON.stringify(instrumentInfo, null, 2));
    // } catch (error: any) {
    //   console.error(error.message);
    // }

    try {
      const response = await getAccountSummary();
      console.log(JSON.stringify(response, null, 2));
    } catch (error: any) {
      console.error('✗ Account Summary Error:', error.message);
    }


  } catch (error: any) {
    console.error(error);
  }

  process.exit(0);
})();
