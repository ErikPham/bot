/**
 * Handler for adding a stock to follow list
 */
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { addStockToFollowList } from '../../../follow/service';

/**
 * Xử lý lệnh thêm cổ phiếu vào danh sách theo dõi
 */
export async function handleAddFollow(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const channel = interaction.client.channels.cache.find((channel): channel is TextChannel => 
      channel.type === 0 && channel.name === 'follow'
    );
    if (!channel) {
      await interaction.editReply('Không tìm thấy kênh follow');
      return;
    }

    const channelId = channel.id;
    const symbol = interaction.options.getString('symbol', true);
    const entry = interaction.options.getNumber('entry', true);
    const takeProfit = interaction.options.getNumber('takeprofit', true);
    const stopLoss = interaction.options.getNumber('stoploss', true);
    const volume = interaction.options.getNumber('volume') || 1000;
    const userId = interaction.user.id;

    if (entry <= 0) {
      await interaction.editReply('❌ Giá mua phải lớn hơn 0');
      return;
    }

    if (takeProfit <= entry) {
      await interaction.editReply('❌ Giá mục tiêu phải lớn hơn giá mua');
      return;
    }

    if (stopLoss >= entry) {
      await interaction.editReply('❌ Giá cắt lỗ phải nhỏ hơn giá mua');
      return;
    }

    if (volume <= 0) {
      await interaction.editReply('❌ Khối lượng phải lớn hơn 0');
      return;
    }

    // Thêm cổ phiếu vào danh sách theo dõi
    const point = {
      entry,
      takeProfit,
      stopLoss,
      volume
    };

    const success = await addStockToFollowList(
      interaction.client,
      userId,
      channelId,
      symbol.toUpperCase(),
      point
    );

    if (success) {
      await interaction.editReply(
        `✅ Đã thêm ${symbol.toUpperCase()} vào danh sách theo dõi:\n` +
        `🟢 Giá mua: ${entry.toLocaleString('vi-VN')}\n` +
        `🔴 Giá cắt lỗ: ${stopLoss.toLocaleString('vi-VN')}\n` +
        `📈 Giá mục tiêu: ${takeProfit.toLocaleString('vi-VN')}\n` +
        `📊 Khối lượng: ${volume.toLocaleString('vi-VN')}`
      );
    } else {
      await interaction.editReply('❌ Không thể thêm cổ phiếu vào danh sách theo dõi');
    }
  } catch (error) {
    console.error('Error in handleAddFollow:', error);
    await interaction.editReply('❌ Đã xảy ra lỗi khi thêm cổ phiếu vào danh sách theo dõi');
  }
} 