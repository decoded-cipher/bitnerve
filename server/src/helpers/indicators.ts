
import { getCandleData } from "../api";
import { CandlesParams } from "../types";
import { formatToHumanReadableData } from "../utils";



/* 
  @params:
    data - Array of candle data
  @description: Calculate Mid Prices from candle data
  @steps:
    1. For each candle, calculate the mid price as (open + close) / 2.
    2. Return an array of mid prices.
*/
export const calcMidPrice = async (data: any[]) => {
  return data.map((candle: any) => Number(((Number(candle.o) + Number(candle.c)) / 2).toFixed(2)));
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
export const calculateEMA = async (data: number[], period: number): Promise<number[]> => {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // Start with SMA for the first EMA value
  const initialSMA = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  ema.push(initialSMA);

  for (let i = period; i < data.length; i++) {
    const emaToday = ((data[i] * k) + (ema[ema.length - 1] * (1 - k))).toFixed(3);
    ema.push(Number(emaToday));
  }

  return ema;
};


// export const calculateRSI = (data: number[], period: number): number[] => {
//   const rsi: number[] = [];
//   let gains = 0;
//   let losses = 0;

//   for (let i = 1; i <= period; i++) {
//     const change = data[i] - data[i - 1];
//     if (change >= 0) {
//       gains += change;
//     } else {
//       losses -= change;
//     }
//   }

//   let averageGain = gains / period;
//   let averageLoss = losses / period;
//   rsi.push(100 - (100 / (1 + averageGain / averageLoss)));

//   for (let i = period + 1; i < data.length; i++) {
//     const change = data[i] - data[i - 1];
//     if (change >= 0) {
//       averageGain = (averageGain * (period - 1) + change) / period;
//       averageLoss = (averageLoss * (period - 1)) / period;
//     } else {
//       averageGain = (averageGain * (period - 1)) / period;
//       averageLoss = (averageLoss * (period - 1) - change) / period;
//     }
//     rsi.push(100 - (100 / (1 + averageGain / averageLoss)));
//   }

//   return rsi;
// };


