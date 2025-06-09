/**
 * Handler for listing stocks in follow list
 */
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { getFollowList } from '../../../follow/service';
import { fetchStockPrice } from '../../../api/stock';

/**
 * Xử lý lệnh hiển thị danh sách theo dõi cổ phiếu
 */
export async function handleListFollows(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const channel = interaction.client.channels.cache.find((channel): channel is TextChannel => 
      channel.type === 0 && channel.name === 'follow'
    );
    if (!channel) {
      await interaction.editReply('Không tìm thấy kênh follow');
      return;
    }

    const channelId = channel.id;
    const followList = await getFollowList(
      interaction.client,
      'system',
      channelId,
    );

    if (followList.stocks.length === 0) {
      await interaction.editReply('Bạn chưa có cổ phiếu nào trong danh sách theo dõi.');
      return;
    }

    // Tạo embed để hiển thị thông tin
    const embed = new EmbedBuilder()
      .setTitle('🔍 Danh sách theo dõi cổ phiếu')
      .setColor('#00a6ed')
      .setTimestamp();

    // Lấy giá hiện tại của các cổ phiếu
    for (const stock of followList.stocks) {
      const currentPrice = await fetchStockPrice(stock.symbol);
      
      // Tạo thông tin chi tiết cho mỗi cổ phiếu
      let stockInfo = '';
      
      // Thêm thông tin từng điểm theo dõi
      for (let i = 0; i < stock.points.length; i++) {
        const point = stock.points[i];
        
        // Tính toán các chỉ số
        const entryDiff = currentPrice ? ((currentPrice - point.entry) / point.entry * 100).toFixed(1) : 'N/A';
        const takeProfitDiff = currentPrice ? ((point.takeProfit - currentPrice) / currentPrice * 100).toFixed(1) : 'N/A';
        const stopLossDiff = currentPrice ? ((currentPrice - point.stopLoss) / point.stopLoss * 100).toFixed(1) : 'N/A';
        
        stockInfo += `**Điểm theo dõi ${i + 1}:**\n`;
        stockInfo += `🟢 Giá mua: ${point.entry.toLocaleString('vi-VN')} ${currentPrice ? `(${entryDiff}%)` : ''}\n`;
        stockInfo += `📈 Giá mục tiêu: ${point.takeProfit.toLocaleString('vi-VN')} ${currentPrice ? `(+${takeProfitDiff}%)` : ''}\n`;
        stockInfo += `🔴 Giá cắt lỗ: ${point.stopLoss.toLocaleString('vi-VN')} ${currentPrice ? `(${stopLossDiff}%)` : ''}\n`;
        stockInfo += `📊 Khối lượng: ${point.volume.toLocaleString('vi-VN')}\n\n`;
      }
      
      // Thêm giá hiện tại
      if (currentPrice) {
        stockInfo = `💰 **Giá hiện tại:** ${currentPrice.toLocaleString('vi-VN')}\n\n` + stockInfo;
      }
      
      // Thêm thông tin của cổ phiếu vào embed
      embed.addFields({
        name: `📌 ${stock.symbol} (${stock.points.length} điểm theo dõi)`,
        value: stockInfo,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleListFollows:', error);
    await interaction.editReply('❌ Đã xảy ra lỗi khi lấy thông tin danh sách theo dõi');
  }
} 