import { Message, TextChannel } from 'discord.js'
import type { StockData, StockPosition, StockPriceResponse } from '../types/stock'
import process from 'node:process'
import { Client, GatewayIntentBits } from 'discord.js'
import { config } from 'dotenv'

config()

interface Stock {
  symbol: string
  quantity: number
  price: number
  date: string
}

interface StockFollowPoint {
  buyPrice: number
  sellPrice: number
}

interface StockFollow {
  symbol: string
  points: StockFollowPoint[]
}

interface StockFollowList {
  stocks: StockFollow[]
}

interface Portfolio {
  userId: string
  channelId: string // Thêm channelId để phân biệt dữ liệu giữa các channel
  stocks: Stock[]
}

const TAX_RATE = 0.001 // 0.1%
const API_BASE_URL = 'https://apipubaws.tcbs.com.vn/stock-insight/v2/stock'
const MARKET_OPEN_HOUR = 9
const MARKET_CLOSE_HOUR = 15

export class StockManager {
  private userId: string
  private client: Client
  private isReady: boolean = false
  private readyPromise: Promise<void>
  private followLists: Map<string, StockFollowList> = new Map()

  constructor(userId: string) {
    this.userId = userId
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })

    // Tạo promise để theo dõi trạng thái kết nối
    this.readyPromise = new Promise((resolve) => {
      this.client.once('ready', () => {
        this.isReady = true
        resolve()
      })
    })

    // Đăng nhập
    this.client.login(process.env.DISCORD_TOKEN)
  }

  // Đảm bảo client đã sẵn sàng trước khi thực hiện các thao tác
  private async ensureReady(): Promise<void> {
    if (!this.isReady) {
      await this.readyPromise
    }
  }

  // Đóng kết nối khi đã hoàn thành
  public async destroy(): Promise<void> {
    await this.client.destroy()
  }

  // Lấy tin nhắn lưu trữ dữ liệu
  private async getStorageMessage(channelId: string): Promise<Message | null> {
    await this.ensureReady()

    const channel = this.client.channels.cache.get(channelId) as TextChannel

    if (!channel) {
      throw new Error('Không tìm thấy kênh lưu trữ.')
    }

    // Tìm tin nhắn có chứa dữ liệu portfolio
    const messages = await channel.messages.fetch({ limit: 100 })
    const storageMessage = messages.find(msg =>
      msg.author.id === this.client.user?.id
      && msg.content.match(new RegExp(`PORTFOLIO_DATA_.*_${channelId}:`)),
    )

    return storageMessage || null
  }

  // Lưu dữ liệu portfolio
  private async savePortfolio(channelId: string, portfolio: Portfolio): Promise<void> {
    await this.ensureReady()

    const channel = this.client.channels.cache.get(channelId) as TextChannel

    if (!channel) {
      throw new Error('Không tìm thấy kênh lưu trữ.')
    }

    const storageMessage = await this.getStorageMessage(channelId)
    const dataString = `PORTFOLIO_DATA_${this.userId}_${channelId}: ${JSON.stringify(portfolio)}`

    if (storageMessage) {
      await storageMessage.edit(dataString)
    }
    else {
      await channel.send(dataString)
    }
  }

  // Lấy dữ liệu portfolio
  private async getPortfolio(channelId: string): Promise<Portfolio> {
    const storageMessage = await this.getStorageMessage(channelId)

    if (!storageMessage) {
      return { userId: this.userId, channelId, stocks: [] }
    }

    try {
      const dataString = storageMessage.content.replace(/PORTFOLIO_DATA_.*_\d+:\s*/, '')
      return JSON.parse(dataString) as Portfolio
    }
    catch (error) {
      console.error('Lỗi khi phân tích dữ liệu portfolio:', error)
      return { userId: this.userId, channelId, stocks: [] }
    }
  }

  // Thêm cổ phiếu
  async addStock(channelId: string, symbol: string, quantity: number, price: number): Promise<void> {
    try {
      const portfolio = await this.getPortfolio(channelId)

      // Kiểm tra xem cổ phiếu đã tồn tại chưa
      const existingStockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol)

      if (existingStockIndex >= 0) {
        // Cập nhật cổ phiếu hiện có
        const oldQuantity = portfolio.stocks[existingStockIndex].quantity
        const oldPrice = portfolio.stocks[existingStockIndex].price

        // Tính giá trung bình
        const oldValue = oldQuantity * oldPrice
        const newValue = quantity * price
        const totalQuantity = oldQuantity + quantity

        portfolio.stocks[existingStockIndex].quantity = totalQuantity
        portfolio.stocks[existingStockIndex].price = (oldValue + newValue) / totalQuantity
      }
      else {
        // Thêm cổ phiếu mới
        portfolio.stocks.push({
          symbol,
          quantity,
          price,
          date: new Date().toISOString(),
        })
      }

      await this.savePortfolio(channelId, portfolio)
    }
    finally {
      // Đóng kết nối sau khi hoàn thành
      await this.destroy()
    }
  }

  // Xóa cổ phiếu
  async removeStock(channelId: string, symbol: string): Promise<void> {
    try {
      const portfolio = await this.getPortfolio(channelId)

      const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol)

      if (stockIndex < 0) {
        throw new Error(`Không tìm thấy cổ phiếu ${symbol} trong danh sách.`)
      }

      portfolio.stocks.splice(stockIndex, 1)

      await this.savePortfolio(channelId, portfolio)
    }
    finally {
      // Đóng kết nối sau khi hoàn thành
      await this.destroy()
    }
  }

  // Lấy danh sách cổ phiếu
  async getStocks(channelId: string): Promise<Stock[]> {
    try {
      const portfolio = await this.getPortfolio(channelId)
      return portfolio.stocks
    }
    finally {
      // Đóng kết nối sau khi hoàn thành
      await this.destroy()
    }
  }

  // Lấy giá trị hiện tại của danh mục
  async getCurrentValue(channelId: string): Promise<number> {
    try {
      // Ở đây bạn sẽ cần tích hợp với API chứng khoán để lấy giá hiện tại
      // Đây chỉ là mẫu, bạn cần thay thế bằng API thực tế
      const portfolio = await this.getPortfolio(channelId)
      let totalValue = 0

      for (const stock of portfolio.stocks) {
        // Giả sử chúng ta có hàm getStockPrice để lấy giá hiện tại
        // const currentPrice = await getStockPrice(stock.symbol);
        // Tạm thời dùng giá mua
        const currentPrice = stock.price
        totalValue += stock.quantity * currentPrice
      }

      return totalValue
    }
    finally {
      // Đóng kết nối sau khi hoàn thành
      await this.destroy()
    }
  }

  private stocks: Map<string, StockData[]> = new Map()

  async getPortfolioDetails(channelId: string): Promise<{
    stocks: StockData[]
    isMarketOpen: boolean
    totalValue: number
    totalProfitPercent: number
    totalInvestment: number
    totalProfit: number
  }> {
    const portfolio = await this.getPortfolio(channelId)
    const isMarketOpen = this.isMarketOpen()

    if (!portfolio || portfolio.stocks.length === 0) {
      return {
        stocks: [],
        isMarketOpen,
        totalValue: 0,
        totalProfitPercent: 0,
        totalInvestment: 0,
        totalProfit: 0,
      }
    }

    const updatedStocks = await Promise.all(
      portfolio.stocks.map(async (stock) => {
        const currentPrice = await this.fetchStockPrice(stock.symbol)
        const previousPrice = await this.fetchPreviousStockPrice(stock.symbol)

        if (currentPrice) {
          const volume = stock.quantity
          const buyPrice = stock.price
          const investValue = buyPrice * volume / 1000
          const marketValue = currentPrice * volume / 1000
          const tax = this.calculateTax(currentPrice, volume)
          const profit = this.calculateProfit(currentPrice, buyPrice, volume) / 1000

          // Tính phần trăm thay đổi so với phiên trước
          const previousPercent = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0

          return {
            id: this.generateId(),
            code: stock.symbol,
            buyPrice,
            price: buyPrice,
            volume,
            current: currentPrice,
            previousPrice: previousPrice || 0,
            previousPercent,
            tax,
            profit,
            timestamp: Date.now(),
            total: marketValue,
            broker: 'TCBS',
            investValue,
            marketValue,
            profitPercent: ((marketValue - investValue) / investValue) * 100,
          } as StockData
        }
        return null
      }),
    )

    const validStocks = updatedStocks.filter((stock): stock is StockData => stock !== null)

    const totalInvestment = validStocks.reduce((sum, stock) => sum + stock.investValue, 0)
    const totalValue = validStocks.reduce((sum, stock) => sum + stock.marketValue, 0)
    const totalProfit = totalValue - totalInvestment
    const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

    return {
      stocks: validStocks,
      isMarketOpen,
      totalValue,
      totalProfitPercent,
      totalInvestment,
      totalProfit,
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  private calculateTax(price: number, volume: number): number {
    return price * volume * TAX_RATE
  }

  private calculateProfit(current: number, buyPrice: number, volume: number): number {
    const grossProfit = (current - buyPrice) * volume
    const tax = this.calculateTax(current, volume)
    return grossProfit - tax
  }

  public isMarketOpen(): boolean {
    const timeString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh"
    });
    const now = new Date(timeString)
    const hour = now.getHours()
    const day = now.getDay()

    if (day === 0 || day === 6)
      return false
    return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR
  }

  private getLatestMarketTime(): number {
    const timeString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh"
    });
    const now = new Date(timeString)
    const hour = now.getHours()

    if (hour < MARKET_OPEN_HOUR) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(MARKET_CLOSE_HOUR, 0, 0, 0)
      return Math.floor(yesterday.getTime() / 1000)
    }

    if (hour >= MARKET_CLOSE_HOUR) {
      const today = new Date(now)
      today.setHours(MARKET_CLOSE_HOUR, 0, 0, 0)
      return Math.floor(today.getTime() / 1000)
    }

    return Math.floor(now.getTime() / 1000)
  }

  // Lấy giá cổ phiếu hiện tại
  async fetchStockPrice(stock: string): Promise<number | null> {
    try {
      const to = this.getLatestMarketTime()
      const url = `${API_BASE_URL}/bars?ticker=${stock}&type=stock&resolution=1&to=${to}&countBack=1`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json() as StockPriceResponse

      if (data?.data?.[0]?.close) {
        return data.data[0].close / 1000
      }
      return null
    }
    catch (error) {
      console.error(`Error fetching price for ${stock}:`, error)
      return null
    }
  }

  private async fetchPreviousStockPrice(stock: string): Promise<number | null> {
    try {
      const to = this.getLatestMarketTime() - 24 * 60 * 60
      const url = `${API_BASE_URL}/bars?ticker=${stock}&type=stock&resolution=1&to=${to}&countBack=1`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json() as StockPriceResponse

      if (data?.data && data.data.length > 0) {
        return data.data[0].close / 1000
      }
      return null
    }
    catch (error) {
      console.error(`Error fetching previous price for ${stock}:`, error)
      return null
    }
  }

  async addPosition(channelId: string, position: StockPosition): Promise<boolean> {
    const currentPrice = await this.fetchStockPrice(position.code)
    const previousPrice = await this.fetchPreviousStockPrice(position.code)
    if (!currentPrice)
      return false

    const tax = this.calculateTax(currentPrice, position.volume)
    const profit = this.calculateProfit(currentPrice, position.buyPrice, position.volume)
    const previousPercent = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0

    const newStock: StockData = {
      id: this.generateId(),
      code: position.code.toUpperCase(),
      buyPrice: position.buyPrice,
      price: position.buyPrice,
      volume: position.volume,
      current: currentPrice,
      previousPrice: previousPrice || 0,
      previousPercent,
      tax,
      profit,
      timestamp: Date.now(),
      total: position.volume * currentPrice,
      broker: position.broker || 'TCBS',
      investValue: position.volume * position.buyPrice,
      marketValue: position.volume * currentPrice,
      profitPercent: ((position.volume * currentPrice - position.volume * position.buyPrice) / (position.volume * position.buyPrice)) * 100,
    }

    const userStocks = this.stocks.get(channelId) || []
    userStocks.push(newStock)
    this.stocks.set(channelId, userStocks)

    return true
  }

  removePosition(channelId: string, id: string): boolean {
    const userStocks = this.stocks.get(channelId)
    if (!userStocks)
      return false

    const updatedStocks = userStocks.filter(stock => stock.id !== id)
    this.stocks.set(channelId, updatedStocks)
    return true
  }

  async getAllChannelsWithData(): Promise<string[]> {
    await this.ensureReady()

    const guilds = this.client.guilds.cache.values()
    const channels: string[] = []

    for (const guild of guilds) {
      const textChannels = guild.channels.cache.filter(
        channel => channel.type === 0, // TextChannel type
      )

      for (const [_, channel] of textChannels) {
        const channelId = channel.id
        try {
          const messages = await (channel as TextChannel).messages.fetch({ limit: 100 })

          const hasData = messages.some(msg => msg.content.includes(`PORTFOLIO_DATA_`))

          if (hasData) {
            channels.push(channelId);
          }
        }
        catch (error) {
          console.error(`Không thể kiểm tra kênh ${channelId}:`, error)
        }
      }
    }

    return channels
  }

  async getAllPortfolios(): Promise<{ [channelId: string]: Portfolio }> {
    const channels = await this.getAllChannelsWithData()
    const portfolios: { [channelId: string]: Portfolio } = {}

    for (const channelId of channels) {
      try {
        const portfolio = await this.getPortfolio(channelId)
        portfolios[channelId] = portfolio
      }
      catch (error) {
        console.error(`Lỗi khi lấy portfolio từ kênh ${channelId}:`, error)
      }
    }

    return portfolios
  }

  // Thêm điểm theo dõi
  async addFollowPoint(channelId: string, symbol: string, buyPrice: number, sellPrice: number): Promise<void> {
    try {
      const followList = await this.getFollowList(channelId)
      const stockIndex = followList.stocks.findIndex(s => s.symbol === symbol)

      if (stockIndex >= 0) {
        // Thêm điểm mới vào cổ phiếu hiện có
        followList.stocks[stockIndex].points.push({ buyPrice, sellPrice })
      } else {
        // Thêm cổ phiếu mới với điểm theo dõi
        followList.stocks.push({
          symbol,
          points: [{ buyPrice, sellPrice }]
        })
      }

      await this.saveFollowList(channelId, followList)
    }
    finally {
      await this.destroy()
    }
  }

  // Lấy channel
  async getChannel(channelId: string): Promise<TextChannel | null> {
    try {
      await this.readyPromise
      const channel = await this.client.channels.fetch(channelId)
      return channel instanceof TextChannel ? channel : null
    }
    catch (error) {
      console.error('Error getting channel:', error)
      return null
    }
  }

  // Lấy danh sách theo dõi
  async getFollowList(channelId: string): Promise<StockFollowList> {
    try {
      const channel = await this.getChannel(channelId)
      if (!channel) {
        throw new Error('Channel not found')
      }

      const messages = await channel.messages.fetch({ limit: 100 })
      const followListMessage = messages.find((msg: Message) => 
        msg.author.id === this.client.user?.id && 
        msg.content.startsWith('FOLLOW_LIST:')
      )

      if (followListMessage) {
        const data = followListMessage.content.replace('FOLLOW_LIST:', '')
        return JSON.parse(data) as StockFollowList
      }

      return { stocks: [] }
    }
    catch (error) {
      console.error('Error getting follow list:', error)
      return { stocks: [] }
    }
  }

  // Lưu danh sách theo dõi
  private async saveFollowList(channelId: string, followList: StockFollowList): Promise<void> {
    try {
      const channel = await this.getChannel(channelId)
      if (!channel) {
        throw new Error('Channel not found')
      }

      const messages = await channel.messages.fetch({ limit: 100 })
      const oldMessage = messages.find((msg: Message) => 
        msg.author.id === this.client.user?.id && 
        msg.content.startsWith('FOLLOW_LIST:')
      )

      const content = `FOLLOW_LIST:${JSON.stringify(followList)}`

      if (oldMessage) {
        await oldMessage.edit(content)
      } else {
        await channel.send(content)
      }
    }
    catch (error) {
      console.error('Error saving follow list:', error)
      throw error
    }
  }

  // Xóa điểm theo dõi
  async removeFollowPoint(channelId: string, symbol: string): Promise<boolean> {
    try {
      const followList = await this.getFollowList(channelId)
      const stockIndex = followList.stocks.findIndex(s => s.symbol === symbol)

      if (stockIndex < 0) {
        return false
      }

      // Xóa toàn bộ cổ phiếu khỏi danh sách
      followList.stocks.splice(stockIndex, 1)
      await this.saveFollowList(channelId, followList)
      return true
    }
    catch (error) {
      console.error('Error removing follow point:', error)
      return false
    }
  }

  public async getAllChannels(): Promise<TextChannel[]> {
    const channels: TextChannel[] = [];
    try {
      // Get all guilds the bot is in
      const guilds = this.client.guilds.cache;
      
      // For each guild, get all text channels
      for (const guild of guilds.values()) {
        const guildChannels = await guild.channels.fetch();
        for (const channel of guildChannels.values()) {
          if (channel?.isTextBased()) {
            channels.push(channel as TextChannel);
          }
        }
      }
    } catch (error) {
      console.error('Error getting all channels:', error);
    }
    return channels;
  }
}
