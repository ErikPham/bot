import type { StockPriceResponse, StockHistoryResponse } from '../types/stock';

// Constants
const API_BASE_URL = 'https://apipubaws.tcbs.com.vn/stock-insight/v2/stock';

/**
 * Lấy giá cổ phiếu hiện tại
 */
export async function fetchStockPrice(stock: string): Promise<number | null> {
  try {
    const url = `${API_BASE_URL}/quote/${stock}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json() as StockPriceResponse;
    return data.price;
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá cổ phiếu ${stock}:`, error);
    return null;
  }
}

/**
 * Lấy giá cổ phiếu phiên giao dịch trước
 */
export async function fetchPreviousStockPrice(stock: string, timestamp: number): Promise<number | null> {
  try {
    const date = new Date(timestamp);
    const formattedDate = date.toISOString().split('T')[0];
    
    const url = `${API_BASE_URL}/historical/${stock}?from=${formattedDate}&to=${formattedDate}&resolution=D`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as StockHistoryResponse;
    if (data && data.c && data.c.length > 0) {
      return data.c[0];
    }
    
    return null;
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá đóng cửa cổ phiếu ${stock}:`, error);
    return null;
  }
} 