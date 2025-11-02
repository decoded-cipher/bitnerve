import { getIndicators } from "./helpers/services";
import { formatTimestampToIST, formatToINRCurrency } from "./helpers/utils";
import { 
  pingApi, 
  getOrder, 
  getOrderBook, 
  // getClosedOrders, 
  getWalletBalance, 
  getUserPortfolio, 
  getFuturesPositions, 
  // getLeverage
} from "./api";


(async () => {
  try {

    // Test API connectivity
    // const pingResponse = await pingApi();
    // console.log('Ping response:', pingResponse);




    // console.log("Short Term Position Indicators (5 min):");
    // await getIndicators(5, 'ETHUSDT');
    
    // console.log("\nLong Term Position Indicators (4 hr):");
    // await getIndicators(240, 'ETHUSDT');
    



    // Get all open linear positions
    // const allPositions = await getFuturesPositions({
    //   exchange: "EXCHANGE_2",
    //   symbol: "SOLUSDT",
    // });
    // console.log('Futures Positions:', JSON.stringify(allPositions, null, 2));
    



    // Get order book for ETC/INR
    const orderBook = await getOrderBook({
      symbol: "ETC/INR",
      exchange: "coinswitchx",
      // l2Orderbook: "true"
    });
    
    console.table(orderBook.data.slice(0, 10).map((trade: any) => ({
      eventTime: formatTimestampToIST(trade.E),
      price: formatToINRCurrency(parseFloat(trade.p)),
      quantity: trade.q,
      exchange: trade.e,
      symbol: trade.s,
      mode: trade.m ? 'SHORT' : 'LONG',
    })));




    // Get wallet balance
    // const walletBalance = await getWalletBalance();
    // console.log('Wallet Balance:', JSON.stringify(walletBalance, null, 2));




    // Get closed orders (example from Python code)
    // const closedOrders = await getClosedOrders({
    //   exchange: "EXCHANGE_2"
    // });
    // console.log('Closed Orders:', JSON.stringify(closedOrders, null, 2));




    // Get user portfolio
    // const userPortfolio = await getUserPortfolio();
    // console.log('User Portfolio:', JSON.stringify(userPortfolio, null, 2));

    // Get order details
    // const orderDetails = await getOrder({ order_id: '019a4148-b491-72c6-92c2-9e8bf297e23b' });
    // console.log('Order Details:', JSON.stringify(orderDetails, null, 2));

    // Get leverage information
    // const leverageInfo = await getLeverage({
    //   symbol: 'ETHUSDT',
    //   exchange: 'EXCHANGE_2'
    // });
    // console.log('Leverage Info:', JSON.stringify(leverageInfo, null, 2));


    

    // Cancel all orders
    // const cancelResult = await cancelAllOrders();
    // console.log('Cancel All Orders Result:', JSON.stringify(cancelResult, null, 2));

  } catch (error) {
    console.error('Error in main execution:', error);
  }
  process.exit(0);
})();
