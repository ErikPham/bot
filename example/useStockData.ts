import { reactive, onMounted, onUnmounted, watch } from 'vue'
import type { StockData, StockPosition, StockPriceResponse, StockState, Broker } from '~/types/stock'

const TAX_RATE = 0.001 // 0.1%
const API_BASE_URL = 'https://apipubaws.tcbs.com.vn/stock-insight/v2/stock'
const POLL_INTERVAL = 5000 // 5 seconds
const STORAGE_KEY = 'vnindex-stock-positions'

// Vietnam stock market hours: 9:00 AM - 3:00 PM (GMT+7)
const MARKET_OPEN_HOUR = 9
const MARKET_CLOSE_HOUR = 15

const BROKERS: Broker[] = ['TCBS', 'VPS', 'SSI', 'VND', 'MBS']

export function useStockData() {
  console.log('Initializing useStockData')
  const state = reactive<StockState>({
    stocks: [],
    isMarketOpen: false,
    selectedBroker: 'TCBS',
    brokers: BROKERS,
  })

  let pollTimer: NodeJS.Timer | null = null

  const calculateTax = (price: number, volume: number) => {
    return price * volume * TAX_RATE
  }

  const calculateProfit = (current: number, buyPrice: number, volume: number) => {
    const grossProfit = (current - buyPrice) * volume
    const tax = calculateTax(current, volume)
    return grossProfit - tax
  }

  const isMarketOpen = () => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    // Market is closed on weekends (Saturday = 6, Sunday = 0)
    if (day === 0 || day === 6) return false

    // Check if current time is within market hours
    return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR
  }

  const getLatestMarketTime = () => {
    const now = new Date()
    const hour = now.getHours()
    
    // If before market opens, use previous day's close
    if (hour < MARKET_OPEN_HOUR) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(MARKET_CLOSE_HOUR, 0, 0, 0)
      return Math.floor(yesterday.getTime() / 1000)
    }
    
    // If after market closes, use today's close
    if (hour >= MARKET_CLOSE_HOUR) {
      const today = new Date(now)
      today.setHours(MARKET_CLOSE_HOUR, 0, 0, 0)
      return Math.floor(today.getTime() / 1000)
    }
    
    // During market hours, use current time
    return Math.floor(now.getTime() / 1000)
  }

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  const fetchStockPrice = async (stock: string) => {
    try {
      const to = getLatestMarketTime()
      console.log(`Fetching price for ${stock} at ${to}`)
      const url = `${API_BASE_URL}/bars?ticker=${stock}&type=stock&resolution=1&to=${to}&countBack=1`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json() as StockPriceResponse
      console.log('API response:', data)
      
      if (data && data.data && data.data.length > 0) {
        const price = data.data[0].close
        console.log(`Got price for ${stock}:`, price)
        return price
      }
      console.log(`No price data for ${stock}`)
      return null
    } catch (error) {
      console.error(`Error fetching price for ${stock}:`, error)
      return null
    }
  }

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      console.log('Loading from storage, raw data:', stored)
      if (stored) {
        const data = JSON.parse(stored)
        state.stocks = [...data] // Create new array to trigger reactivity
        console.log('Loaded stocks from storage:', state.stocks)
      }
    } catch (error) {
      console.error('Error loading from storage:', error)
    }
  }

  const saveToStorage = () => {
    try {
      console.log('Saving stocks to storage:', state.stocks)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stocks))
      console.log('Successfully saved to storage')
    } catch (error) {
      console.error('Error saving to storage:', error)
    }
  }

  const updateStockData = async () => {
    state.isMarketOpen = isMarketOpen()
    console.log('Market open status:', state.isMarketOpen)
    console.log('Current stocks:', state.stocks)

    if (state.stocks.length === 0) {
      console.log('No stocks to update')
      return
    }

    const updatedStocks = await Promise.all(
      state.stocks.map(async (stock) => {
        const currentPrice = await fetchStockPrice(stock.code)
        if (currentPrice) {
          const tax = calculateTax(currentPrice, stock.volume)
          const profit = calculateProfit(currentPrice, stock.price, stock.volume)
          return {
            ...stock,
            current: currentPrice,
            tax,
            profit,
            total: stock.volume * currentPrice,
          }
        }
        return stock
      }),
    )
    
    // Create new array to trigger reactivity
    state.stocks = [...updatedStocks]
    console.log('Updated stocks:', state.stocks)
    saveToStorage()
  }

  const startPolling = () => {
    if (typeof pollTimer === 'number') {
      clearInterval(pollTimer)
    }
    updateStockData() // Initial update
    pollTimer = setInterval(updateStockData, POLL_INTERVAL)
    console.log('Started polling')
  }

  const addStockPosition = async (position: StockPosition) => {
    console.log('Adding stock position:', position)
    const currentPrice = await fetchStockPrice(position.code)
    console.log('Fetched current price:', currentPrice)
    
    if (currentPrice !== null && currentPrice > 0) {
      const tax = calculateTax(currentPrice, position.volume)
      const profit = calculateProfit(currentPrice, position.buyPrice, position.volume)
      const newStock: StockData = {
        id: generateId(),
        code: position.code.toUpperCase(),
        buyPrice: position.buyPrice,
        price: position.buyPrice,
        volume: position.volume,
        current: currentPrice,
        tax,
        profit,
        timestamp: Date.now(),
        total: position.volume * currentPrice,
        broker: position.broker || state.selectedBroker,
      }
      console.log('Created new stock:', newStock)
      
      // Create new array to trigger reactivity
      state.stocks = [...state.stocks, newStock]
      console.log('Updated stocks array:', state.stocks)
      saveToStorage()
      return true
    }
    return false
  }

  const removeStockPosition = (id: string) => {
    console.log('Removing stock with ID:', id)
    state.stocks = state.stocks.filter(stock => stock.id !== id)
    console.log('Updated stocks after removal:', state.stocks)
    saveToStorage()
  }

  const setSelectedBroker = (broker: Broker) => {
    console.log('Setting selected broker:', broker)
    state.selectedBroker = broker
  }

  // Watch for changes in stocks array
  watch(() => state.stocks, (newStocks) => {
    console.log('Stocks changed:', newStocks)
    saveToStorage()
  }, { deep: true })

  onMounted(() => {
    console.log('Component mounted')
    loadFromStorage()
    startPolling()
  })

  onUnmounted(() => {
    console.log('Component unmounting')
    if (typeof pollTimer === 'number') {
      clearInterval(pollTimer)
    }
  })

  return {
    state,
    addStockPosition,
    removeStockPosition,
    setSelectedBroker,
  }
}
