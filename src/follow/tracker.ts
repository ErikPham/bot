import { Client, TextChannel } from 'discord.js';
import { createDiscordClient } from '../discord/client';
import { getFollowList, checkStockPrice } from './service';
import { EventEmitter } from 'events';

// Events
export const TRACKER_EVENTS = {
  START: 'start',
  STOP: 'stop',
  ERROR: 'error',
  ALERT: 'alert'
};

interface TrackingState {
  channelId: string;
  interval: NodeJS.Timeout | null;
}

/**
 * Tạo tracker theo dõi danh sách cổ phiếu
 */
export function createFollowListTracker(
  clientOrFactory: Client | ReturnType<typeof createDiscordClient>,
  checkInterval: number = 1000 * 60 * 2 // 2 phút
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
    console.log(`Bắt đầu theo dõi danh sách cổ phiếu cho kênh: ${channel.name}`);
    
    // Dừng tracking hiện tại nếu có
    stopTracking(channel.id);
    
    // Tạo interval mới
    const interval = setInterval(async () => {
      try {
        await checkFollowList(channel.id);
      } catch (error) {
        console.error(`Lỗi khi kiểm tra danh sách theo dõi cho kênh ${channel.name}:`, error);
        eventEmitter.emit(TRACKER_EVENTS.ERROR, { channelId: channel.id, error });
      }
    }, checkInterval);
    
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
      console.log(`Đã dừng theo dõi danh sách cổ phiếu cho kênh ID: ${channelId}`);
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
        console.log(`Đã dừng theo dõi danh sách cổ phiếu cho kênh ID: ${channelId}`);
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
   * Kiểm tra danh sách theo dõi và gửi cảnh báo nếu cần
   */
  async function checkFollowList(channelId: string): Promise<void> {
    const client = getClient();
    const channel = await client.channels.fetch(channelId) as TextChannel;
    
    if (!channel) {
      console.log(`Không tìm thấy kênh ${channelId}, dừng theo dõi`);
      stopTracking(channelId);
      return;
    }
    
    const userId = client.user?.id || 'system';
    const followList = await getFollowList(client, userId, channelId);
    
    if (followList.stocks.length === 0) {
      return;
    }
    
    for (const stock of followList.stocks) {
      await checkStockPrice(channel, stock);
    }
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
    on,
    off
  };
} 