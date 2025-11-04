import { invokeAgent } from './lib/agent';
import { getOrCreateAccount, getOpenPositions, updatePositionPnL, createAccountSnapshot } from './lib/exchange/helper';
import { fetchMarketData } from './lib/exchange';
import { closeDatabase } from './config/database';
import type { SessionState } from './types';

interface TradingBotConfig {
  initialBalance?: number;
  runIntervalMinutes?: number;
  maxIterations?: number;
  updateIntervalMinutes?: number; // How often to update position PnL
}

/**
 * Main trading bot that runs in a loop
 */
export class TradingBot {
  private accountId: string | null = null;
  private sessionState: SessionState | null = null;
  private config: Required<TradingBotConfig>;
  private shouldStop: boolean = false;

  constructor(config: TradingBotConfig = {}) {
    this.config = {
      initialBalance: config.initialBalance || 10000,
      runIntervalMinutes: config.runIntervalMinutes || 5,
      maxIterations: config.maxIterations || 100,
      updateIntervalMinutes: config.updateIntervalMinutes || 1,
    };
  }

  /**
   * Initialize the bot
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing Trading Bot...');
    
    // Create or get account
    const account = await getOrCreateAccount(this.config.initialBalance);
    this.accountId = account.id;

    // Initialize session state
    this.sessionState = {
      startTime: Date.now(),
      invocationCount: 0,
      initialBalance: parseFloat(account.initial_balance),
    };

    console.log(`✅ Account initialized: ${account.id}`);
    console.log(`💰 Initial Balance: $${this.config.initialBalance.toLocaleString()}`);
  }

  /**
   * Update position PnL based on current market prices
   */
  async updatePositions(): Promise<void> {
    if (!this.accountId) return;

    try {
      const positions = await getOpenPositions(this.accountId);
      const marketData = await fetchMarketData();

      for (const position of positions) {
        const symbolData = marketData.find(m => m.symbol === position.symbol);
        if (symbolData && symbolData.data.currentPrice) {
          await updatePositionPnL(position.id, symbolData.data.currentPrice);
        }
      }

      // Create snapshot after updating positions
      try {
        await createAccountSnapshot(this.accountId);
      } catch (error) {
        console.error('Error creating account snapshot:', error);
      }

      console.log(`📊 Updated ${positions.length} positions`);
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  }

  /**
   * Run one trading decision cycle
   */
  async runOneCycle(): Promise<void> {
    if (!this.accountId || !this.sessionState) {
      throw new Error('Bot not initialized');
    }

    try {
      console.log(`\n🔄 Running cycle ${this.sessionState.invocationCount + 1}...`);
      
      // Generate trading decision
      const result = await invokeAgent(this.sessionState, this.accountId);

      console.log(`\n🤖 Agent Response:`);
      console.log(result.text);

      // Log tool calls if any
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`\n🔧 Tool Calls Executed:`);
        for (const toolCall of result.toolCalls) {
          console.log(`  - ${toolCall.toolName}:`, JSON.stringify(toolCall.result, null, 2));
        }
      }

      // Update session state
      this.sessionState.invocationCount++;
      
      // Create snapshot after each trading cycle
      if (this.accountId) {
        try {
          await createAccountSnapshot(this.accountId);
        } catch (error) {
          console.error('Error creating account snapshot:', error);
        }
      }
      
    } catch (error) {
      console.error('Error in trading cycle:', error);
      this.sessionState.invocationCount++;
    }
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    await this.initialize();
    
    console.log('\n🚀 Starting Trading Bot...');
    console.log(`⏰ Run interval: ${this.config.runIntervalMinutes} minutes`);
    console.log(`🔄 Max iterations: ${this.config.maxIterations}`);
    console.log(`📍 Press Ctrl+C to stop\n`);

    let iteration = 0;
    let lastUpdateTime = Date.now();

    // Update positions periodically
    const updateInterval = setInterval(async () => {
      const now = Date.now();
      const minutesPassed = (now - lastUpdateTime) / (1000 * 60);
      
      if (minutesPassed >= this.config.updateIntervalMinutes) {
        await this.updatePositions();
        lastUpdateTime = now;
      }
    }, 60000); // Check every minute

    try {
      while (iteration < this.config.maxIterations && !this.shouldStop) {
        await this.runOneCycle();
        iteration++;

        if (iteration < this.config.maxIterations && !this.shouldStop) {
          console.log(`\n⏳ Waiting ${this.config.runIntervalMinutes} minutes until next cycle...`);
          await this.sleep(this.config.runIntervalMinutes * 60 * 1000);
        }
      }

      console.log(`\n✅ Trading session completed after ${iteration} cycles`);
    } catch (error) {
      console.error('Error in trading loop:', error);
    } finally {
      clearInterval(updateInterval);
      await this.shutdown();
    }
  }

  /**
   * Stop the bot gracefully
   */
  stop(): void {
    console.log('\n🛑 Stopping bot...');
    this.shouldStop = true;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('🧹 Cleaning up...');
    await closeDatabase();
    console.log('👋 Goodbye!');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

// Export default bot instance
export const tradingBot = new TradingBot();
