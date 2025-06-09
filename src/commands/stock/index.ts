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
    try {
      // Reply trực tiếp thay vì defer
      await interaction.reply({ content: '⏳ Đang xử lý...' });
      const subcommand = interaction.options.getSubcommand();
      
      // Routing tới handler tương ứng
      switch (subcommand) {
        case 'add':
          await handleAddStock(interaction);
          break;
        case 'list':
          await handleListStocks(interaction);
          break;
        case 'remove':
          await handleRemoveStock(interaction);
          break;
        default:
          await interaction.editReply({ content: 'Lệnh không hợp lệ.' });
      }
    } catch (error) {
      console.error('Error executing stock command:', error);
      try {
        if (interaction.replied) {
          await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh.' });
        } else {
          await interaction.reply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh.' });
        }
      } catch (replyError) {
        console.error('Error sending error response:', replyError);
      }
    }
  },
};

export default stockCommand; 