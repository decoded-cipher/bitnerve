
/* 
  @params:
    data - Array of candle data
  @description: Calculate Mid Prices from candle data
  @steps:
    1. For each candle, calculate the mid price as (open + close) / 2.
    2. Return an array of mid prices.
*/
export const calcMidPrice = (data: any[]): number[] => {
  return data.map((candle: any) => (Number(candle.o) + Number(candle.c)) / 2);
};



/*
  @params: 
    data - Array of prices
    period - Number of periods for SMA
  @description: Calculate Simple Moving Average (SMA)
  @steps:
    1. Take the sum of closing prices over a specific period.
    2. Divide the sum by the number of periods.
*/
export const calculateSMA = (data: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i <= data.length - period; i++) {
    const slice = data.slice(i, i + period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }
  return sma;
};



/*
  @params:
    data - Array of prices
    period - Number of periods for EMA
  @description: Calculate Exponential Moving Average (EMA)
  @steps:
    1. Calculate the SMA for the initial EMA value.
    2. Use the formula: EMA_today = (Price_today * k) + (EMA_yesterday * (1 - k))
      where k = 2 / (period + 1)
*/
export const calculateEMA = (data: number[], period: number): number[] => {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // First EMA value is the SMA of the first 'period' values
  const sma = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  ema.push(sma);

  // Calculate the rest of the EMA values
  for (let i = period; i < data.length; i++) {
    const emaToday = (data[i] * k) + (ema[ema.length - 1] * (1 - k));
    ema.push(emaToday);
  }

  return ema;
};



/*  
  @params:
    data - Array of prices
  @description: Calculate MACD (Moving Average Convergence Divergence)
  @steps:
    1. Calculate EMA12 and EMA26
    2. EMA12 will have more points than EMA26 (since it needs fewer periods to start)
    3. Slice EMA12 to match EMA26 length
    4. MACD line = EMA12 - EMA26
  @returns: Array of MACD values
*/
export const calculateMACD = (data: number[]): number[] => {
  const ema26 = calculateEMA(data, 26);
  let ema12 = calculateEMA(data, 12);

  // console.log('EMA12:', ema12);
  // console.log('Total EMA12 values fetched:', ema12.length);
  
  // console.log('EMA26:', ema26);
  // console.log('Total EMA26 values fetched:', ema26.length);
  
  // EMA12 will be longer than EMA26, so slice it to match EMA26 length
  ema12 = ema12.slice(-ema26.length);
  
  // Calculate MACD line (EMA12 - EMA26)
  const macd = ema12.map((_, index) => (ema12[index] ?? 0) - (ema26[index] ?? 0));
  
  return macd;
};



/*
  @params:
    data - Array of prices
    period - Number of periods for RSI
  @description: Calculate Relative Strength Index (RSI)
  @steps:
    1. Calculate average gains and losses over the specified period.
    2. Calculate RS = Average Gain / Average Loss
    3. Calculate RSI = 100 - (100 / (1 + RS))
*/
export const calculateRSI = (data: number[], period: number): number[] => {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  
  // Handle division by zero
  if (averageLoss === 0) {
    rsi.push(100);
  } else {
    rsi.push(100 - (100 / (1 + averageGain / averageLoss)));
  }

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) {
      averageGain = (averageGain * (period - 1) + change) / period;
      averageLoss = (averageLoss * (period - 1)) / period;
    } else {
      averageGain = (averageGain * (period - 1)) / period;
      averageLoss = (averageLoss * (period - 1) - change) / period;
    }
    
    // Handle division by zero
    if (averageLoss === 0) {
      rsi.push(100);
    } else {
      rsi.push(100 - (100 / (1 + averageGain / averageLoss)));
    }
  }

  return rsi;
};




/**
 * Calculate Average True Range (ATR) from candlestick data
 * @params:
 *   data - Array of candlestick objects with o, h, l, c properties
 *   period - Number of periods for ATR
 * @description: Calculate ATR using proper True Range formula
 * @steps:
 *   1. Calculate True Range for each candle: max(high-low, abs(high-prev_close), abs(low-prev_close))
 *   2. Calculate SMA of True Range values
 */
export const calculateATR = (data: any[], period: number): number[] => {
  const trueRanges: number[] = [];
  
  // Start from index 1 to have previous close
  for (let i = 1; i < data.length; i++) {
    const curr = data[i];
    const prev = data[i - 1];
    
    const high = Number(curr.h);
    const low = Number(curr.l);
    const prevClose = Number(prev.c);
    
    // True Range = max(high-low, abs(high-prev_close), abs(low-prev_close))
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  return calculateSMA(trueRanges, period);
};



/**
 * Calculate volume data from candlestick data
 * @params:
 *   data - Array of candlestick objects with volume property
 * @description: Extract current volume and average volume
 * @returns: Object with currentVolume and averageVolume
 */
export const calculateVolumeData = (data: any[]): { currentVolume: number; averageVolume: number } => {
  const volumes = data.map(candle => Number(candle.volume) || 0);
  
  const currentVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
  const averageVolume = volumes.length > 0 
    ? volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length 
    : 0;
  
  return { currentVolume, averageVolume };
};
