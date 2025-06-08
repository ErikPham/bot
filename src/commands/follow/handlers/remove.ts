/**
 * Handler for removing a stock from follow list
 */
import type { ChatInputCommandInteraction } from 'discord.js';
import { removeStockFromFollowList } from '../../../follow/service';

/**
 * Xử lý lệnh xóa cổ phiếu khỏi danh sách theo dõi
 */
export async function handleRemoveFollow(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const symbol = interaction.options.getString('symbol', true);
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    // Xóa cổ phiếu khỏi danh sách theo dõi
    const success = await removeStockFromFollowList(
      interaction.client,
      userId,
      channelId,
      symbol.toUpperCase()
    );

    if (success) {
      await interaction.editReply(`✅ Đã xóa ${symbol.toUpperCase()} khỏi danh sách theo dõi`);
    } else {
      await interaction.editReply(`❌ Không thể xóa ${symbol.toUpperCase()} khỏi danh sách theo dõi`);
    }
  } catch (error) {
    console.error('Error in handleRemoveFollow:', error);
    await interaction.editReply('❌ Đã xảy ra lỗi khi xóa cổ phiếu khỏi danh sách theo dõi');
  }
} 