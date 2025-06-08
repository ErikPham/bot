import { Client, TextChannel } from 'discord.js';
import { createDiscordClient } from './discord/client';
import { createFollowListTracker } from './follow/tracker';
import { createPortfolioTracker } from './portfolio/tracker';
import { EventEmitter } from 'events';

// Events
export const SCHEDULER_EVENTS = {
  INITIALIZED: 'INITIALIZED',
  ERROR: 'ERROR',
  STARTED: 'STARTED',
  STOPPED: 'STOPPED',
  DESTROYED: 'DESTROYED'
} as const;

// Type for Discord client
type DiscordClientType = Client | ReturnType<typeof createDiscordClient>;
type SchedulerEventType = typeof SCHEDULER_EVENTS[keyof typeof SCHEDULER_EVENTS];

/**
 * Tạo scheduler điều phối các tracker
 */
export function createScheduler(client?: DiscordClientType) {
  // State của scheduler
  let isInitialized = false;
  const eventEmitter = new EventEmitter();
  
  // Default intervals
  const CHECK_INTERVAL = 1000 * 60 * 2; // 2 phút
  const SUMMARY_INTERVAL = 1000 * 60 * 5; // 5 phút
  
  // Tạo client nếu không được cung cấp
  const discordClient = client 
    ? ('client' in client ? client : createDiscordClient()) 
    : createDiscordClient();
  
  // Khởi tạo các tracker
  const portfolioTracker = createPortfolioTracker(discordClient, SUMMARY_INTERVAL);
  const followListTracker = createFollowListTracker(discordClient, CHECK_INTERVAL);
  
  /**
   * Khởi tạo scheduler
   */
  async function initialize(): Promise<void> {
    if (isInitialized) {
      console.log('Scheduler đã được khởi tạo');
      return;
    }
    
    try {
      // Đảm bảo client đã sẵn sàng
      if ('ensureReady' in discordClient) {
        await discordClient.ensureReady();
      }
      
      isInitialized = true;
      eventEmitter.emit(SCHEDULER_EVENTS.INITIALIZED);
      console.log('Scheduler đã được khởi tạo thành công');
    } catch (error) {
      console.error('Lỗi khi khởi tạo scheduler:', error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Lấy tất cả các kênh từ client
   */
  async function getAllTextChannels(): Promise<TextChannel[]> {
    if ('getAllChannels' in discordClient) {
      return await discordClient.getAllChannels();
    } 
    
    const discordClientInstance = 'client' in discordClient 
      ? (discordClient as ReturnType<typeof createDiscordClient>).client 
      : discordClient as Client;
    
    return Array.from(
      discordClientInstance.channels.cache.filter((ch: any): ch is TextChannel => ch.type === 0).values()
    );
  }
  
  /**
   * Khởi động tất cả các tracker cho tất cả các kênh
   */
  async function startAllTrackers(): Promise<void> {
    if (!isInitialized) {
      throw new Error('Scheduler chưa được khởi tạo. Gọi initialize() trước.');
    }
    
    try {
      // Lấy tất cả các kênh
      const channels = await getAllTextChannels();
      console.log(`Bắt đầu trackers cho ${channels.length} kênh`);
      
      // Khởi động tracker cho từng kênh
      await Promise.all(channels.map(startChannelTracking));
      
      eventEmitter.emit(SCHEDULER_EVENTS.STARTED);
    } catch (error) {
      console.error('Lỗi khi khởi động trackers:', error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Khởi động các tracker cho một kênh cụ thể
   */
  async function startChannelTracking(channel: TextChannel): Promise<void> {
    try {
      console.log(`Bắt đầu tracking cho kênh: ${channel.name}`);
      
      // Khởi động các tracker
      await portfolioTracker.startTracking(channel);
      await followListTracker.startTracking(channel);
      
      eventEmitter.emit(SCHEDULER_EVENTS.STARTED, { channelId: channel.id });
    } catch (error) {
      console.error(`Lỗi khi khởi động tracking cho kênh ${channel.name}:`, error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, { channelId: channel.id, error });
    }
  }
  
  /**
   * Dừng tracking cho một kênh cụ thể
   */
  function stopChannelTracking(channelId: string): void {
    try {
      console.log(`Dừng tracking cho kênh ID: ${channelId}`);
      
      // Dừng các tracker
      portfolioTracker.stopTracking(channelId);
      followListTracker.stopTracking(channelId);
      
      eventEmitter.emit(SCHEDULER_EVENTS.STOPPED, { channelId });
    } catch (error) {
      console.error(`Lỗi khi dừng tracking cho kênh ${channelId}:`, error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, { channelId, error });
    }
  }
  
  /**
   * Dừng tất cả các tracker
   */
  function stopAllTrackers(): void {
    try {
      portfolioTracker.stopAllTracking();
      followListTracker.stopAllTracking();
      eventEmitter.emit(SCHEDULER_EVENTS.STOPPED);
    } catch (error) {
      console.error('Lỗi khi dừng tất cả các tracker:', error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, error);
    }
  }
  
  /**
   * Hủy scheduler và giải phóng tài nguyên
   */
  async function destroy(): Promise<void> {
    try {
      stopAllTrackers();
      
      // Đóng kết nối client nếu chúng ta tạo ra nó
      if (!client && 'destroy' in discordClient) {
        await discordClient.destroy();
      }
      
      isInitialized = false;
      eventEmitter.emit(SCHEDULER_EVENTS.DESTROYED);
      console.log('Scheduler đã được hủy thành công');
    } catch (error) {
      console.error('Lỗi khi hủy scheduler:', error);
      eventEmitter.emit(SCHEDULER_EVENTS.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Đăng ký event listener
   */
  function on(event: SchedulerEventType, listener: (...args: any[]) => void): void {
    eventEmitter.on(event, listener);
  }
  
  /**
   * Gỡ bỏ event listener
   */
  function off(event: SchedulerEventType, listener: (...args: any[]) => void): void {
    eventEmitter.off(event, listener);
  }
  
  // Trả về API public
  return {
    initialize,
    startAllTrackers,
    startChannelTracking,
    stopChannelTracking,
    stopAllTrackers,
    destroy,
    isInitialized: () => isInitialized,
    on,
    off,
    portfolioTracker,
    followListTracker
  };
}

/**
 * Singleton instance cho backwards compatibility
 */
let singleton: ReturnType<typeof createScheduler> | null = null;

export function getScheduler(): ReturnType<typeof createScheduler> {
  if (!singleton) {
    singleton = createScheduler();
  }
  return singleton;
} 