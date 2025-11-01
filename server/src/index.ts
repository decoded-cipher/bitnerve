import { pingApi } from "./api";
import { getIndicators } from "./helpers/services";


(async () => {
  try {

    // Test API connectivity
    const pingResponse = await pingApi();
    console.log('Ping response:', pingResponse);

    console.log("Short Term Position Indicators (5 min):");
    await getIndicators(5, 'SOL/INR');

    console.log("\nLong Term Position Indicators (4 hr):");
    await getIndicators(240, 'SOL/INR');

  } catch (error) {
    console.error('Error in main execution:', error);
  }
  process.exit(0);
})();
