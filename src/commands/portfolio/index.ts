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
        .setRequired(false)
        .addChoices(
          { name: 'Tất cả', value: 'all' },
          { name: 'Hiện tại', value: 'current' }
        )
    ),

  // Command handler
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      // Gọi handler
      await handlePortfolioDisplay(interaction);
    } catch (error) {
      console.error('Error executing portfolio command:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi hiển thị danh mục đầu tư.');
    }
  },
};

export default portfolioCommand; 