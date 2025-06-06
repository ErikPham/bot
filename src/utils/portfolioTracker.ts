import { TextChannel } from 'discord.js'
import { StockManager } from './stockManager';

interface StockProfit {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  dailyChange: number;
  totalChange: number;
  lastUpdate: Date;
  volume: number;
  marketValue: number;
  investValue: number;
}

interface TrackingState {
  channelId: string;
  interval: NodeJS.Timeout | null;
}

export class PortfolioTracker {
  private stockManager: StockManager;
  private summaryInterval: number;
  private trackingStates: Map<string, TrackingState> = new Map();

  constructor(stockManager: StockManager, summaryInterval: number) {
    this.stockManager = stockManager;
    this.summaryInterval = summaryInterval;
  }

  private isBreakTime(): boolean {
    const timeString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh"
    });
    const now = new Date(timeString);
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hour + minutes / 60;
    const day = now.getDay();

    // Check weekend (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) {
      return true;
    }

    // Check market hours (9:00 - 15:00)
    if (hour < 9 || hour >= 15) {
      return true;
    }

    // Check lunch break (11:30 - 13:00)
    if (currentTime >= 11.5 && currentTime < 13) {
      return true;
    }

    return false;
  }

  public async startTracking(channel: TextChannel): Promise<void> {
    console.log('Start tracking portfolio for channel: ', channel.name);
    
    // Stop existing tracking if it exists
    this.stopTracking(channel.id);
    
    // Create new tracking state
    const interval = setInterval(async () => {
      try {
        if (this.isBreakTime()) {
          return;
        }
        await this.sendProfitSummary(channel);
      } catch (error) {
        console.error(`Error checking portfolio for channel ${channel.name}:`, error);
      }
    }, this.summaryInterval);
    
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
      console.log(`Stopped portfolio tracking for channel ID: ${channelId}`);
    }
  }
  
  public stopAllTracking(): void {
    for (const [channelId, state] of this.trackingStates.entries()) {
      if (state.interval) {
        clearInterval(state.interval);
        console.log(`Stopped portfolio tracking for channel ID: ${channelId}`);
      }
    }
    this.trackingStates.clear();
  }

  private async findViewChannel(): Promise<TextChannel | null> {
    const channels = await this.stockManager.getAllChannels();
    const viewChannel = channels.find((c) => c.name === 'view');
    
    if (!viewChannel) {
      console.log('No view channel found');
    }
    
    return viewChannel || null;
  }

  private async sendProfitSummary(channel: TextChannel): Promise<void> {
    const viewChannel = await this.findViewChannel();
    if (!viewChannel) {
      return;
    }

    // Get portfolio details
    const portfolio = await this.stockManager.getPortfolioDetails(channel.id);
    const { stocks, totalValue, totalProfit, totalProfitPercent } = portfolio;
    
    if (!stocks || stocks.length === 0) {
      console.log(`No stocks found for channel ${channel.name}`);
      return;
    }

    // Calculate daily profit
    const dailyProfitTotal = this.calculateDailyProfit(stocks);
    const dailyProfitPercent = totalValue > 0 ? (dailyProfitTotal / totalValue) * 100 : 0;

    // Get top movers
    const topMovers = this.getTopMovers(stocks);

    // Format and send message
    const message = this.formatSummaryMessage(
      channel.name,
      dailyProfitTotal,
      dailyProfitPercent,
      totalProfit,
      totalProfitPercent,
      topMovers
    );

    await viewChannel.send(message);
  }
  
  private calculateDailyProfit(stocks: any[]): number {
    return stocks.reduce((sum, stock) => {
      const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume;
      return sum + dailyProfitPerStock / 1000;
    }, 0);
  }
  
  private getTopMovers(stocks: any[], count: number = 3): any[] {
    return [...stocks]
      .sort((a, b) => Math.abs(b.previousPercent) - Math.abs(a.previousPercent))
      .slice(0, count);
  }
  
  private formatSummaryMessage(
    channelName: string, 
    dailyProfitTotal: number, 
    dailyProfitPercent: number,
    totalProfit: number,
    totalProfitPercent: number,
    topMovers: any[]
  ): string {
    // Format daily profit
    const dailyColor = dailyProfitTotal >= 0 ? '🟢' : '🔴';
    const dailySign = dailyProfitTotal >= 0 ? '+' : '';
    
    // Format total profit
    const profitColor = totalProfit >= 0 ? '🟢' : '🔴';
    const profitSign = totalProfit >= 0 ? '+' : '';
    
    // Format top movers
    const formattedMovers = topMovers.map(this.formatMover).join('\n');
    
    return `📊 **Portfolio ${channelName}**\n\n` +
      `${dailyColor} **Lãi trong ngày:** ${dailySign}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n` +
      `${profitColor} **Lợi nhuận:** ${profitSign}${totalProfit.toLocaleString('vi-VN')} tr (${totalProfitPercent.toFixed(1)}%)\n\n` +
      `**Top 3 biến động:**\n${formattedMovers}`;
  }
  
  private formatMover(stock: any): string {
    const isUp = stock.previousPercent >= 0;
    const color = isUp ? '🟢' : '🔴';
    const arrow = isUp ? '↑' : '↓';
    return `${color} ${stock.code}: ${stock.current.toFixed(2)} (${arrow} ${Math.abs(stock.previousPercent).toFixed(1)}%)`;
  }
} 