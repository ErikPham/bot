import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { EventEmitter } from 'events';

// Events
export const CLIENT_EVENTS = {
  READY: 'ready',
  ERROR: 'error',
  DISCONNECTED: 'disconnected'
};

/**
 * Tạo và quản lý client Discord
 */
export function createDiscordClient(token?: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  
  const eventEmitter = new EventEmitter();
  let isReady = false;
  
  // Khởi tạo promise chờ client sẵn sàng
  const readyPromise = new Promise<void>((resolve) => {
    client.once('ready', () => {
      isReady = true;
      eventEmitter.emit(CLIENT_EVENTS.READY);
      resolve();
    });
  });

  // Đăng nhập với token
  async function login(discordToken: string = token || process.env.DISCORD_TOKEN || ''): Promise<boolean> {
    try {
      if (!discordToken) {
        throw new Error('Token Discord không được cung cấp');
      }
      
      await client.login(discordToken);
      return true;
    } catch (error) {
      console.error('Lỗi khi đăng nhập Discord:', error);
      eventEmitter.emit(CLIENT_EVENTS.ERROR, error);
      return false;
    }
  }

  // Đảm bảo client đã sẵn sàng
  async function ensureReady(): Promise<void> {
    if (!isReady) {
      await readyPromise;
    }
  }

  // Đóng kết nối
  async function destroy(): Promise<void> {
    try {
      await client.destroy();
      eventEmitter.emit(CLIENT_EVENTS.DISCONNECTED);
    } catch (error) {
      console.error('Lỗi khi đóng kết nối Discord:', error);
      eventEmitter.emit(CLIENT_EVENTS.ERROR, error);
    }
  }

  // Lấy channel
  async function getChannel(channelId: string): Promise<TextChannel | null> {
    await ensureReady();
    
    try {
      const channel = client.channels.cache.get(channelId) as TextChannel;
      return channel || null;
    } catch (error) {
      console.error('Lỗi khi lấy kênh:', error);
      return null;
    }
  }

  // Lấy tất cả các channel
  async function getAllChannels(): Promise<TextChannel[]> {
    await ensureReady();
    
    try {
      const channels = client.channels.cache.filter((channel): channel is TextChannel => 
        channel.type === 0
      );
      
      return Array.from(channels.values());
    } catch (error) {
      console.error('Lỗi khi lấy danh sách kênh:', error);
      return [];
    }
  }

  // Đăng ký event listener
  function on(event: string, listener: (...args: any[]) => void): void {
    eventEmitter.on(event, listener);
  }

  // Gỡ bỏ event listener
  function off(event: string, listener: (...args: any[]) => void): void {
    eventEmitter.off(event, listener);
  }

  return {
    client,
    isReady: () => isReady,
    login,
    ensureReady,
    destroy,
    getChannel,
    getAllChannels,
    on,
    off
  };
} 