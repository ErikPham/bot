import { Message, TextChannel, Client, GatewayIntentBits } from 'discord.js'
import type { StockData, StockPosition, StockPriceResponse } from '../types/stock'
import process from 'node:process'
import { config } from 'dotenv'

config()

// Types
interface Stock {
  symbol: string
  quantity: number
  price: number
  date: string
}

interface StockFollowPoint {
  entry: number
  takeProfit: number
  stopLoss: number
  volume: number
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
  channelId: string
  stocks: Stock[]
}

// Constants
const TAX_RATE = 0.001 // 0.1%
const API_BASE_URL = 'https://apipubaws.tcbs.com.vn/stock-insight/v2/stock'
const MARKET_OPEN_HOUR = 9
const MARKET_CLOSE_HOUR = 15
const STORAGE_PREFIX = {
  PORTFOLIO: 'PORTFOLIO_DATA',
  FOLLOW_LIST: 'FOLLOW_LIST_DATA'
}

// Discord client management
function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  })

  const readyPromise = new Promise<void>((resolve) => {
    client.once('ready', () => {
      resolve()
    })
  })

  client.login(process.env.DISCORD_TOKEN)

  return {
    client,
    readyPromise,
    async destroy() {
      await client.destroy()
    }
  }
}

// Time/market utilities
function isMarketOpen(): boolean {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  })
  const now = new Date(timeString)
  const hour = now.getHours()
  const day = now.getDay()

  // Check weekend (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return false
  }

  // Check market hours
  return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR
}

function getLatestMarketTime(): number {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  })
  const now = new Date(timeString)
  const day = now.getDay()
  const hour = now.getHours()

  // Nếu là cuối tuần hoặc ngoài giờ giao dịch, lấy giá đóng cửa của phiên gần nhất
  let timestamp = now.getTime()

  // Nếu là Chủ nhật
  if (day === 0) {
    timestamp -= 2 * 24 * 60 * 60 * 1000 // Trừ 2 ngày để lấy thứ 6
  }
  // Nếu là thứ 7
  else if (day === 6) {
    timestamp -= 1 * 24 * 60 * 60 * 1000 // Trừ 1 ngày để lấy thứ 6
  }
  // Nếu là ngày trong tuần nhưng trước giờ mở cửa
  else if (hour < MARKET_OPEN_HOUR) {
    // Nếu là thứ 2
    if (day === 1) {
      timestamp -= 3 * 24 * 60 * 60 * 1000 // Trừ 3 ngày để lấy thứ 6 tuần trước
    } else {
      timestamp -= 1 * 24 * 60 * 60 * 1000 // Trừ 1 ngày
    }
  }

  return timestamp
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function calculateTax(price: number, volume: number): number {
  return price * volume * TAX_RATE
}

function calculateProfit(current: number, buyPrice: number, volume: number): number {
  const profit = (current - buyPrice) * volume
  return profit - calculateTax(current, volume)
}

// Stock API
async function fetchStockPrice(stock: string): Promise<number | null> {
  try {
    const url = `${API_BASE_URL}/quote/${stock}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json() as StockPriceResponse
    return data.price
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá cổ phiếu ${stock}:`, error)
    return null
  }
}

async function fetchPreviousStockPrice(stock: string): Promise<number | null> {
  try {
    const timestamp = getLatestMarketTime()
    const date = new Date(timestamp)
    const formattedDate = date.toISOString().split('T')[0]

    const url = `${API_BASE_URL}/historical/${stock}?from=${formattedDate}&to=${formattedDate}&resolution=D`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (data && data.c && data.c.length > 0) {
      return data.c[0]
    }
    
    return null
  }
  catch (error) {
    console.error(`Lỗi khi lấy giá đóng cửa cổ phiếu ${stock}:`, error)
    return null
  }
}

// Channel management
async function getChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  try {
    const channel = client.channels.cache.get(channelId) as TextChannel
    return channel || null
  }
  catch (error) {
    console.error('Lỗi khi lấy kênh:', error)
    return null
  }
}

async function getAllChannels(client: Client): Promise<TextChannel[]> {
  try {
    const channels = client.channels.cache.filter((channel): channel is TextChannel => 
      channel.type === 0
    )
    
    return Array.from(channels.values())
  }
  catch (error) {
    console.error('Lỗi khi lấy danh sách kênh:', error)
    return []
  }
}

