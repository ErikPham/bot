/**
 * Utility để định dạng và hiển thị danh mục đầu tư
 */
import type { PortfolioSummary } from '../../../portfolio/models';

/**
 * Kết hợp nhiều portfolios thành một
 */
export function combinePortfolios(portfolios: PortfolioSummary[]): PortfolioSummary {
  if (portfolios.length === 0) {
    throw new Error('Không có danh mục nào để kết hợp');
  }

  if (portfolios.length === 1) {
    return portfolios[0];
  }

  // Map để nhóm các cổ phiếu theo mã
  const stocksMap = new Map();
  let totalValue = 0;
  let totalInvestment = 0;

  // Duyệt qua các portfolios và nhóm các cổ phiếu
  for (const portfolio of portfolios) {
    for (const stock of portfolio.stocks) {
      const existingStock = stocksMap.get(stock.code);
      
      if (existingStock) {
        // Cập nhật thông tin cổ phiếu hiện có
        existingStock.volume += stock.volume;
        existingStock.marketValue += stock.marketValue;
        existingStock.investValue += stock.investValue;
        existingStock.profit += stock.profit;
      } else {
        // Thêm cổ phiếu mới
        stocksMap.set(stock.code, { ...stock });
      }
    }
    
    totalValue += portfolio.totalValue;
    totalInvestment += portfolio.totalInvestment;
  }

  // Tính toán lại các thông số cho mỗi cổ phiếu
  const combinedStocks = Array.from(stocksMap.values()).map(stock => {
    stock.profitPercent = (stock.profit / stock.investValue) * 100;
    stock.buy = stock.investValue / stock.volume; // Giá mua trung bình
    return stock;
  });

  // Tính toán lợi nhuận tổng thể
  const totalProfit = totalValue - totalInvestment;
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  // Trả về portfolio tổng hợp
  return {
    stocks: combinedStocks,
    isMarketOpen: portfolios[0].isMarketOpen,
    totalValue,
    totalProfitPercent,
    totalInvestment,
    totalProfit
  };
}

/**
 * Định dạng thông tin danh mục để hiển thị
 */
export function formatPortfolio(portfolio: PortfolioSummary, sourceInfo: string): string {
  // Tính lãi/lỗ trong ngày của toàn danh mục
  const dailyProfitTotal = portfolio.stocks.reduce((sum, stock) => {
    const dailyProfitPerStock = (stock.current - stock.previousPrice) * stock.volume;
    return sum + dailyProfitPerStock / 1000; // Chuyển về đơn vị triệu
  }, 0);

  const dailyProfitPercent = portfolio.totalValue > 0 
    ? (dailyProfitTotal / portfolio.totalValue) * 100 
    : 0;

  // Tạo header cho danh mục
  let portfolioText = `📊 **Danh mục đầu tư (${sourceInfo})**\n\n`;
  portfolioText += `💰 **Giá trị vốn:** ${portfolio.totalInvestment.toLocaleString('vi-VN')} tr\n\n`;
  portfolioText += `📈 **Tổng giá trị thị trường:** ${portfolio.totalValue.toLocaleString('vi-VN')} tr\n\n`;
  portfolioText += `${portfolio.totalProfit >= 0 ? '🟢' : '🔴'} **Lợi nhuận:** ${portfolio.totalProfit >= 0 ? '+' : ''}${portfolio.totalProfit.toLocaleString('vi-VN')} tr (${portfolio.totalProfitPercent.toFixed(1)}%)\n\n`;
  portfolioText += `${dailyProfitTotal >= 0 ? '🟢' : '🔴'} **Lãi/Lỗ hôm nay:** ${dailyProfitTotal >= 0 ? '+' : ''}${dailyProfitTotal.toFixed(2)} tr (${dailyProfitPercent.toFixed(1)}%)\n\n`;
  portfolioText += '**Chi tiết danh mục**\n';
  
  // Tạo bảng danh mục
  portfolioText += '```\n';
  portfolioText += 'Mã              | KL    | Lãi (tr)\n';
  portfolioText += '--------------  | ----- | ----------\n';

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
        priceTrendSymbol = '-';
        break;
    }

    // Dòng 1: Mã, KL, Lãi
    portfolioText += `${stock.code.padEnd(15)} | ${stock.volume.toString().padEnd(5)} | ${stock.profit.toFixed(2)}\n`;

    // Dòng 2: Giá hiện tại và % biến động
    portfolioText += `${priceTrendSymbol} ${stock.current.toFixed(2).padEnd(5)} - ${priceChange.padEnd(4)} | ${' '.padEnd(5)} | ${stock.profitPercent.toFixed(1)}%\n`;

    // Thêm dòng phân cách
    portfolioText += '--------------  | ----- | ----------\n';
  }

  portfolioText += '```';

  // Thêm thông tin cập nhật
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  portfolioText += `\nCập nhật lúc: ${new Date(timeString).toLocaleTimeString('vi-VN')}`;

  return portfolioText;
} 