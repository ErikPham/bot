import { Client, TextChannel } from 'discord.js';
import { createDiscordClient } from '../discord/client';
import { EventEmitter } from 'events';
import { getPortfolioDetails } from './service';
import { isBreakTime } from '../utils/time/market-time';

// Events
export const TRACKER_EVENTS = {
  START: 'start',
  STOP: 'stop',
  ERROR: 'error',
  SUMMARY: 'summary'
};

interface TrackingState {
  channelId: string;
  interval: NodeJS.Timeout | null;
}

/**
 * Tạo tracker theo dõi danh mục đầu tư
 */
export function createPortfolioTracker(
  clientOrFactory: Client | ReturnType<typeof createDiscordClient>,
  summaryInterval: number = 1000 * 60 * 5 // 5 phút
) {
  // Dùng factory pattern để tạo một instance có state riêng
  const trackingStates = new Map<string, TrackingState>();
  const eventEmitter = new EventEmitter();
  
  // Lấy client từ tham số hoặc factory
  const getClient = (): Client => {
    if ('client' in clientOrFactory) {
      return clientOrFactory.client;
    }
    return clientOrFactory;
  };
  
  /**
   * Bắt đầu theo dõi kênh
   */
  async function startTracking(channel: TextChannel): Promise<void> {
    console.log(`Bắt đầu theo dõi danh mục đầu tư cho kênh: ${channel.name}`);
    
    // Dừng tracking hiện tại nếu có
    stopTracking(channel.id);
    
    // Tạo interval mới
    const interval = setInterval(async () => {
      try {
        // Kiểm tra nếu thị trường đang nghỉ thì bỏ qua
        if (isBreakTime()) {
          return;
        }
        
        await sendPortfolioSummary(channel);
      } catch (error) {
        console.error(`Lỗi khi theo dõi danh mục đầu tư cho kênh ${channel.name}:`, error);
        eventEmitter.emit(TRACKER_EVENTS.ERROR, { channelId: channel.id, error });
      }
    }, summaryInterval);
    
    // Lưu trạng thái tracking
    trackingStates.set(channel.id, {
      channelId: channel.id,
      interval
    });
    
    eventEmitter.emit(TRACKER_EVENTS.START, { channelId: channel.id });
  }
  
  /**
   * Dừng theo dõi kênh
   */
  function stopTracking(channelId: string): void {
    const state = trackingStates.get(channelId);
    if (state && state.interval) {
      clearInterval(state.interval);
      trackingStates.delete(channelId);
      console.log(`Đã dừng theo dõi danh mục đầu tư cho kênh ID: ${channelId}`);
      eventEmitter.emit(TRACKER_EVENTS.STOP, { channelId });
    }
  }
  
  /**
   * Dừng tất cả các theo dõi
   */
  function stopAllTracking(): void {
    for (const [channelId, state] of trackingStates.entries()) {
      if (state.interval) {
        clearInterval(state.interval);
        console.log(`Đã dừng theo dõi danh mục đầu tư cho kênh ID: ${channelId}`);
        eventEmitter.emit(TRACKER_EVENTS.STOP, { channelId });
      }
    }
    trackingStates.clear();
  }
  
  /**
   * Kiểm tra một kênh đang được theo dõi không
   */
  function isTracking(channelId: string): boolean {
    return trackingStates.has(channelId);
  }
  
  /**
   * Gửi thông báo tổng hợp danh mục đầu tư
   */
  async function sendPortfolioSummary(channel: TextChannel): Promise<void> {
    const client = getClient();
    
    // Tìm kênh 'view' để hiển thị báo cáo
    const channels = await client.channels.cache.filter((ch): ch is TextChannel => 
      ch.type === 0
    );
    const viewChannel = Array.from(channels.values()).find(ch => ch.name === 'view');
    
    if (!viewChannel) {
      console.log('Không tìm thấy kênh view để hiển thị báo cáo');
      return;
    }
    
    // Lấy thông tin danh mục
    const userId = client.user?.id || 'system';
    const details = await getPortfolioDetails(client, userId, channel.id, !isBreakTime());
    
    if (details.stocks.length === 0) {
      console.log(`Không có cổ phiếu nào trong danh mục của kênh ${channel.name}`);
      return;
    }
    
    // Tính toán lợi nhuận trong ngày
    const dailyProfitTotal = details.stocks.reduce((sum, stock) => {
      const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume;
      return sum + dailyProfitPerStock / 1000;
    }, 0);
    
    const dailyProfitPercent = details.totalValue > 0 
      ? (dailyProfitTotal / details.totalValue) * 100 
      : 0;
    
    // Lấy top cổ phiếu biến động mạnh nhất
    const topMovers = [...details.stocks]
      .sort((a, b) => Math.abs(b.previousPercent) - Math.abs(a.previousPercent))
      .slice(0, 3);
    
    // Format message
    const dailyColor = dailyProfitTotal >= 0 ? '🟢' : '🔴';
    const dailySign = dailyProfitTotal >= 0 ? '+' : '';
    
    const profitColor = details.totalProfit >= 0 ? '🟢' : '🔴';
    const profitSign = details.totalProfit >= 0 ? '+' : '';
    
    const formattedMovers = topMovers.map(stock => {
      const isUp = stock.previousPercent >= 0;
      const color = isUp ? '🟢' : '🔴';
      const arrow = isUp ? '↑' : '↓';
      return `${color} ${stock.code}: ${stock.current.toFixed(2)} (${arrow} ${Math.abs(stock.previousPercent).toFixed(1)}%)`;
    }).join('\n');
    
    const message = `📊 **Portfolio ${channel.name}**\n\n` +
      `${dailyColor} **Lãi trong ngày:** ${dailySign}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n` +
      `${profitColor} **Lợi nhuận:** ${profitSign}${details.totalProfit.toLocaleString('vi-VN')} tr (${details.totalProfitPercent.toFixed(1)}%)\n\n` +
      `**Top 3 biến động:**\n${formattedMovers}`;
    
    await viewChannel.send(message);
    
    eventEmitter.emit(TRACKER_EVENTS.SUMMARY, { 
      channelId: channel.id, 
      data: details 
    });
  }
  
  /**
   * Đăng ký event listener
   */
  function on(event: string, listener: (...args: any[]) => void): void {
    eventEmitter.on(event, listener);
  }
  
  /**
   * Gỡ bỏ event listener
   */
  function off(event: string, listener: (...args: any[]) => void): void {
    eventEmitter.off(event, listener);
  }
  
  return {
    startTracking,
    stopTracking,
    stopAllTracking,
    isTracking,
    sendPortfolioSummary,
    on,
    off
  };
}