async function getAllChannelsWithData(client: Client): Promise<string[]> {
  try {
    const channels = client.channels.cache.filter((channel): channel is TextChannel => 
      channel.type === 0
    )
    
    const channelIds: string[] = []
    
    for (const [id, channel] of channels) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 })
        const hasPortfolioData = messages.some(msg => 
          msg.author.id === client.user?.id && 
          msg.content.includes(`${STORAGE_PREFIX.PORTFOLIO}_`)
        )

        if (hasPortfolioData) {
          channelIds.push(id)
        }
      }
      catch (error) {
        console.error(`Lỗi khi kiểm tra kênh ${id}:`, error)
      }
    }

    return channelIds
  }
  catch (error) {
    console.error('Lỗi khi lấy danh sách kênh:', error)
    return []
  }
}

// Storage functions
async function getStorageMessage(client: Client, userId: string, channelId: string, prefix: string): Promise<Message | null> {
  const channel = await getChannel(client, channelId)
  if (!channel) {
    throw new Error('Không tìm thấy kênh lưu trữ.')
  }

  const messages = await channel.messages.fetch({ limit: 100 })
  const pattern = new RegExp(`${prefix}_.*_${channelId}:`)
  const storageMessage = messages.find(msg =>
    msg.author.id === client.user?.id && msg.content.match(pattern)
  )

  return storageMessage || null
}

async function saveData<T>(client: Client, userId: string, channelId: string, prefix: string, data: T): Promise<void> {
  const channel = await getChannel(client, channelId)
  if (!channel) {
    throw new Error('Không tìm thấy kênh lưu trữ.')
  }

  const storageMessage = await getStorageMessage(client, userId, channelId, prefix)
  const dataString = `${prefix}_${userId}_${channelId}: ${JSON.stringify(data)}`

  if (storageMessage) {
    await storageMessage.edit(dataString)
  }
  else {
    await channel.send(dataString)
  }
}

async function getData<T>(client: Client, userId: string, channelId: string, prefix: string, defaultData: T): Promise<T> {
  const storageMessage = await getStorageMessage(client, userId, channelId, prefix)

  if (!storageMessage) {
    return defaultData
  }

  try {
    const dataPattern = new RegExp(`${prefix}_.*_\\d+:\\s*`)
    const dataString = storageMessage.content.replace(dataPattern, '')
    return JSON.parse(dataString) as T
  }
  catch (error) {
    console.error(`Lỗi khi phân tích dữ liệu ${prefix}:`, error)
    return defaultData
  }
}

// Portfolio management
async function getPortfolio(client: Client, userId: string, channelId: string): Promise<Portfolio> {
  return getData(
    client,
    userId,
    channelId, 
    STORAGE_PREFIX.PORTFOLIO, 
    { userId, channelId, stocks: [] }
  )
}

async function savePortfolio(client: Client, userId: string, channelId: string, portfolio: Portfolio): Promise<void> {
  await saveData(client, userId, channelId, STORAGE_PREFIX.PORTFOLIO, portfolio)
}

async function addStock(client: Client, userId: string, channelId: string, symbol: string, quantity: number, price: number): Promise<void> {
  const portfolio = await getPortfolio(client, userId, channelId)
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

  await savePortfolio(client, userId, channelId, portfolio)
}

async function removeStock(client: Client, userId: string, channelId: string, symbol: string): Promise<void> {
  const portfolio = await getPortfolio(client, userId, channelId)
  const stockIndex = portfolio.stocks.findIndex(s => s.symbol === symbol)

  if (stockIndex < 0) {
    throw new Error(`Không tìm thấy cổ phiếu ${symbol} trong danh sách.`)
  }

  portfolio.stocks.splice(stockIndex, 1)
  await savePortfolio(client, userId, channelId, portfolio)
}

async function getStocks(client: Client, userId: string, channelId: string): Promise<Stock[]> {
  const portfolio = await getPortfolio(client, userId, channelId)
  return portfolio.stocks
}

