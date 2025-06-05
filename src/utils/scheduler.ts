import { TextChannel } from 'discord.js';
import { StockManager } from './stockManager';

export class Scheduler {
  private static instance: Scheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private stockManager: StockManager;

  private constructor() {
    this.stockManager = new StockManager('system');
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  startProfitScheduler(client: any) {
    console.log('Starting profit scheduler...');
    
    const sendProfitUpdate = async () => {
      try {
        console.log('Running profit update...');
        
        // Check if market is open
        if (!this.stockManager.isMarketOpen()) {
          console.log('Market is closed, skipping update');
          return;
        }

        // Find #view channel
        const viewChannel = client.channels.cache.find(
          (channel: any) => channel.name === 'view'
        );

        if (!viewChannel) {
          console.error('Could not find #view channel');
          return;
        }

        // Get all channels that have stock data
        const channelsWithData = await this.stockManager.getAllChannelsWithData();
        console.log('Channels with data:', channelsWithData);
        
        if (channelsWithData.length === 0) {
          console.log('No channels with stock data found');
          return;
        }

        // Process each channel separately
        for (const channelId of channelsWithData) {
          try {
            const channel = client.channels.cache.get(channelId) as TextChannel;
            if (!channel) {
              console.error(`Could not find channel ${channelId}`);
              continue;
            }

            const portfolio = await this.stockManager.getPortfolioDetails(channelId);
            if (portfolio.stocks.length === 0) {
              continue;
            }

            // Sort stocks by absolute percentage change
            const sortedStocks = [...portfolio.stocks].sort((a, b) => 
              Math.abs(b.previousPercent) - Math.abs(a.previousPercent)
            );

            // Get top 3 most volatile stocks
            const topStocks = sortedStocks.slice(0, 3);

            // Format message for top stocks
            let message = `📊 **Portfolio ${channel.name}**\n\n`;

            // Calculate daily profit/loss
            const dailyProfitTotal = portfolio.stocks.reduce((sum, stock) => {
              const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume;
              return sum + dailyProfitPerStock / 1000; // Convert to millions
            }, 0);

            const dailyProfitPercent = (dailyProfitTotal / portfolio.totalValue) * 100;

            // Add daily profit/loss
            message += `${dailyProfitTotal >= 0 ? '🟢' : '🔴'} **Lãi trong ngày:** ${dailyProfitTotal >= 0 ? '+' : ''}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n`;

            // Add total profit
            message += `${portfolio.totalProfit >= 0 ? '🟢' : '🔴'} **Lợi nhuận:** ${portfolio.totalProfit >= 0 ? '+' : ''}${portfolio.totalProfit.toLocaleString('vi-VN')} tr (${portfolio.totalProfitPercent.toFixed(1)}%)\n\n`;

            // Add top 3 volatile stocks
            message += '**Top 3 biến động:**\n';
            for (const stock of topStocks) {
              const changeSign = stock.previousPercent >= 0 ? '🟢' : '🔴';
              const changeSymbol = stock.previousPercent >= 0 ? '↑' : '↓';
              message += `${changeSign} ${stock.code}: ${stock.current.toFixed(2)} (${changeSymbol} ${Math.abs(stock.previousPercent).toFixed(1)}%)\n`;
            }

            // Add update time
            const timeString = new Date().toLocaleString("en-US", {
              timeZone: "Asia/Ho_Chi_Minh"
            });
            message += `\nCập nhật lúc: ${new Date(timeString).toLocaleTimeString('vi-VN')}`;

            await viewChannel.send(message);
          } catch (error) {
            console.error(`Error processing channel ${channelId}:`, error);
          }
        }
        
        console.log('Profit update sent successfully');
      } catch (error) {
        console.error('Error in profit scheduler:', error);
      }
    };

    // Run every 5 minutes
    const timer = setInterval(sendProfitUpdate, 5 * 60 * 1000);
    this.timers.set('profit', timer);
    
    // Run immediately on start
    sendProfitUpdate();
  }

  stopProfitScheduler() {
    const timer = this.timers.get('profit');
    if (timer) {
      clearInterval(timer);
      this.timers.delete('profit');
    }
  }

  stopAll() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.stockManager.destroy();
  }
} 