import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { StockManager } from '../utils/stockManager';
import { StockData } from '../types/stock';

interface PortfolioResponse {
  stocks: StockData[];
  isMarketOpen: boolean;
  totalValue: number;
  totalProfitPercent: number;
  totalInvestment: number;
  totalProfit: number;
}

export default {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Hiển thị chi tiết danh mục đầu tư'),
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    
    const stockManager = new StockManager(interaction.user.id);
    
    try {
      const portfolio = await stockManager.getPortfolioDetails(interaction.channelId) as PortfolioResponse;
      
      if (!portfolio || portfolio.stocks.length === 0) {
        await interaction.editReply('Danh mục của bạn hiện đang trống.');
        return;
      }

      // Tính lãi/lỗ trong ngày của toàn danh mục
      const dailyProfitTotal = portfolio.stocks.reduce((sum, stock) => {
        const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume;
        return sum + dailyProfitPerStock / 1000; // Chuyển về đơn vị triệu
      }, 0);

      const dailyProfitPercent = (dailyProfitTotal / portfolio.totalValue) * 100;

      // Tạo header cho danh mục
      let portfolioText = `💰 **Giá trị vốn:** ${portfolio.totalInvestment.toLocaleString('vi-VN')} tr\n\n`;
      portfolioText += `📊 **Tổng giá trị thị trường:** ${portfolio.totalValue.toLocaleString('vi-VN')} tr\n\n`;
      portfolioText += `📉 **Lợi nhuận:** ${portfolio.totalProfit >= 0 ? '+' : ''}${portfolio.totalProfit.toLocaleString('vi-VN')} tr (${portfolio.totalProfitPercent.toFixed(1)}%)\n\n`;
      portfolioText += `📉 **Lãi/Lỗ hôm nay:** ${dailyProfitTotal >= 0 ? '+' : ''}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n`;
      portfolioText += "**Danh mục đầu tư**\n";
      // Tạo bảng danh mục
      portfolioText += "```\n";
      portfolioText += "Mã              | KL    | Lãi (tr)\n";
      portfolioText += "--------------  | ----- | ----------\n";
      
      // Thêm từng cổ phiếu vào bảng
      for (const stock of portfolio.stocks) {
        // Định dạng giá hiện tại và % thay đổi
        const priceChangePercent = stock.previousPercent.toFixed(1);
        const priceChangeSign = stock.previousPercent >= 0 ? '+' : '';
        const priceChange = `${priceChangeSign}${priceChangePercent}%`;
        let priceTrendSymbol = '';
        switch (true) {
          case stock.previousPercent > 0:
            priceTrendSymbol = '↑';
            break;
          case stock.previousPercent < 0:
            priceTrendSymbol = '↓';
            break;
          default:
            priceTrendSymbol = '・';
            break;
        }
        
        // Dòng 1: Mã, KL, Lãi
        portfolioText += `${stock.code.padEnd(15)} | ${stock.volume.toString().padEnd(5)} | ${stock.profit.toFixed(2)}\n`;
        
        // Dòng 2: Giá hiện tại và % biến động
        portfolioText += `${priceTrendSymbol} ${stock.current.toFixed(2).padEnd(5)} - ${priceChange.padEnd(4)} | ${' '.padEnd(5)} | ${stock.profitPercent.toFixed(1)}%\n`;
        
        // Thêm dòng phân cách
        portfolioText += "--------------  | ----- | ----------\n";
      }
      
      portfolioText += "```";
      
      // Thêm thông tin cập nhật
      portfolioText += `\nCập nhật lúc: ${new Date().toLocaleTimeString('vi-VN')}`;
      
      await interaction.editReply(portfolioText);
    } catch (error) {
      console.error(error);
      await interaction.editReply('Đã xảy ra lỗi khi tải thông tin danh mục.');
    }
  },
};