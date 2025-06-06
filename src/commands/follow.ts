import type { ChatInputCommandInteraction, TextChannel } from 'discord.js'
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
          option.setName('entry')
            .setDescription('Giá mua (entry)')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('take_profit')
            .setDescription('Giá chốt lời (take profit)')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('stop_loss')
            .setDescription('Giá cắt lỗ (stop loss)')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('volume')
            .setDescription('Khối lượng (volume)')
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
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('entry')
            .setDescription('Entry muốn xóa (nếu không nhập sẽ xóa hết)')
            .setRequired(false))),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const subcommand = interaction.options.getSubcommand()
    const stockManager = new StockManager(interaction.user.id)
    const scheduler = Scheduler.getInstance()

    try {
      switch (subcommand) {
        case 'add': {
          const symbol = interaction.options.getString('symbol', true)
          const entry = interaction.options.getNumber('entry', true)
          const takeProfit = interaction.options.getNumber('take_profit', true)
          const stopLoss = interaction.options.getNumber('stop_loss', true)
          const volume = interaction.options.getNumber('volume', true)

          await stockManager.addFollowPoint(interaction.channelId, symbol, entry, takeProfit, stopLoss, volume)
          await scheduler.startPriceCheck(interaction.channel as TextChannel)
          await interaction.editReply(`✅ Đã thêm điểm theo dõi cho ${symbol}:
🟢 Entry: ${entry.toLocaleString('vi-VN')}
🎯 TP: ${takeProfit.toLocaleString('vi-VN')}
🛑 SL: ${stopLoss.toLocaleString('vi-VN')}
📦 Volume: ${volume.toLocaleString('vi-VN')}`)
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
              const entryDiff = currentPrice ? (((currentPrice - point.entry) / point.entry) * 100).toFixed(1) : '?'
              const tpDiff = (((point.takeProfit - point.entry) / point.entry) * 100).toFixed(1)
              const slDiff = (((point.stopLoss - point.entry) / point.entry) * 100).toFixed(1)
              return `${index + 1}. 🟢 Entry: ${point.entry.toLocaleString('vi-VN')} (${entryDiff}%) | 🎯 TP: ${point.takeProfit.toLocaleString('vi-VN')} (${tpDiff}%) | 🛑 SL: ${point.stopLoss.toLocaleString('vi-VN')} (${slDiff}%) | 📦 Vol: ${point.volume.toLocaleString('vi-VN')}`
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
          const entry = interaction.options.getNumber('entry')
          const success = await stockManager.removeFollowPoint(interaction.channelId, symbol, entry)
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