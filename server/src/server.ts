
import { getIndicators } from './helpers/services';

(async () => {  
  try {
    const params = {
      duration: 5,
      symbol: 'SOLUSDT'
    };

    const response = await getIndicators(params.duration, params.symbol);
    console.log(response);

  } catch (error) {
    console.error('Error fetching indicators:', error);
  }
  process.exit(0);
})();
