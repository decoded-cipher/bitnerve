import { tradingBot } from './bot';

// Main entry point
(async () => {
  try {
    await tradingBot.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();