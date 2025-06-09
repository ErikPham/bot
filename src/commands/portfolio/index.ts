/**
 * Portfolio Command Module
 * 
 * Module quản lý các lệnh liên quan đến danh mục đầu tư
 */
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlePortfolioDisplay } from './handlers/view';

// Định nghĩa command và các tùy chọn
export const portfolioCommand = {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Hiển thị chi tiết danh mục đầu tư')
    .addStringOption(option =>
      option
        .setName('channel')
        .setDescription('Chọn channel để xem portfolio (mặc định là channel hiện tại)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channelOption = interaction.options.getString('channel') || 'current';
    await handlePortfolioDisplay(interaction, channelOption);
  },
};

export default portfolioCommand; 