import type { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import { StockManager } from '../utils/stockManager'

export default {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Thêm cổ phiếu vào danh sách theo dõi')
    .addStringOption(option =>
      option.setName('symbol')
        .setDescription('Mã cổ phiếu cần thêm')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('quantity')
        .setDescription('Số lượng cổ phiếu')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Giá mua')
        .setRequired(true)),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply()

    const symbol = interaction.options.get('symbol')?.value as string
    const quantity = interaction.options.get('quantity')?.value as number
    const price = interaction.options.get('price')?.value as number

    const stockManager = new StockManager(interaction.user.id)

    try {
      await stockManager.addStock(interaction.channelId, symbol, quantity, price)
      await interaction.editReply(`Đã thêm ${quantity} cổ phiếu ${symbol} với giá ${price} vào danh sách theo dõi.`)
    }
    catch (error) {
      console.error(error)
      await interaction.editReply('Đã xảy ra lỗi khi thêm cổ phiếu.')
    }
  },
}
