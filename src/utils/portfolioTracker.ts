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

export class PortfolioTracker {
  private stockManager: StockManager;
  private summaryInterval: number;

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

    // Check lunch break (11:30 - 13:00)
    if (currentTime >= 11.5 && currentTime < 13) {
      return true;
    }

    // Check afternoon break (15:00 - 17:00)
    if (currentTime >= 15 && currentTime < 17) {
      return true;
    }

    // Check weekend
    const day = now.getDay();
    if (day === 0 || day === 6) {
      return true;
    }

    // Check market hours (9:00 - 15:00)
    if (hour < 9 || hour >= 15) {
      return true;
    }

    return false;
  }

  public async startTracking(channel: TextChannel): Promise<void> {
    console.log('Start tracking portfolio for channel: ', channel.name);
    setInterval(async () => {
      try {
        if (this.isBreakTime()) {
          return;
        }
        await this.sendProfitSummary(channel);
      } catch (error) {
        console.error('Error checking portfolio:', error);
      }
    }, this.summaryInterval);
  }

  private async sendProfitSummary(channel: TextChannel): Promise<void> {
    const channels = await this.stockManager.getAllChannels();
    const viewChannel = channels.find((c: any) => c.name === 'view');
    if (!viewChannel) {
      console.log('No view channel found');
      return;
    }

    // Get portfolio details using the same logic as portfolio.ts
    const portfolio = await this.stockManager.getPortfolioDetails(channel.id);
    const stocks = portfolio.stocks;
    if (!stocks || stocks.length === 0) {
      console.log('No stocks found');
      return;
    }

    // Lãi/lỗ trong ngày
    const dailyProfitTotal = stocks.reduce((sum, stock) => {
        const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume
        return sum + dailyProfitPerStock / 1000
      }, 0)
    
    const dailyProfitPercent = (dailyProfitTotal / portfolio.totalValue) * 100

    // Tổng lợi nhuận
    const totalProfit = portfolio.totalProfit
    const totalProfitPercent = portfolio.totalProfitPercent;

    // Top 3 biến động trong ngày (theo % thay đổi so với giá hôm qua)
    const topMovers = [...stocks]
      .sort((a, b) => Math.abs(b.previousPercent) - Math.abs(a.previousPercent))
      .slice(0, 3);

    // Format từng dòng top movers
    const formatMover = (stock: any) => {
      const isUp = stock.previousPercent >= 0;
      const color = isUp ? '🟢' : '🔴';
      const arrow = isUp ? '↑' : '↓';
      return `${color} ${stock.code}: ${stock.current.toFixed(2)} (${arrow} ${Math.abs(stock.previousPercent).toFixed(1)}%)`;
    };

    // Format message
    const dailyColor = dailyProfitTotal >= 0 ? '🟢' : '🔴';
    const profitColor = totalProfit >= 0 ? '🟢' : '🔴';
    const dailySign = dailyProfitTotal >= 0 ? '+' : '';
    const profitSign = totalProfit >= 0 ? '+' : '';

    const message = `📊 **Portfolio ${channel.name}**\n\n` +
      `${dailyColor} **Lãi trong ngày:** ${dailySign}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n` +
      `${profitColor} **Lợi nhuận:** ${profitSign}${totalProfit.toLocaleString('vi-VN')} tr (${totalProfitPercent.toFixed(1)}%)\n\n` +
      `**Top 3 biến động:**\n` +
      topMovers.map(formatMover).join('\n');

    await viewChannel.send(message);
  }
} 