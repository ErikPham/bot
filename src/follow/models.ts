/**
 * Các model liên quan đến danh sách theo dõi
 */

// Model điểm theo dõi cổ phiếu
export interface StockFollowPoint {
  entry: number;
  takeProfit: number;
  stopLoss: number;
  volume: number;
}

// Model cổ phiếu theo dõi
export interface StockFollow {
  symbol: string;
  points: StockFollowPoint[];
}

// Model danh sách theo dõi
export interface StockFollowList {
  stocks: StockFollow[];
} 