async function getAllPortfolios(client: Client, userId: string): Promise<{ [channelId: string]: Portfolio }> {
  const channelIds = await getAllChannelsWithData(client)
  const portfolios: { [channelId: string]: Portfolio } = {}

  for (const channelId of channelIds) {
    try {
      portfolios[channelId] = await getPortfolio(client, userId, channelId)
    }
    catch (error) {
      console.error(`Lỗi khi lấy portfolio cho kênh ${channelId}:`, error)
    }
  }

  return portfolios
}

// Follow list management
async function getFollowList(client: Client, userId: string, channelId: string): Promise<StockFollowList> {
  return getData(
    client,
    userId,
    channelId,
    STORAGE_PREFIX.FOLLOW_LIST,
    { stocks: [] }
  )
}

async function saveFollowList(client: Client, userId: string, channelId: string, followList: StockFollowList): Promise<void> {
  await saveData(client, userId, channelId, STORAGE_PREFIX.FOLLOW_LIST, followList)
}

async function addFollowPoint(
  client: Client, 
  userId: string, 
  channelId: string, 
  symbol: string, 
  entry: number, 
  takeProfit: number, 
  stopLoss: number, 
  volume: number
): Promise<void> {
  const followList = await getFollowList(client, userId, channelId)
  
  // Tìm xem cổ phiếu đã có trong danh sách theo dõi chưa
  const stockIndex = followList.stocks.findIndex(s => s.symbol === symbol)

  if (stockIndex >= 0) {
    // Thêm điểm theo dõi mới vào cổ phiếu đã tồn tại
    followList.stocks[stockIndex].points.push({
      entry,
      takeProfit,
      stopLoss,
      volume
    })
  }
  else {
    // Thêm cổ phiếu mới với điểm theo dõi
    followList.stocks.push({
      symbol,
      points: [{
        entry,
        takeProfit,
        stopLoss,
        volume
      }]
    })
  }

  await saveFollowList(client, userId, channelId, followList)
  
  const channel = await getChannel(client, channelId)
  if (channel) {
    await channel.send(
      `🔍 **Thêm điểm theo dõi thành công!**\n` +
      `📈 ${symbol}\n` +
      `🟢 Giá mua: ${entry.toLocaleString('vi-VN')}\n` +
      `🔴 Giá bán: ${takeProfit.toLocaleString('vi-VN')}\n` +
      `⛔ Dừng lỗ: ${stopLoss.toLocaleString('vi-VN')}\n` +
      `📊 Khối lượng: ${volume}`
    )
  }
}

async function removeFollowPoint(
  client: Client, 
  userId: string, 
  channelId: string, 
  symbol: string, 
  entry?: number
): Promise<boolean> {
  const followList = await getFollowList(client, userId, channelId)
  const stockIndex = followList.stocks.findIndex(s => s.symbol === symbol)

  if (stockIndex < 0) {
    return false
  }

  if (entry !== undefined) {
    // Xóa điểm theo dõi cụ thể
    const pointIndex = followList.stocks[stockIndex].points.findIndex(p => p.entry === entry)
    
    if (pointIndex < 0) {
      return false
    }
    
    followList.stocks[stockIndex].points.splice(pointIndex, 1)
    
    // Nếu không còn điểm theo dõi nào, xóa luôn cổ phiếu
    if (followList.stocks[stockIndex].points.length === 0) {
      followList.stocks.splice(stockIndex, 1)
    }
  }
  else {
    // Xóa tất cả điểm theo dõi của cổ phiếu
    followList.stocks.splice(stockIndex, 1)
  }

  await saveFollowList(client, userId, channelId, followList)
  return true
}

