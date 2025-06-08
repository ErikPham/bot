/**
 * Follow Command Module
 * 
 * Module quản lý các lệnh liên quan đến danh sách theo dõi cổ phiếu
 */
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handleAddFollow } from './handlers/add';
import { handleListFollows } from './handlers/list';
import { handleRemoveFollow } from './handlers/remove';

// Định nghĩa command và các subcommand
export const followCommand = {
  data: new SlashCommandBuilder()
    .setName('follow')
    .setDescription('Quản lý danh sách theo dõi cổ phiếu')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Thêm cổ phiếu vào danh sách theo dõi')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Mã cổ phiếu')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('entry')
            .setDescription('Giá mua')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('takeprofit')
            .setDescription('Giá mục tiêu')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('stoploss')
            .setDescription('Giá cắt lỗ')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('volume')
            .setDescription('Khối lượng')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Xem danh sách theo dõi'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Xóa cổ phiếu khỏi danh sách theo dõi')
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
          return handleAddFollow(interaction);
        case 'list':
          return handleListFollows(interaction);
        case 'remove':
          return handleRemoveFollow(interaction);
        default:
          await interaction.editReply('Lệnh không hợp lệ.');
      }
    } catch (error) {
      console.error('Error executing follow command:', error);
      await interaction.editReply('❌ Đã xảy ra lỗi khi thực hiện lệnh.');
    }
  },
};

export default followCommand; 