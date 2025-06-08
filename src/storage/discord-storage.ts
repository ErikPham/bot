import { Message, TextChannel, Client } from 'discord.js';

// Prefixes cho các loại dữ liệu
export const STORAGE_PREFIX = {
  PORTFOLIO: 'PORTFOLIO_DATA',
  FOLLOW_LIST: 'FOLLOW_LIST_DATA'
};

/**
 * Lấy tin nhắn lưu trữ dữ liệu từ channel
 */
export async function getStorageMessage(
  client: Client, 
  channelId: string,
  userId: string, 
  prefix: string
): Promise<Message | null> {
  try {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Không tìm thấy kênh lưu trữ.');
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    const pattern = new RegExp(`${prefix}_.*_${channelId}:`);
    const storageMessage = messages.find(msg =>
      msg.author.id === client.user?.id && msg.content.match(pattern)
    );

    return storageMessage || null;
  } catch (error) {
    console.error('Lỗi khi lấy tin nhắn lưu trữ:', error);
    return null;
  }
}

/**
 * Lưu dữ liệu vào channel
 */
export async function saveData<T>(
  client: Client,
  channelId: string,
  userId: string,
  prefix: string,
  data: T
): Promise<boolean> {
  try {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Không tìm thấy kênh lưu trữ.');
    }

    const storageMessage = await getStorageMessage(client, channelId, userId, prefix);
    const dataString = `${prefix}_${userId}_${channelId}: ${JSON.stringify(data)}`;

    if (storageMessage) {
      await storageMessage.edit(dataString);
    } else {
      await channel.send(dataString);
    }
    
    return true;
  } catch (error) {
    console.error(`Lỗi khi lưu dữ liệu ${prefix}:`, error);
    return false;
  }
}

/**
 * Lấy dữ liệu từ channel
 */
export async function getData<T>(
  client: Client,
  channelId: string,
  userId: string,
  prefix: string,
  defaultData: T
): Promise<T> {
  try {
    const storageMessage = await getStorageMessage(client, channelId, userId, prefix);

    if (!storageMessage) {
      return defaultData;
    }

    const dataPattern = new RegExp(`${prefix}_.*_\\d+:\\s*`);
    const dataString = storageMessage.content.replace(dataPattern, '');
    return JSON.parse(dataString) as T;
  } catch (error) {
    console.error(`Lỗi khi phân tích dữ liệu ${prefix}:`, error);
    return defaultData;
  }
}

/**
 * Tìm tất cả các channel có dữ liệu lưu trữ
 */
export async function getAllChannelsWithData(
  client: Client,
  userId: string,
  prefix: string
): Promise<string[]> {
  try {
    const channels = client.channels.cache.filter((channel): channel is TextChannel => 
      channel.type === 0
    );
    
    const channelIds: string[] = [];
    
    for (const [id, channel] of channels) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const hasData = messages.some(msg => 
          msg.author.id === client.user?.id && 
          msg.content.includes(`${prefix}_`)
        );
        
        if (hasData) {
          channelIds.push(id);
        }
      } catch (error) {
        console.error(`Lỗi khi kiểm tra kênh ${id}:`, error);
      }
    }
    
    return channelIds;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách kênh có dữ liệu:', error);
    return [];
  }
} 