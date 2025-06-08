import { Client, TextChannel } from 'discord.js';
import { STORAGE_PREFIX, getData, saveData } from '../storage/discord-storage';
import { fetchStockPrice } from '../api/stock-api';
import type { StockFollow, StockFollowList, StockFollowPoint } from './models';

/**
 * Lấy danh sách theo dõi
 */
export async function getFollowList(
  client: Client,
  userId: string,
  channelId: string
): Promise<StockFollowList> {
  return getData(
    client,
    channelId,
    userId,
    STORAGE_PREFIX.FOLLOW_LIST,
    { stocks: [] }
  );
}

/**
 * Lưu danh sách theo dõi
 */
export async function saveFollowList(
  client: Client,
  userId: string,
  channelId: string,
  followList: StockFollowList
): Promise<boolean> {
  return saveData(
    client,
    channelId,
    userId,
    STORAGE_PREFIX.FOLLOW_LIST,
    followList
  );
}

/**
 * Thêm cổ phiếu vào danh sách theo dõi
 */
export async function addStockToFollowList(
  client: Client,
  userId: string,
  channelId: string,
  symbol: string,
  point: StockFollowPoint
): Promise<boolean> {
  try {
    const followList = await getFollowList(client, userId, channelId);
    const existingStockIndex = followList.stocks.findIndex(s => s.symbol === symbol);

    if (existingStockIndex >= 0) {
      // Thêm điểm theo dõi mới vào cổ phiếu hiện có
      followList.stocks[existingStockIndex].points.push(point);
    } else {
      // Thêm cổ phiếu mới vào danh sách theo dõi
      followList.stocks.push({
        symbol,
        points: [point]
      });
    }

    return saveFollowList(client, userId, channelId, followList);
  } catch (error) {
    console.error('Lỗi khi thêm cổ phiếu vào danh sách theo dõi:', error);
    return false;
  }
}

/**
 * Xóa cổ phiếu khỏi danh sách theo dõi
 */
export async function removeStockFromFollowList(
  client: Client,
  userId: string,
  channelId: string,
  symbol: string
): Promise<boolean> {
  try {
    const followList = await getFollowList(client, userId, channelId);
    const stockIndex = followList.stocks.findIndex(s => s.symbol === symbol);

    if (stockIndex < 0) {
      throw new Error(`Không tìm thấy cổ phiếu ${symbol} trong danh sách theo dõi.`);
    }

    followList.stocks.splice(stockIndex, 1);
    return saveFollowList(client, userId, channelId, followList);
  } catch (error) {
    console.error('Lỗi khi xóa cổ phiếu khỏi danh sách theo dõi:', error);
    return false;
  }
}

/**
 * Gửi thông báo điểm mua
 */
export async function sendBuyPointAlert(
  channel: TextChannel,
  stock: string,
  currentPrice: number,
  entry: number,
  takeProfit: number
): Promise<void> {
  const diff = ((currentPrice - entry) / entry * 100).toFixed(1);
  
  await channel.send(
    `🎯 **Điểm mua đã đạt!**\n` +
    `📈 ${stock}\n` +
    `💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n` +
    `🟢 Giá mua: ${entry.toLocaleString('vi-VN')} (${diff}%)\n` +
    `🔴 Giá bán: ${takeProfit.toLocaleString('vi-VN')}`
  );
}

/**
 * Gửi thông báo điểm bán
 */
export async function sendSellPointAlert(
  channel: TextChannel,
  stock: string,
  currentPrice: number,
  entry: number,
  takeProfit: number
): Promise<void> {
  const diff = ((currentPrice - entry) / entry * 100).toFixed(1);
  
  await channel.send(
    `🎯 **Điểm bán đã đạt!**\n` +
    `📈 ${stock}\n` +
    `💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n` +
    `🟢 Giá mua: ${entry.toLocaleString('vi-VN')}\n` +
    `🔴 Giá bán: ${takeProfit.toLocaleString('vi-VN')} (${diff}%)`
  );
}

/**
 * Kiểm tra cổ phiếu và gửi cảnh báo nếu cần
 */
export async function checkStockPrice(
  channel: TextChannel,
  stock: StockFollow
): Promise<void> {
  const currentPrice = await fetchStockPrice(stock.symbol);
  if (!currentPrice) return;

  for (const point of stock.points) {
    // Kiểm tra điểm mua
    if (currentPrice <= point.entry) {
      await sendBuyPointAlert(channel, stock.symbol, currentPrice, point.entry, point.takeProfit);
    }
    // Kiểm tra điểm bán
    else if (currentPrice >= point.takeProfit) {
      await sendSellPointAlert(channel, stock.symbol, currentPrice, point.entry, point.takeProfit);
    }
  }
} 