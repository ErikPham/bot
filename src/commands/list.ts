import type { CommandInteraction } from 'discord.js'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { StockManager } from '../utils/stockManager'

export default {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Hiển thị danh sách các cổ phiếu đang theo dõi'),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply()

    const stockManager = new StockManager(interaction.user.id)

    try {
      const stocks = await stockManager.getStocks(interaction.channelId)

      if (stocks.length === 0) {
        await interaction.editReply('Bạn chưa có cổ phiếu nào trong danh sách theo dõi.')
        return
      }

      const embed = new EmbedBuilder()
        .setTitle('Danh sách cổ phiếu đang theo dõi')
        .setColor('#0099ff')
        .setTimestamp()

      stocks.forEach((stock) => {
        embed.addFields({
          name: stock.symbol,
          value: `Số lượng: ${stock.quantity}\nGiá mua: ${stock.price}`,
          inline: true,
        })
      })

      await interaction.editReply({ embeds: [embed] })
    }
    catch (error) {
      console.error(error)
      await interaction.editReply('Đã xảy ra lỗi khi lấy danh sách cổ phiếu.')
    }
  },
}
