/**
 * Stock Command Module
 * 
 * Module quản lý các lệnh liên quan đến chứng khoán
 */
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handleAddStock } from './handlers/add';
import { handleListStocks } from './handlers/list';
import { handleRemoveStock } from './handlers/remove';

// Định nghĩa command và các subcommand
export const stockCommand = {
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Quản lý danh mục cổ phiếu')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Thêm cổ phiếu vào danh mục')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Mã cổ phiếu')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('quantity')
            .setDescription('Số lượng')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('price')
            .setDescription('Giá mua')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Xem danh mục cổ phiếu'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Xóa cổ phiếu khỏi danh mục')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Mã cổ phiếu cần xóa')
            .setRequired(true))),

  // Command handler
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Routing tới handler tương ứng
      switch (subcommand) {
        case 'add':
          return handleAddStock(interaction);
        case 'list':
          return handleListStocks(interaction);
        case 'remove':
          return handleRemoveStock(interaction);
        default:
          await interaction.editReply('Lệnh không hợp lệ.');
      }
    } catch (error) {
      console.error('Error executing stock command:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi thực hiện lệnh.');
    }
  },
};

export default stockCommand; 