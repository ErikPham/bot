import type { ChatInputCommandInteraction, CommandInteraction } from 'discord.js'
import type { StockData } from '../types/stock'
import { SlashCommandBuilder } from 'discord.js'
import { StockManager } from '../utils/stockManager'

interface PortfolioResponse {
  stocks: StockData[]
  isMarketOpen: boolean
  totalValue: number
  totalProfitPercent: number
  totalInvestment: number
  totalProfit: number
}

export default {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Hiển thị chi tiết danh mục đầu tư')
    .addStringOption(option =>
      option
        .setName('channel')
        .setDescription('Chọn channel để xem portfolio (mặc định là channel hiện tại)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const stockManager = new StockManager(interaction.user.id)
    const channelOption = interaction.options.getString('channel') || 'current'

    try {
      if (channelOption === 'all') {
        // Hiển thị portfolio từ tất cả các channel
        const allPortfolios = await stockManager.getAllPortfolios()

        if (Object.keys(allPortfolios).length === 0) {
          await interaction.editReply('Bạn chưa có danh mục đầu tư nào.')
          return
        }

        let combinedStocks: StockData[] = []
        let totalInvestment = 0
        let totalValue = 0

        // Kết hợp dữ liệu từ tất cả các channel
        for (const channelId in allPortfolios) {
          const channelPortfolio = await stockManager.getPortfolioDetails(channelId) as PortfolioResponse
          if (channelPortfolio.stocks.length > 0) {
            combinedStocks = [...combinedStocks, ...channelPortfolio.stocks]
            totalInvestment += channelPortfolio.totalInvestment
            totalValue += channelPortfolio.totalValue
          }
        }

        // Tính toán lợi nhuận tổng hợp
        const totalProfit = totalValue - totalInvestment
        const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

        // Tạo đối tượng portfolio tổng hợp
        const combinedPortfolio: PortfolioResponse = {
          stocks: combinedStocks,
          isMarketOpen: stockManager.isMarketOpen(),
          totalValue,
          totalProfitPercent,
          totalInvestment,
          totalProfit,
        }

        // Hiển thị portfolio tổng hợp
        await displayPortfolio(interaction, combinedPortfolio, 'Tất cả các channel')
      }
      else if (channelOption === 'current') {
        // Hiển thị portfolio từ channel hiện tại
        const portfolio = await stockManager.getPortfolioDetails(interaction.channelId) as PortfolioResponse

        if (!portfolio || portfolio.stocks.length === 0) {
          await interaction.editReply('Danh mục của bạn hiện đang trống.')
          return
        }

        await displayPortfolio(interaction, portfolio, 'Channel hiện tại')
      }
      else {
        // Tìm channel theo tên
        const guild = interaction.guild
        if (!guild) {
          await interaction.editReply('Lệnh này chỉ có thể sử dụng trong server.')
          return
        }

        // Tìm channel theo tên (không phân biệt hoa thường)
        const targetChannel = guild.channels.cache.find(
          channel => channel.name.toLowerCase() === channelOption.toLowerCase(),
        )

        if (!targetChannel) {
          await interaction.editReply(`Không tìm thấy channel có tên "${channelOption}".`)
          return
        }

        console.log('Portfolio - Found channel by name:', {
          name: targetChannel.name,
          id: targetChannel.id,
          type: targetChannel.type
        })

        // Lấy portfolio từ channel đã tìm thấy
        const portfolio = await stockManager.getPortfolioDetails(targetChannel.id) as PortfolioResponse

        if (!portfolio || portfolio.stocks.length === 0) {
          await interaction.editReply(`Danh mục trong channel #${targetChannel.name} hiện đang trống.`)
          return
        }

        await displayPortfolio(interaction, portfolio, `Channel #${targetChannel.name}`)
      }
    }
    catch (error) {
      console.error(error)
      await interaction.editReply('Đã xảy ra lỗi khi tải thông tin danh mục.')
    }
  },
}

// Hàm hiển thị portfolio
async function displayPortfolio(interaction: CommandInteraction | ChatInputCommandInteraction, portfolio: PortfolioResponse, sourceInfo: string): Promise<void> {
  // Tính lãi/lỗ trong ngày của toàn danh mục
  const dailyProfitTotal = portfolio.stocks.reduce((sum, stock) => {
    const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume
    return sum + dailyProfitPerStock / 1000 // Chuyển về đơn vị triệu
  }, 0)

  const dailyProfitPercent = (dailyProfitTotal / portfolio.totalValue) * 100

  // Tạo header cho danh mục
  let portfolioText = `📊 **Danh mục đầu tư (${sourceInfo})**\n\n`
  portfolioText += `💰 **Giá trị vốn:** ${portfolio.totalInvestment.toLocaleString('vi-VN')} tr\n\n`
  portfolioText += `📈 **Tổng giá trị thị trường:** ${portfolio.totalValue.toLocaleString('vi-VN')} tr\n\n`
  portfolioText += `${portfolio.totalProfit >= 0 ? '🟢' : '🔴'} **Lợi nhuận:** ${portfolio.totalProfit >= 0 ? '+' : ''}${portfolio.totalProfit.toLocaleString('vi-VN')} tr (${portfolio.totalProfitPercent.toFixed(1)}%)\n\n`
  portfolioText += `${dailyProfitTotal >= 0 ? '🟢' : '🔴'} **Lãi/Lỗ hôm nay:** ${dailyProfitTotal >= 0 ? '+' : ''}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n`
  portfolioText += '**Chi tiết danh mục**\n'
  // Tạo bảng danh mục
  portfolioText += '```\n'
  portfolioText += 'Mã              | KL    | Lãi (tr)\n'
  portfolioText += '--------------  | ----- | ----------\n'

  // Thêm từng cổ phiếu vào bảng
  for (const stock of portfolio.stocks) {
    // Định dạng giá hiện tại và % thay đổi
    const priceChangePercent = stock.previousPercent.toFixed(1)
    const priceChangeSign = stock.previousPercent >= 0 ? '+' : ''
    const priceChange = `${priceChangeSign}${priceChangePercent}%`
    let priceTrendSymbol = ''
    switch (true) {
      case stock.previousPercent > 0:
        priceTrendSymbol = '↑'
        break
      case stock.previousPercent < 0:
        priceTrendSymbol = '↓'
        break
      default:
        priceTrendSymbol = '-'
        break
    }

    // Dòng 1: Mã, KL, Lãi
    portfolioText += `${stock.code.padEnd(15)} | ${stock.volume.toString().padEnd(5)} | ${stock.profit.toFixed(2)}\n`

    // Dòng 2: Giá hiện tại và % biến động
    portfolioText += `${priceTrendSymbol} ${stock.current.toFixed(2).padEnd(5)} - ${priceChange.padEnd(4)} | ${' '.padEnd(5)} | ${stock.profitPercent.toFixed(1)}%\n`

    // Thêm dòng phân cách
    portfolioText += '--------------  | ----- | ----------\n'
  }

  portfolioText += '```'

  // Thêm thông tin cập nhật
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  portfolioText += `\nCập nhật lúc: ${new Date(timeString).toLocaleTimeString('vi-VN')}`

  await interaction.editReply(portfolioText)
}
