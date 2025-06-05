import { TextChannel, Client } from 'discord.js';
import { StockManager } from './stockManager';

export class Scheduler {
  private static instance: Scheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private stockManager: StockManager;
  private checkInterval = 60000; // 1 phút
  private client: Client | null = null;

  private constructor() {
    this.stockManager = new StockManager('system');
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public startProfitScheduler(client: Client): void {
    this.client = client;
    // Start checking prices for all channels
    setInterval(async () => {
      try {
        // Skip if it's break time
        if (this.isBreakTime()) {
          return;
        }

        const channels = await this.stockManager.getAllChannels();
        for (const channel of channels) {
          await this.startPriceCheck(channel.id);
        }
      } catch (error) {
        console.error('Error in profit scheduler:', error);
      }
    }, this.checkInterval);
  }

  private isBreakTime(): boolean {
    const timeString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh"
    });
    const now = new Date(timeString);
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hour + minutes / 60;

    // Check lunch break (11:30 - 13:00)
    if (currentTime >= 11.5 && currentTime < 13) {
      return true;
    }

    // Check afternoon break (15:00 - 17:00)
    if (currentTime >= 15 && currentTime < 17) {
      return true;
    }

    return false;
  }

  public async startPriceCheck(channelId: string): Promise<void> {
    if (this.timers.has(channelId)) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        // Skip if it's break time
        if (this.isBreakTime()) {
          return;
        }

        const channel = await this.stockManager.getChannel(channelId);
        if (!channel) {
          this.stopPriceCheck(channelId);
          return;
        }

        const followList = await this.stockManager.getFollowList(channelId);
        if (followList.stocks.length === 0) {
          return;
        }

        for (const stock of followList.stocks) {
          const currentPrice = await this.stockManager.fetchStockPrice(stock.symbol);
          if (!currentPrice) continue;

          for (const point of stock.points) {
            // Kiểm tra điểm mua
            if (currentPrice <= point.buyPrice) {
              const diff = ((currentPrice - point.buyPrice) / point.buyPrice * 100).toFixed(1);
              await channel.send(`🎯 **Điểm mua đã đạt!**\n📈 ${stock.symbol}\n💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n🟢 Giá mua: ${point.buyPrice.toLocaleString('vi-VN')} (${diff}%)\n🔴 Giá bán: ${point.sellPrice.toLocaleString('vi-VN')}`);
            }
            // Kiểm tra điểm bán
            else if (currentPrice >= point.sellPrice) {
              const diff = ((currentPrice - point.sellPrice) / point.sellPrice * 100).toFixed(1);
              await channel.send(`🎯 **Điểm bán đã đạt!**\n📈 ${stock.symbol}\n💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}\n🟢 Giá mua: ${point.buyPrice.toLocaleString('vi-VN')}\n🔴 Giá bán: ${point.sellPrice.toLocaleString('vi-VN')} (${diff}%)`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking prices:', error);
      }
    }, this.checkInterval);

    this.timers.set(channelId, timer);
  }

  public stopPriceCheck(channelId: string): void {
    const timer = this.timers.get(channelId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(channelId);
    }
  }

  public async destroy(): Promise<void> {
    for (const [channelId, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    await this.stockManager.destroy();
  }
} 