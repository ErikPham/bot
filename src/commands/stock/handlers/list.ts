/**
 * Handler for listing stocks in portfolio
 */
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getPortfolioDetails } from '../../../portfolio/service';
import { isMarketOpen } from '../../../utils/time/market-time';

/**
 * Xử lý lệnh hiển thị danh sách cổ phiếu trong danh mục
 */
export async function handleListStocks(interaction: ChatInputCommandInteraction): Promise<void> {
  const portfolio = await getPortfolioDetails(
    interaction.client, 
    interaction.user.id, 
    interaction.channelId,
    isMarketOpen()
  );

  if (portfolio.stocks.length === 0) {
    await interaction.editReply('Bạn chưa có cổ phiếu nào trong danh mục.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 Danh mục cổ phiếu')
    .setColor('#0099ff')
    .setTimestamp();

  for (const stock of portfolio.stocks) {
    const priceChange = stock.previousPercent > 0 ? '📈' : stock.previousPercent < 0 ? '📉' : '➡️';
    const priceChangeText = stock.previousPercent !== 0 
      ? `\n${priceChange} Thay đổi: ${stock.previousPercent.toFixed(1)}%`
      : '';

    embed.addFields({
      name: `${stock.code}${priceChangeText}`,
      value: `💰 Giá hiện tại: ${stock.current.toLocaleString('vi-VN')}\n` +
             `📊 Số lượng: ${stock.volume.toLocaleString('vi-VN')}\n` +
             `💵 Giá trị: ${stock.marketValue.toLocaleString('vi-VN')} VND\n` +
             `📈 Lợi nhuận: ${stock.profitPercent.toFixed(1)}% (${stock.profit.toLocaleString('vi-VN')} VND)`,
      inline: false,
    });
  }

  embed.addFields({
    name: '📈 Tổng quan',
    value: `💵 Tổng giá trị: ${portfolio.totalValue.toLocaleString('vi-VN')} VND\n` +
           `📈 Lợi nhuận: ${portfolio.totalProfitPercent.toFixed(1)}% (${portfolio.totalProfit.toLocaleString('vi-VN')} VND)`,
    inline: false,
  });

  embed.setFooter({ text: `Thị trường ${portfolio.isMarketOpen ? 'đang mở' : 'đã đóng'}` });
  await interaction.editReply({ embeds: [embed] });
} 