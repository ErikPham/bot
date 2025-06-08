import { Client } from 'discord.js';
import { STORAGE_PREFIX, getData, saveData } from '../storage/discord-storage';
import { fetchStockPrice, fetchPreviousStockPrice } from '../api/stock-api';
import type { Portfolio, Stock, StockData, PortfolioSummary } from './models';

/**
 * Lấy danh mục đầu tư
 */
export async function getPortfolio(
  client: Client,
  userId: string,
  channelId: string
): Promise<Portfolio> {
  return getData(
    client,
    channelId,
    userId,
    STORAGE_PREFIX.PORTFOLIO,
    { userId, channelId, stocks: [] }
  );
}

/**
 * Lưu danh mục đầu tư
 */
export async function savePortfolio(
  client: Client,
  userId: string,
  channelId: string,
  portfolio: Portfolio
): Promise<boolean> {
  return saveData(
    client,
    channelId,
    userId,
    STORAGE_PREFIX.PORTFOLIO,
    portfolio
  );
}

/**
 * Thêm cổ phiếu vào danh mục
 */
export async function addStock(
  client: Client,
  userId: string,
  channelId: string,
  symbol: string,
  quantity: number,
  price: number
): Promise<boolean> {
  try {
    const portfolio = await getPortfolio(client, userId, channelId);
    const existingStockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol);

    if (existingStockIndex >= 0) {
      // Cập nhật cổ phiếu hiện có
      const oldQuantity = portfolio.stocks[existingStockIndex].quantity;
      const oldPrice = portfolio.stocks[existingStockIndex].price;

      // Tính giá trung bình
      const oldValue = oldQuantity * oldPrice;
      const newValue = quantity * price;
      const totalQuantity = oldQuantity + quantity;

      portfolio.stocks[existingStockIndex].quantity = totalQuantity;
      portfolio.stocks[existingStockIndex].price = (oldValue + newValue) / totalQuantity;
    } else {
      // Thêm cổ phiếu mới
      portfolio.stocks.push({
        symbol,
        quantity,
        price,
        date: new Date().toISOString(),
      });
    }

    return savePortfolio(client, userId, channelId, portfolio);
  } catch (error) {
    console.error('Lỗi khi thêm cổ phiếu:', error);
    return false;
  }
}

/**
 * Xóa cổ phiếu khỏi danh mục
 */
export async function removeStock(
  client: Client,
  userId: string,
  channelId: string,
  symbol: string
): Promise<boolean> {
  try {
    const portfolio = await getPortfolio(client, userId, channelId);
    const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol);

    if (stockIndex < 0) {
      throw new Error(`Không tìm thấy cổ phiếu ${symbol} trong danh sách.`);
    }

    portfolio.stocks.splice(stockIndex, 1);
    return savePortfolio(client, userId, channelId, portfolio);
  } catch (error) {
    console.error('Lỗi khi xóa cổ phiếu:', error);
    return false;
  }
}

/**
 * Lấy danh sách cổ phiếu trong danh mục
 */
export async function getStocks(
  client: Client,
  userId: string,
  channelId: string
): Promise<Stock[]> {
  try {
    const portfolio = await getPortfolio(client, userId, channelId);
    return portfolio.stocks;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cổ phiếu:', error);
    return [];
  }
}

/**
 * Tính thuế giao dịch
 */
export function calculateTax(price: number, volume: number, taxRate: number = 0.001): number {
  return price * volume * taxRate;
}

/**
 * Tính lợi nhuận
 */
export function calculateProfit(current: number, buyPrice: number, volume: number): number {
  const profit = (current - buyPrice) * volume;
  return profit - calculateTax(current, volume);
}

/**
 * Lấy thông tin chi tiết danh mục đầu tư
 */
export async function getPortfolioDetails(
  client: Client,
  userId: string,
  channelId: string,
  isMarketOpen: boolean
): Promise<PortfolioSummary> {
  const portfolio = await getPortfolio(client, userId, channelId);
  
  const stocksData: StockData[] = [];
  let totalValue = 0;
  let totalInvestment = 0;
  
  for (const stock of portfolio.stocks) {
    const currentPrice = await fetchStockPrice(stock.symbol);
    const previousPrice = await fetchPreviousStockPrice(stock.symbol, Date.now());
    
    if (currentPrice) {
      const marketValue = currentPrice * stock.quantity;
      const investValue = stock.price * stock.quantity;
      const previousPercent = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
      
      stocksData.push({
        code: stock.symbol,
        volume: stock.quantity,
        current: currentPrice,
        buy: stock.price,
        previousPrice: previousPrice || currentPrice,
        previousPercent,
        marketValue,
        investValue,
        profit: marketValue - investValue,
        profitPercent: ((marketValue - investValue) / investValue) * 100
      });
      
      totalValue += marketValue;
      totalInvestment += investValue;
    }
  }
  
  const totalProfit = totalValue - totalInvestment;
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
  
  return {
    stocks: stocksData,
    isMarketOpen,
    totalValue,
    totalProfitPercent,
    totalInvestment,
    totalProfit
  };
} 