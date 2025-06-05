import type { ChatInputCommandInteraction } from 'discord.js'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { StockManager } from '../utils/stockManager'
import { Scheduler } from '../utils/scheduler'

export default {
  data: new SlashCommandBuilder()
    .setName('follow')
    .setDescription('Quản lý danh sách theo dõi cổ phiếu')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Thêm điểm theo dõi')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Mã cổ phiếu')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('buy_price')
            .setDescription('Giá mua')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('sell_price')
            .setDescription('Giá bán')
            .setRequired(true)))
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

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const subcommand = interaction.options.getSubcommand()
    const stockManager = new StockManager(interaction.user.id)
    const scheduler = Scheduler.getInstance()

    try {
      switch (subcommand) {
        case 'add': {
          const symbol = interaction.options.getString('symbol', true)
          const buyPrice = interaction.options.getNumber('buy_price', true)
          const sellPrice = interaction.options.getNumber('sell_price', true)

          await stockManager.addFollowPoint(interaction.channelId, symbol, buyPrice, sellPrice)
          await scheduler.startPriceCheck(interaction.channelId)
          await interaction.editReply(`✅ Đã thêm điểm theo dõi cho ${symbol}:\n🟢 Mua: ${buyPrice.toLocaleString('vi-VN')}\n🔴 Bán: ${sellPrice.toLocaleString('vi-VN')}\n\nBot sẽ tự động thông báo khi giá đạt điểm mua/bán.`)
          break
        }

        case 'list': {
          const followList = await stockManager.getFollowList(interaction.channelId)

          if (followList.stocks.length === 0) {
            await interaction.editReply('Bạn chưa có cổ phiếu nào trong danh sách theo dõi.')
            return
          }

          const embed = new EmbedBuilder()
            .setTitle('📊 Danh sách điểm mua/bán đang theo dõi')
            .setColor('#0099ff')
            .setTimestamp()

          for (const stock of followList.stocks) {
            const currentPrice = await stockManager.fetchStockPrice(stock.symbol)
            const priceInfo = currentPrice 
              ? `\n💰 Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}`
              : '\n⚠️ Không thể lấy giá hiện tại'

            const pointsText = stock.points.map((point, index) => {
              const buyDiff = currentPrice ? ((currentPrice - point.buyPrice) / point.buyPrice * 100).toFixed(1) : '?'
              const sellDiff = currentPrice ? ((point.sellPrice - currentPrice) / currentPrice * 100).toFixed(1) : '?'
              return `${index + 1}. 🟢 Mua: ${point.buyPrice.toLocaleString('vi-VN')} (${buyDiff}%) - 🔴 Bán: ${point.sellPrice.toLocaleString('vi-VN')} (${sellDiff}%)`
            }).join('\n')

            embed.addFields({
              name: `📈 ${stock.symbol}${priceInfo}`,
              value: pointsText,
              inline: false,
            })
          }

          embed.setFooter({ text: 'Sử dụng /follow remove symbol:<mã> để xóa cổ phiếu khỏi danh sách theo dõi' })
          await interaction.editReply({ embeds: [embed] })
          break
        }

        case 'remove': {
          const symbol = interaction.options.getString('symbol', true)
          const success = await stockManager.removeFollowPoint(interaction.channelId, symbol)
          if (success) {
            await interaction.editReply(`✅ Đã xóa ${symbol} khỏi danh sách theo dõi`)
          } else {
            await interaction.editReply('❌ Không tìm thấy cổ phiếu trong danh sách theo dõi.')
          }
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