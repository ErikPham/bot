/**
 * Handler for removing a stock from portfolio
 */
import { ChatInputCommandInteraction } from 'discord.js';
import { removeStock } from '../../../portfolio/service';

/**
 * Xử lý lệnh xóa cổ phiếu khỏi danh mục
 */
export async function handleRemoveStock(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const symbol = interaction.options.getString('symbol', true);
    
    await removeStock(interaction.client, interaction.user.id, interaction.channelId, symbol);
    await interaction.editReply(`✅ Đã xóa ${symbol} khỏi danh mục`);
  } catch (error) {
    console.error('Error removing stock:', error);
    await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi xóa cổ phiếu khỏi danh mục.' });
  }
} 