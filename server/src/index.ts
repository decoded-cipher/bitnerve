import { pingApi, getWalletBalance, cancelAllOrders } from "./api";
import { getIndicators } from "./helpers/services";
// import { getPositionList } from "./api";


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
    // const allPositions = await getPositionList({
    //   category: "linear"
    // });
    


    // Get wallet balance
    const walletBalance = await getWalletBalance();
    console.log('Wallet Balance:', JSON.stringify(walletBalance, null, 2));

    // Cancel all orders
    // const cancelResult = await cancelAllOrders('EXCHANGE_2');
    // console.log('Cancel All Orders Result:', JSON.stringify(cancelResult, null, 2));

  } catch (error) {
    console.error('Error in main execution:', error);
  }
  process.exit(0);
})();
