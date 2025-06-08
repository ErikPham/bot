/**
 * Handler for removing a stock from portfolio
 */
import { ChatInputCommandInteraction } from 'discord.js';
import { removeStock } from '../../../portfolio/service';

/**
 * Xử lý lệnh xóa cổ phiếu khỏi danh mục
 */
export async function handleRemoveStock(interaction: ChatInputCommandInteraction): Promise<void> {
  const symbol = interaction.options.getString('symbol', true);
  
  await removeStock(interaction.client, interaction.user.id, interaction.channelId, symbol);
  await interaction.editReply(`✅ Đã xóa ${symbol} khỏi danh mục`);
} 