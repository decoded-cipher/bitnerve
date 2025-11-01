import { pingApi, getOrder, getClosedOrders, getWalletBalance, getUserPortfolio } from "./api";
import { getIndicators } from "./helpers/services";


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
    //   symbol: "SOLINR",
    // });
    // console.log('Futures Positions:', JSON.stringify(allPositions, null, 2));
    


    // Get order book for SOLINR
    // const orderBook = await getOrderBook({
    //   symbol: "SOLINR",
    //   exchange: "EXCHANGE_2"
    // });
    // console.log('Order Book:', JSON.stringify(orderBook, null, 2));



    // Get wallet balance
    // const walletBalance = await getWalletBalance();
    // console.log('Wallet Balance:', JSON.stringify(walletBalance, null, 2));



    // Get closed orders (example from Python code)
    // const closedOrders = await getClosedOrders({
    //   exchange: "EXCHANGE_2",
    //   symbol: "ETHUSDT"
    // });
    // console.log('Closed Orders:', JSON.stringify(closedOrders, null, 2));



    // Get user portfolio
    // const userPortfolio = await getUserPortfolio();
    // console.log('User Portfolio:', JSON.stringify(userPortfolio, null, 2));


    // Get order details
    // const orderDetails = await getOrder({ order_id: '019a3fc1-e997-7de8-b40e-e1e25affe014' });
    // console.log('Order Details:', JSON.stringify(orderDetails, null, 2));


    // Get leverage information
    // const leverageInfo = await getLeverage({ symbol: 'ETHUSDT', exchange: 'EXCHANGE_2' });
    // console.log('Leverage Info:', JSON.stringify(leverageInfo, null, 2));



    // Cancel all orders
    // const cancelResult = await cancelAllOrders();
    // console.log('Cancel All Orders Result:', JSON.stringify(cancelResult, null, 2));

  } catch (error) {
    console.error('Error in main execution:', error);
  }
  process.exit(0);
})();
