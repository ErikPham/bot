import type { StockPriceResponse } from '../types/stock';
import fetch from 'node-fetch';

// Constants
const API_BASE_URL = 'https://apipubaws.tcbs.com.vn/stock-insight/v2/stock';
const MARKET_OPEN_HOUR = 9;
const MARKET_CLOSE_HOUR = 15;

/**
 * Lấy thời gian thị trường gần nhất
 */
function getLatestMarketTime(): number {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const now = new Date(timeString);
  const hour = now.getHours();

  if (hour < MARKET_OPEN_HOUR) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(MARKET_CLOSE_HOUR, 0, 0, 0);
    return Math.floor(yesterday.getTime() / 1000);
  }

  if (hour >= MARKET_CLOSE_HOUR) {
    const today = new Date(now);
    today.setHours(MARKET_CLOSE_HOUR, 0, 0, 0);
    return Math.floor(today.getTime() / 1000);
  }

  return Math.floor(now.getTime() / 1000);
}

/**
 * Lấy giá cổ phiếu hiện tại
 */
export async function fetchStockPrice(stock: string): Promise<number | null> {
  try {
    const to = getLatestMarketTime();
    const url = `${API_BASE_URL}/bars?ticker=${stock}&type=stock&resolution=1&to=${to}&countBack=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as StockPriceResponse;
    if (data?.data?.[0]?.close) {
      return data.data[0].close / 1000;
    }
    return null;
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá cổ phiếu ${stock}:`, error);
    return null;
  }
}

/**
 * Lấy giá cổ phiếu phiên giao dịch trước
 */
export async function fetchPreviousStockPrice(stock: string): Promise<number | null> {
  try {
    const to = getLatestMarketTime() - 24 * 60 * 60;
    const url = `${API_BASE_URL}/bars?ticker=${stock}&type=stock&resolution=1&to=${to}&countBack=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as StockPriceResponse;
    if (data?.data && data.data.length > 0) {
      return data.data[0].close / 1000;
    }
    return null;
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá đóng cửa cổ phiếu ${stock}:`, error);
    return null;
  }
} 