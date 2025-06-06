import type { TextChannel } from 'discord.js';
import { StockManager } from './stockManager';

interface TrackingState {
  channelId: string;
  interval: NodeJS.Timeout | null;
}

export class FollowListTracker {
  private stockManager: StockManager;
  private checkInterval: number;
  private trackingStates: Map<string, TrackingState> = new Map();

  constructor(stockManager: StockManager, checkInterval: number) {
    this.stockManager = stockManager;
    this.checkInterval = checkInterval;
  }

  public async startTracking(channel: TextChannel): Promise<void> {
    console.log(`Starting follow list tracking for channel: ${channel.name}`);
    
    // Stop existing tracking if it exists
    this.stopTracking(channel.id);
    
    // Create new tracking state
    const interval = setInterval(async () => {
      try {
        await this.checkFollowList(channel.id);
      } catch (error) {
        console.error(`Error checking follow list for channel ${channel.name}:`, error);
      }
    }, this.checkInterval);
    
    this.trackingStates.set(channel.id, { 
      channelId: channel.id, 
      interval 
    });
  }
  
  public stopTracking(channelId: string): void {
    const state = this.trackingStates.get(channelId);
    if (state && state.interval) {
      clearInterval(state.interval);
      this.trackingStates.delete(channelId);
      console.log(`Stopped tracking for channel ID: ${channelId}`);
    }
  }
  
  public stopAllTracking(): void {
    for (const [channelId, state] of this.trackingStates.entries()) {
      if (state.interval) {
        clearInterval(state.interval);
        console.log(`Stopped tracking for channel ID: ${channelId}`);
      }
    }
    this.trackingStates.clear();
  }

  private async checkFollowList(channelId: string): Promise<void> {
    const channel = await this.stockManager.getChannel(channelId);
    if (!channel) {
      console.log(`Channel ${channelId} not found, stopping tracker`);
      this.stopTracking(channelId);
      return;
    }

    const followList = await this.stockManager.getFollowList(channelId);
    if (followList.stocks.length === 0) return;

    for (const stock of followList.stocks) {
      await this.checkStockPrice(channel, stock);
    }
  }
  
  private async checkStockPrice(channel: TextChannel, stock: any): Promise<void> {
    const currentPrice = await this.stockManager.fetchStockPrice(stock.symbol);
    if (!currentPrice) return;

    for (const point of stock.points) {
      await this.checkBuyPoint(channel, stock, point, currentPrice);
      await this.checkSellPoint(channel, stock, point, currentPrice);
    }
  }
  
  private async checkBuyPoint(channel: TextChannel, stock: any, point: any, currentPrice: number): Promise<void> {
    if (currentPrice <= point.entry) {
      const diff = ((currentPrice - point.entry) / point.entry * 100).toFixed(1);
      await channel.send(
        `🎯 **Điểm mua đã đạt!**\n` +
        `📈 ${stock.symbol}\n` +
        `💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n` +
        `🟢 Giá mua: ${point.entry.toLocaleString('vi-VN')} (${diff}%)\n` +
        `🔴 Giá bán: ${point.takeProfit.toLocaleString('vi-VN')}`
      );
    }
  }
  
  private async checkSellPoint(channel: TextChannel, stock: any, point: any, currentPrice: number): Promise<void> {
    if (currentPrice >= point.takeProfit) {
      const diff = ((currentPrice - point.entry) / point.entry * 100).toFixed(1);
      await channel.send(
        `🎯 **Điểm bán đã đạt!**\n` +
        `📈 ${stock.symbol}\n` +
        `💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n` +
        `🟢 Giá mua: ${point.entry.toLocaleString('vi-VN')}\n` +
        `🔴 Giá bán: ${point.takeProfit.toLocaleString('vi-VN')} (${diff}%)`
      );
    }
  }
} 