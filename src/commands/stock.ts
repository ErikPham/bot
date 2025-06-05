import type { ChatInputCommandInteraction } from 'discord.js'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { StockManager } from '../utils/stockManager'

export default {
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

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const subcommand = interaction.options.getSubcommand()
    const stockManager = new StockManager(interaction.user.id)

    try {
      switch (subcommand) {
        case 'add': {
          const symbol = interaction.options.getString('symbol', true)
          const quantity = interaction.options.getNumber('quantity', true)
          const price = interaction.options.getNumber('price', true)

          await stockManager.addStock(interaction.channelId, symbol, quantity, price)
          await interaction.editReply(`✅ Đã thêm ${symbol} vào danh mục:\n📊 Số lượng: ${quantity.toLocaleString('vi-VN')}\n💰 Giá mua: ${price.toLocaleString('vi-VN')}`)
          break
        }

        case 'list': {
          const portfolio = await stockManager.getPortfolioDetails(interaction.channelId)

          if (portfolio.stocks.length === 0) {
            await interaction.editReply('Bạn chưa có cổ phiếu nào trong danh mục.')
            return
          }

          const embed = new EmbedBuilder()
            .setTitle('📊 Danh mục cổ phiếu')
            .setColor('#0099ff')
            .setTimestamp()

          for (const stock of portfolio.stocks) {
            const priceChange = stock.previousPercent > 0 ? '📈' : stock.previousPercent < 0 ? '📉' : '➡️'
            const priceChangeText = stock.previousPercent !== 0 
              ? `\n${priceChange} Thay đổi: ${stock.previousPercent.toFixed(1)}%`
              : ''

            embed.addFields({
              name: `${stock.code}${priceChangeText}`,
              value: `💰 Giá hiện tại: ${stock.current.toLocaleString('vi-VN')}\n📊 Số lượng: ${stock.volume.toLocaleString('vi-VN')}\n💵 Giá trị: ${stock.marketValue.toLocaleString('vi-VN')} VND\n📈 Lợi nhuận: ${stock.profitPercent.toFixed(1)}% (${stock.profit.toLocaleString('vi-VN')} VND)`,
              inline: false,
            })
          }

          embed.addFields({
            name: '📈 Tổng quan',
            value: `💵 Tổng giá trị: ${portfolio.totalValue.toLocaleString('vi-VN')} VND\n📈 Lợi nhuận: ${portfolio.totalProfitPercent.toFixed(1)}% (${portfolio.totalProfit.toLocaleString('vi-VN')} VND)`,
            inline: false,
          })

          embed.setFooter({ text: `Thị trường ${portfolio.isMarketOpen ? 'đang mở' : 'đã đóng'}` })
          await interaction.editReply({ embeds: [embed] })
          break
        }

        case 'remove': {
          const symbol = interaction.options.getString('symbol', true)
          await stockManager.removeStock(interaction.channelId, symbol)
          await interaction.editReply(`✅ Đã xóa ${symbol} khỏi danh mục`)
          break
        }
      }
    }
    catch (error) {
      console.error(error)
      await interaction.editReply('❌ Đã xảy ra lỗi khi thực hiện lệnh.')
    }
  },
} 