// Portfolio analysis
async function getPortfolioDetails(
  client: Client,
  userId: string,
  channelId: string
): Promise<{
  stocks: StockData[]
  isMarketOpen: boolean
  totalValue: number
  totalProfitPercent: number
  totalInvestment: number
  totalProfit: number
}> {
  const portfolio = await getPortfolio(client, userId, channelId)
  const marketOpen = isMarketOpen()
  
  const stocksData: StockData[] = []
  let totalValue = 0
  let totalInvestment = 0
  
  for (const stock of portfolio.stocks) {
    const currentPrice = await fetchStockPrice(stock.symbol)
    const previousPrice = await fetchPreviousStockPrice(stock.symbol)
    
    if (currentPrice) {
      const marketValue = currentPrice * stock.quantity
      const investValue = stock.price * stock.quantity
      const previousPercent = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
      
      stocksData.push({
        code: stock.symbol,
        volume: stock.quantity,
        current: currentPrice,
        buy: stock.price,
        previousPrice: previousPrice || currentPrice,
        previousPercent,
        marketValue,
        investValue,
        profit: marketValue - investValue,
        profitPercent: ((marketValue - investValue) / investValue) * 100
      })
      
      totalValue += marketValue
      totalInvestment += investValue
    }
  }
  
  const totalProfit = totalValue - totalInvestment
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0
  
  return {
    stocks: stocksData,
    isMarketOpen: marketOpen,
    totalValue,
    totalProfitPercent,
    totalInvestment,
    totalProfit
  }
}

// Position management
async function addPosition(
  client: Client, 
  userId: string, 
  channelId: string, 
  position: StockPosition
): Promise<boolean> {
  try {
    const id = generateId()
    const channel = await getChannel(client, channelId)
    
    if (!channel) {
      throw new Error('Không tìm thấy kênh.')
    }
    
    const current = await fetchStockPrice(position.stock)
    
    if (!current) {
      throw new Error(`Không thể lấy giá cổ phiếu ${position.stock}.`)
    }
    
    // Khi thêm lệnh, chúng ta cũng cập nhật danh mục đầu tư
    await addStock(client, userId, channelId, position.stock, position.volume, position.buyPrice)
    
    const profit = calculateProfit(current, position.buyPrice, position.volume)
    const profitPercent = (profit / (position.buyPrice * position.volume)) * 100
    
    await channel.send(
      `🟢 **Thêm lệnh thành công!**\n` +
      `📊 ${position.stock}\n` +
      `💰 Giá mua: ${position.buyPrice.toLocaleString('vi-VN')}\n` +
      `📈 Giá hiện tại: ${current.toLocaleString('vi-VN')}\n` +
      `📊 Lãi/Lỗ: ${profit.toFixed(0).toLocaleString('vi-VN')} (${profitPercent.toFixed(2)}%)\n` +
      `🆔 ID: ${id}`
    )
    
    return true
  }
  catch (error) {
    console.error('Lỗi khi thêm lệnh:', error)
    return false
  }
}

// Main API for backwards compatibility
export function createStockManager(userId: string) {
  const { client, readyPromise, destroy } = createDiscordClient()
  
  // Map of functions that need client access
  const api = {
    // Core client methods
    async ensureReady(): Promise<void> {
      await readyPromise
    },
    
    destroy,
    
    // Exposed methods with client bundled in
    fetchStockPrice,
    isMarketOpen,
    
    // Channel methods
    async getChannel(channelId: string): Promise<TextChannel | null> {
      return getChannel(client, channelId)
    },
    
    async getAllChannels(): Promise<TextChannel[]> {
      return getAllChannels(client)
    },
    
    async getAllChannelsWithData(): Promise<string[]> {
      return getAllChannelsWithData(client)
    },
    
    // Portfolio methods
    async getPortfolio(channelId: string): Promise<Portfolio> {
      return getPortfolio(client, userId, channelId)
    },
    
    async addStock(channelId: string, symbol: string, quantity: number, price: number): Promise<void> {
      await api.ensureReady()
      try {
        await addStock(client, userId, channelId, symbol, quantity, price)
      } finally {
        // Don't destroy here anymore as we're reusing the client
      }
    },
    
    async removeStock(channelId: string, symbol: string): Promise<void> {
      await api.ensureReady()
      try {
        await removeStock(client, userId, channelId, symbol)
      } finally {
        // Don't destroy here anymore
      }
    },
    
    async getStocks(channelId: string): Promise<Stock[]> {
      await api.ensureReady()
      try {
        return await getStocks(client, userId, channelId)
      } finally {
        // Don't destroy here anymore
      }
    },
    
    async getAllPortfolios(): Promise<{ [channelId: string]: Portfolio }> {
      await api.ensureReady()
      return getAllPortfolios(client, userId)
    },
    
    // Follow list methods
    async getFollowList(channelId: string): Promise<StockFollowList> {
      await api.ensureReady()
      return getFollowList(client, userId, channelId)
    },
    
    async addFollowPoint(
      channelId: string, 
      symbol: string, 
      entry: number, 
      takeProfit: number, 
      stopLoss: number, 
      volume: number
    ): Promise<void> {
      await api.ensureReady()
      return addFollowPoint(client, userId, channelId, symbol, entry, takeProfit, stopLoss, volume)
    },
    
    async removeFollowPoint(channelId: string, symbol: string, entry?: number): Promise<boolean> {
      await api.ensureReady()
      return removeFollowPoint(client, userId, channelId, symbol, entry)
    },
    
    // Portfolio analysis
    async getPortfolioDetails(channelId: string): Promise<{
      stocks: StockData[]
      isMarketOpen: boolean
      totalValue: number
      totalProfitPercent: number
      totalInvestment: number
      totalProfit: number
    }> {
      await api.ensureReady()
      return getPortfolioDetails(client, userId, channelId)
    },
    
    // Position management
    async addPosition(channelId: string, position: StockPosition): Promise<boolean> {
      await api.ensureReady()
      return addPosition(client, userId, channelId, position)
    },
    
    removePosition(channelId: string, id: string): boolean {
      // This is just a stub, actual implementation would need to be added
      console.error('removePosition: Not implemented')
      return false
    }
  }
  
  return api
}

