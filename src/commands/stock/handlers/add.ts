/**
 * Handler for adding a stock to portfolio
 */
import { ChatInputCommandInteraction } from 'discord.js';
import { addStock } from '../../../portfolio/service';

/**
 * Xử lý lệnh thêm cổ phiếu vào danh mục
 */
export async function handleAddStock(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const symbol = interaction.options.getString('symbol', true);
    const quantity = interaction.options.getNumber('quantity', true);
    const price = interaction.options.getNumber('price', true);
    
    await addStock(interaction.client, interaction.user.id, interaction.channelId, symbol, quantity, price);
    await interaction.editReply(`✅ Đã thêm ${symbol} vào danh mục:\n📊 Số lượng: ${quantity.toLocaleString('vi-VN')}\n💰 Giá mua: ${price.toLocaleString('vi-VN')}`);
  } catch (error) {
    console.error('Error adding stock:', error);
    await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thêm cổ phiếu vào danh mục.' });
  }
} 