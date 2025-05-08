import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { StockManager } from '../utils/stockManager';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Xóa cổ phiếu khỏi danh sách theo dõi')
    .addStringOption(option => 
      option.setName('symbol')
        .setDescription('Mã cổ phiếu cần xóa')
        .setRequired(true)),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    
    const symbol = interaction.options.get('symbol')?.value as string;
    
    const stockManager = new StockManager(interaction.user.id);
    
    try {
      await stockManager.removeStock(interaction.channelId, symbol);
      await interaction.editReply(`Đã xóa cổ phiếu ${symbol} khỏi danh sách theo dõi.`);
    } catch (error) {
      console.error(error);
      await interaction.editReply('Đã xảy ra lỗi khi xóa cổ phiếu hoặc không tìm thấy cổ phiếu này trong danh sách.');
    }
  },
};