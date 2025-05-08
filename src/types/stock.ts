export interface StockData {
  id: string;
  code: string;
  buyPrice: number;
  price: number;
  volume: number;
  current: number;
  tax: number;
  profit: number;
  timestamp: number;
  total: number;
  broker: string;
  investValue: number; 
  marketValue: number;
  profitPercent: number;
  previousPrice: number;
  previousPercent: number;
}

export interface StockPosition {
  code: string
  buyPrice: number
  volume: number
  broker?: Broker
}

export interface StockPriceResponse {
  data: {
    close: number
    [key: string]: any
  }[]
}

export interface StockState {
  stocks: StockData[]
  isMarketOpen: boolean
  selectedBroker: Broker
  brokers: Broker[]
}

export type Broker = 'TCBS' | 'VPS' | 'SSI' | 'VND' | 'MBS'