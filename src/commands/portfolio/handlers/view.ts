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
export async function handlePortfolioDisplay(
  interaction: ChatInputCommandInteraction,
  channelOption: string = 'current'
): Promise<void> {
  const userId = interaction.user.id;

  // Check nếu interaction còn valid và chưa được respond
  if (interaction.replied || interaction.deferred) {
    console.log('Interaction already replied/deferred');
    return;
  }

  try {
    // Reply trực tiếp với loading message
    await interaction.reply({ content: '⏳ Đang tải danh mục đầu tư...' });
    
    // Xử lý theo loại channel
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
    
    // Nếu chưa reply thì reply với error
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Đã xảy ra lỗi khi hiển thị danh mục đầu tư.' });
    } else {
      // Nếu đã reply rồi thì edit reply
      await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi hiển thị danh mục đầu tư.' });
    }
  }
}

/**
 * Hiển thị danh mục từ tất cả các kênh
 */
async function handleAllChannelsPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string
): Promise<void> {
  try {
    // Lấy tất cả các kênh
    const channels = interaction.client.channels.cache.filter(
      channel => channel.type === 0
    );

    if (channels.size === 0) {
      await interaction.editReply({ content: 'Không tìm thấy kênh nào.' });
      return;
    }

    // Lấy danh mục từ mỗi kênh
    const portfolios = [];
    let errorCount = 0;
    
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
        errorCount++;
        console.error(`Error getting portfolio for channel ${channel.id}:`, error);
      }
    }

    if (portfolios.length === 0) {
      let message = 'Bạn chưa có danh mục đầu tư nào.';
      if (errorCount > 0) {
        message += ` (${errorCount} lỗi khi truy xuất dữ liệu)`;
      }
      await interaction.editReply({ content: message });
      return;
    }

    // Kết hợp các danh mục
    const combinedPortfolio = combinePortfolios(portfolios);
    
    // Format và hiển thị
    const formattedPortfolio = formatPortfolio(combinedPortfolio, 'Tất cả các kênh');
    await interaction.editReply(formattedPortfolio);
  } catch (error) {
    console.error('Error handling all channels portfolio:', error);
    await interaction.editReply({ content: '❌ Lỗi khi lấy danh mục từ tất cả kênh.' });
  }
}

/**
 * Hiển thị danh mục của kênh hiện tại
 */
async function handleCurrentChannelPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string
): Promise<void> {
  try {
    const portfolio = await getPortfolioDetails(
      interaction.client,
      userId,
      interaction.channelId,
      isMarketOpen()
    );

    if (portfolio.stocks.length === 0) {
      await interaction.editReply({ content: 'Danh mục của bạn hiện đang trống.' });
      return;
    }

    const formattedPortfolio = formatPortfolio(portfolio, 'Kênh hiện tại');
    await interaction.editReply(formattedPortfolio);
  } catch (error) {
    console.error('Error handling current channel portfolio:', error);
    await interaction.editReply({ content: '❌ Lỗi khi lấy danh mục kênh hiện tại.' });
  }
}

/**
 * Hiển thị danh mục của kênh có tên cụ thể
 */
async function handleNamedChannelPortfolio(
  interaction: ChatInputCommandInteraction,
  userId: string,
  channelName: string
): Promise<void> {
  try {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({ content: 'Lệnh này chỉ có thể sử dụng trong server.' });
      return;
    }

    // Tìm kênh theo tên
    let targetChannel = guild.channels.cache.find(
      channel => channel.name.toLowerCase() === channelName.toLowerCase()
    );

    // Nếu không tìm thấy, thử tìm theo ID
    if (!targetChannel) {
      targetChannel = guild.channels.cache.get(channelName);
    }

    // Nếu vẫn không tìm thấy, thông báo lỗi
    if (!targetChannel) {
      await interaction.editReply({ content: `Không tìm thấy kênh có tên "${channelName}".` });
      return;
    }
    
    const portfolio = await getPortfolioDetails(
      interaction.client,
      userId,
      targetChannel.id,
      isMarketOpen()
    );

    if (portfolio.stocks.length === 0) {
      await interaction.editReply({ content: `Danh mục trong kênh #${targetChannel.name} hiện đang trống.` });
      return;
    }

    const formattedPortfolio = formatPortfolio(portfolio, `Kênh #${targetChannel.name}`);
    await interaction.editReply(formattedPortfolio);
  } catch (error) {
    console.error('Error handling named channel portfolio:', error);
    await interaction.editReply({ content: `❌ Lỗi khi lấy danh mục kênh "${channelName}".` });
  }
} 