// For backwards compatibility with existing code
export class StockManager {
  private userId: string
  private api: ReturnType<typeof createStockManager>
  
  constructor(userId: string) {
    this.userId = userId
    this.api = createStockManager(userId)
  }
  
  // Proxy all methods to the functional API
  public async ensureReady(): Promise<void> {
    return this.api.ensureReady()
  }
  
  public async destroy(): Promise<void> {
    return this.api.destroy()
  }
  
  public isMarketOpen(): boolean {
    return isMarketOpen()
  }
  
  public async fetchStockPrice(stock: string): Promise<number | null> {
    return fetchStockPrice(stock)
  }
  
  public async getChannel(channelId: string): Promise<TextChannel | null> {
    return this.api.getChannel(channelId)
  }
  
  public async getAllChannels(): Promise<TextChannel[]> {
    return this.api.getAllChannels()
  }
  
  public async getAllChannelsWithData(): Promise<string[]> {
    return this.api.getAllChannelsWithData()
  }
  
  public async getPortfolio(channelId: string): Promise<Portfolio> {
    return this.api.getPortfolio(channelId)
  }
  
  public async addStock(channelId: string, symbol: string, quantity: number, price: number): Promise<void> {
    return this.api.addStock(channelId, symbol, quantity, price)
  }
  
  public async removeStock(channelId: string, symbol: string): Promise<void> {
    return this.api.removeStock(channelId, symbol)
  }
  
  public async getStocks(channelId: string): Promise<Stock[]> {
    return this.api.getStocks(channelId)
  }
  
  public async getAllPortfolios(): Promise<{ [channelId: string]: Portfolio }> {
    return this.api.getAllPortfolios()
  }
  
  public async getFollowList(channelId: string): Promise<StockFollowList> {
    return this.api.getFollowList(channelId)
  }
  
  public async addFollowPoint(
    channelId: string, 
    symbol: string, 
    entry: number, 
    takeProfit: number, 
    stopLoss: number, 
    volume: number
  ): Promise<void> {
    return this.api.addFollowPoint(channelId, symbol, entry, takeProfit, stopLoss, volume)
  }
  
  public async removeFollowPoint(channelId: string, symbol: string, entry?: number): Promise<boolean> {
    return this.api.removeFollowPoint(channelId, symbol, entry)
  }
  
  public async getPortfolioDetails(channelId: string): Promise<{
    stocks: StockData[]
    isMarketOpen: boolean
    totalValue: number
    totalProfitPercent: number
    totalInvestment: number
    totalProfit: number
  }> {
    return this.api.getPortfolioDetails(channelId)
  }
  
  public async addPosition(channelId: string, position: StockPosition): Promise<boolean> {
    return this.api.addPosition(channelId, position)
  }
  
  public removePosition(channelId: string, id: string): boolean {
    return this.api.removePosition(channelId, id)
  }
}

