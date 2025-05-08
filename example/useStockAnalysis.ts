import { ref, computed } from 'vue'
import type { Stock } from '~/types'

interface Analysis {
  support1: number
  support2: number
  resistance1: number
  resistance2: number
  volume: number
  rsi: number
  signal: string
  reason: string
}

export function useStockAnalysis(stock: Stock) {
  const pricePoints = ref<number[]>([])
  const volumeData = ref(0)
  const rsiData = ref(0)
  const volatilityData = ref(0)
  const analysis = ref<Analysis>({
    support1: 0,
    support2: 0,
    resistance1: 0,
    resistance2: 0,
    volume: 0,
    rsi: 0,
    signal: 'hold',
    reason: 'Loading...',
  })

  const getSignal = (current: number, support: number, resistance: number, rsi: number) => {
    if (rsi > 70) {
      return {
        signal: 'sell',
        reason: 'RSI indicates overbought conditions',
      }
    }
    if (rsi < 30) {
      return {
        signal: 'buy',
        reason: 'RSI indicates oversold conditions',
      }
    }
    if (current < support * 1.02) {
      return {
        signal: 'buy',
        reason: 'Price near support level',
      }
    }
    if (current > resistance * 0.98) {
      return {
        signal: 'sell',
        reason: 'Price near resistance level',
      }
    }
    return {
      signal: 'hold',
      reason: 'Price within normal trading range',
    }
  }

  const fetchTechnicalIndicators = async () => {
    try {
      console.log('Fetching technical indicators for:', stock.code)
      
      const url = `https://apipubaws.tcbs.com.vn/tcanalysis/v1/finance/tradingview/indicators?ticker=${stock.code}`
      console.log('Fetching from URL:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      console.log('Technical Data Response:', data)

      if (data && data.data) {
        const indicators = data.data
        volumeData.value = indicators.volume || 0
        rsiData.value = indicators.rsi || 50
        volatilityData.value = indicators.atr || 0
      }
    } catch (error) {
      console.error('Error fetching technical indicators:', error)
    }
  }

  const fetchHistoricalData = async () => {
    try {
      console.log('Fetching data for:', stock.code)
      const to = Math.floor(Date.now() / 1000)
      const from = to - (30 * 24 * 60 * 60) // 30 days

      await Promise.all([
        fetchTechnicalIndicators(),
        (async () => {
          const url = `https://apipubaws.tcbs.com.vn/stock-insight/v2/stock/bars?ticker=${stock.code}&type=stock&resolution=1&from=${from}&to=${to}&countBack=30`
          
          const response = await fetch(url)
          const data = await response.json()
          
          if (data && Array.isArray(data.data) && data.data.length > 0) {
            const prices = data.data.map(item => Number(item.close))
            pricePoints.value = prices
            
            const sortedPrices = [...prices].sort((a, b) => a - b)
            const q1 = sortedPrices[Math.floor(prices.length * 0.25)]
            const q3 = sortedPrices[Math.floor(prices.length * 0.75)]

            analysis.value = {
              support1: q1 * 0.98,
              support2: q1 * 0.95,
              resistance1: q3 * 1.02,
              resistance2: q3 * 1.05,
              volume: volumeData.value,
              rsi: rsiData.value,
              ...getSignal(stock.current, q1, q3, rsiData.value),
            }
          }
        })()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      analysis.value = {
        ...analysis.value,
        signal: 'hold',
        reason: 'Error loading data. Please try again.',
      }
    }
  }

  const signalColor = computed(() => {
    switch (analysis.value.signal) {
      case 'buy':
        return 'text-green-500'
      case 'sell':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  })

  return {
    pricePoints,
    volumeData,
    rsiData,
    volatilityData,
    analysis,
    signalColor,
    fetchHistoricalData,
  }
}
