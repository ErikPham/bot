import type { ApplicationCommandType, CacheType, ChatInputCommandInteraction, CommandInteraction } from 'discord.js'

export interface StockData {
  id: string
  code: string
  buyPrice: number
  price: number
  volume: number
  current: number
  tax: number
  profit: number
  timestamp: number
  total: number
  broker: string
  investValue: number
  marketValue: number
  profitPercent: number
  previousPrice: number
  previousPercent: number
}

export interface StockPosition {
  code: string
  buyPrice: number
  volume: number
  broker?: Broker
}

/**
 * Response cho API lấy giá cổ phiếu
 */
export interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  volume: number;
  tradingDate: string;
}

/**
 * Response cho API lịch sử giá
 */
export interface StockHistoryResponse {
  t: number[]; // timestamps
  o: number[]; // open prices
  h: number[]; // high prices
  l: number[]; // low prices
  c: number[]; // close prices
  v: number[]; // volumes
}

/**
 * Response cho API thông tin cơ bản
 */
export interface StockInfoResponse {
  symbol: string;
  exchange: string;
  industry: string;
  companyName: string;
  marketCap: number;
  issueShare: number;
  outstandingShare: number;
}

export interface StockState {
  stocks: StockData[]
  isMarketOpen: boolean
  selectedBroker: Broker
  brokers: Broker[]
}

export type Broker = 'TCBS' | 'VPS' | 'SSI' | 'VND' | 'MBS'

export interface CommandModule {
  data: {
    toJSON: () => unknown
  }
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>
}

export interface CommandsCollection {
  [key: string]: CommandModule
}
