/**
 * Basic prompt templates for the trading agent
 */
export const PROMPT = {
  SYSTEM: `You are a sophisticated AI trading assistant specialized in cryptocurrency perpetual futures trading. Your goal is to discover alpha and make profitable trading decisions based on technical analysis, market data, and risk management principles.

IMPORTANT TRADING GUIDELINES:
- Always prioritize risk management over potential gains
- Consider your current portfolio allocation and avoid overexposure to any single asset
- Monitor your positions closely and respect stop-loss and take-profit levels
- Use the technical indicators provided to identify entry and exit opportunities
- Be aware of leverage implications and liquidation risks
- Consider funding rates and open interest changes as sentiment indicators

You will receive comprehensive market data including intraday prices, technical indicators (EMA, MACD, RSI), volume analysis, and longer-term context. Use this information to make informed trading decisions.`,

  USER: `It has been {{MINUTES_TRADING}} minutes since you started trading. The current time is {{CURRENT_TIME}} and you've been invoked {{INVOCATION_COUNT}} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST

Timeframes note: Unless stated otherwise in a section title, intraday series are provided at 5-minute intervals. If a coin uses a different interval, it is explicitly stated in that coin's section.

CURRENT MARKET STATE FOR ALL COINS
{{COIN_DATA}}

HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
Current Total Return (percent): {{TOTAL_RETURN_PERCENT}}%

Available Cash: {{AVAILABLE_CASH}}

Current Account Value: {{ACCOUNT_VALUE}}

Current live positions & performance: {{POSITIONS}}

Sharpe Ratio: {{SHARPE_RATIO}}

Based on the above information, what trading action should you take?`,

  ASSISTANT: 'Assistant: ',
};

/**
 * Helper function to format coin data section template
 */
export function formatCoinData(coin: string, data: any): string {
  const coinUpper = coin.toUpperCase();
  return `
ALL ${coin} DATA
current_price = {{${coinUpper}_CURRENT_PRICE}}, current_ema20 = {{${coinUpper}_CURRENT_EMA20}}, current_macd = {{${coinUpper}_CURRENT_MACD}}, current_rsi (7 period) = {{${coinUpper}_CURRENT_RSI7}}

In addition, here is the latest ${coin} open interest and funding rate for perps (the instrument you are trading):

Open Interest: Latest: {{${coinUpper}_OI_LATEST}} Average: {{${coinUpper}_OI_AVG}}

Funding Rate: {{${coinUpper}_FUNDING_RATE}}

Intraday series (5-minute intervals, oldest → latest):

Mid prices: {{${coinUpper}_MID_PRICES}}

EMA indicators (20-period): {{${coinUpper}_EMA20}}

MACD indicators: {{${coinUpper}_MACD}}

RSI indicators (7-Period): {{${coinUpper}_RSI7}}

RSI indicators (14-Period): {{${coinUpper}_RSI14}}

Longer-term context (4-hour timeframe):

20-Period EMA: {{${coinUpper}_EMA20_4H}} vs. 50-Period EMA: {{${coinUpper}_EMA50_4H}}

3-Period ATR: {{${coinUpper}_ATR3}} vs. 14-Period ATR: {{${coinUpper}_ATR14}}

Current Volume: {{${coinUpper}_VOLUME_CURRENT}} vs. Average Volume: {{${coinUpper}_VOLUME_AVG}}

MACD indicators: {{${coinUpper}_MACD_4H}}

RSI indicators (14-Period): {{${coinUpper}_RSI14_4H}}
`;
}

