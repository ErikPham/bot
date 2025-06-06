import type { TextChannel } from 'discord.js';
import { StockManager } from './stockManager';

export class FollowListTracker {
  private stockManager: StockManager;
  private checkInterval: number;

  constructor(stockManager: StockManager, checkInterval: number) {
    this.stockManager = stockManager;
    this.checkInterval = checkInterval;
  }

  public async startTracking(channel: TextChannel): Promise<void> {
    setInterval(async () => {
      try {
        await this.checkFollowList(channel.id);
      } catch (error) {
        console.error('Error checking follow list:', error);
      }
    }, this.checkInterval);
  }

  private async checkFollowList(channelId: string): Promise<void> {
    const channel = await this.stockManager.getChannel(channelId);
    if (!channel) return;

    const followList = await this.stockManager.getFollowList(channelId);
    if (followList.stocks.length === 0) return;

    for (const stock of followList.stocks) {
      const currentPrice = await this.stockManager.fetchStockPrice(stock.symbol);
      if (!currentPrice) continue;

      for (const point of stock.points) {
        // Kiểm tra điểm mua
        if (currentPrice <= point.entry) {
          const diff = ((currentPrice - point.entry) / point.entry * 100).toFixed(1);
          await channel.send(`🎯 **Điểm mua đã đạt!**\n📈 ${stock.symbol}\n💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n🟢 Giá mua: ${point.entry.toLocaleString('vi-VN')} (${diff}%)\n🔴 Giá bán: ${point.takeProfit.toLocaleString('vi-VN')}`);
        }
        // Kiểm tra điểm bán
        else if (currentPrice >= point.takeProfit) {
          const diff = ((currentPrice - point.entry) / point.entry * 100).toFixed(1);
          await channel.send(`🎯 **Điểm bán đã đạt!**\n📈 ${stock.symbol}\n💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n🟢 Giá mua: ${point.entry.toLocaleString('vi-VN')}\n🔴 Giá bán: ${point.takeProfit.toLocaleString('vi-VN')} (${diff}%)`);
        }
      }
    }
  }
} 