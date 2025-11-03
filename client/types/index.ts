export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
}

export interface Model {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Position {
  side: 'LONG' | 'SHORT';
  coin: string;
  leverage: number;
  notional: number;
  unrealizedPnl: number;
  exitPlan?: string;
}

export interface ModelPositions {
  model: Model;
  totalUnrealizedPnl: number;
  positions: Position[];
  availableCash: number;
}

export interface AccountValue {
  timestamp: Date;
  models: {
    [modelId: string]: number;
  };
}

export interface ModelPerformance {
  highest: {
    model: string;
    value: number;
    change: number;
    icon: string;
  };
  lowest: {
    model: string;
    value: number;
    change: number;
    icon: string;
  };
}

