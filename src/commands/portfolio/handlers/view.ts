/**
 * Handler for displaying portfolio
 */
import type { ChatInputCommandInteraction } from 'discord.js';
import { getPortfolioDetails } from '../../../portfolio/service';
import { formatPortfolio, combinePortfolios } from '../utils/portfolio-formatter';
import { isMarketOpen } from '../../../utils/time/market-time';

/**
 * Xử lý lệnh hiển thị danh mục đầu tư
 */
export async function handlePortfolioDisplay(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.user.id;
  const channelOption = interaction.options.getString('channel') || 'current';

  try {
    switch (channelOption) {
      case 'all':
        await handleAllChannelsPortfolio(interaction, userId);
        break;
      case 'current':
        await handleCurrentChannelPortfolio(interaction, userId);
        break;
      default:
        await handleNamedChannelPortfolio(interaction, userId, channelOption);
        break;
    }
  } catch (error) {
    console.error('Error in handlePortfolioDisplay:', error);
    await interaction.editReply('❌ Đã xảy ra lỗi khi hiển thị danh mục đầu tư.');
  }
}

/**
 * Hiển thị danh mục từ tất cả các kênh
 */
async function handleAllChannelsPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string
): Promise<void> {
  // Lấy tất cả các kênh
  const channels = interaction.client.channels.cache.filter(
    channel => channel.type === 0
  );

  if (channels.size === 0) {
    await interaction.editReply('Không tìm thấy kênh nào.');
    return;
  }

  // Lấy danh mục từ mỗi kênh
  const portfolios = [];
  for (const [_, channel] of channels) {
    try {
      const portfolio = await getPortfolioDetails(
        interaction.client,
        userId,
        channel.id,
        isMarketOpen()
      );
      
      if (portfolio.stocks.length > 0) {
        portfolios.push(portfolio);
      }
    } catch (error) {
      console.error(`Error getting portfolio for channel ${channel.id}:`, error);
    }
  }

  if (portfolios.length === 0) {
    await interaction.editReply('Bạn chưa có danh mục đầu tư nào.');
    return;
  }

  // Kết hợp các danh mục
  const combinedPortfolio = combinePortfolios(portfolios);
  
  // Format và hiển thị
  const formattedPortfolio = formatPortfolio(combinedPortfolio, 'Tất cả các kênh');
  await interaction.editReply(formattedPortfolio);
}

/**
 * Hiển thị danh mục của kênh hiện tại
 */
async function handleCurrentChannelPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string
): Promise<void> {
  const portfolio = await getPortfolioDetails(
    interaction.client,
    userId,
    interaction.channelId,
    isMarketOpen()
  );

  if (portfolio.stocks.length === 0) {
    await interaction.editReply('Danh mục của bạn hiện đang trống.');
    return;
  }

  const formattedPortfolio = formatPortfolio(portfolio, 'Kênh hiện tại');
  await interaction.editReply(formattedPortfolio);
}

/**
 * Hiển thị danh mục của kênh có tên cụ thể
 */
async function handleNamedChannelPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string,
  channelName: string
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply('Lệnh này chỉ có thể sử dụng trong server.');
    return;
  }

  // Tìm kênh theo tên
  const targetChannel = guild.channels.cache.find(
    channel => channel.name.toLowerCase() === channelName.toLowerCase()
  );

  if (!targetChannel) {
    await interaction.editReply(`Không tìm thấy kênh có tên "${channelName}".`);
    return;
  }

  const portfolio = await getPortfolioDetails(
    interaction.client,
    userId,
    targetChannel.id,
    isMarketOpen()
  );

  if (portfolio.stocks.length === 0) {
    await interaction.editReply(`Danh mục trong kênh #${targetChannel.name} hiện đang trống.`);
    return;
  }

  const formattedPortfolio = formatPortfolio(portfolio, `Kênh #${targetChannel.name}`);
  await interaction.editReply(formattedPortfolio);
} 