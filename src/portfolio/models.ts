/**
 * Các model liên quan đến danh mục đầu tư
 */

// Model cổ phiếu trong danh mục
export interface Stock {
  symbol: string;
  quantity: number;
  price: number;
  date: string;
}

// Model danh mục đầu tư
export interface Portfolio {
  userId: string;
  channelId: string;
  stocks: Stock[];
}

// Model thông tin cổ phiếu với giá hiện tại và phân tích
export interface StockData {
  code: string;
  volume: number;
  current: number;
  buy: number;
  previousPrice: number;
  previousPercent: number;
  marketValue: number;
  investValue: number;
  profit: number;
  profitPercent: number;
}

// Model thống kê tổng hợp danh mục
export interface PortfolioSummary {
  stocks: StockData[];
  isMarketOpen: boolean;
  totalValue: number;
  totalProfitPercent: number;
  totalInvestment: number;
  totalProfit: number;
} 