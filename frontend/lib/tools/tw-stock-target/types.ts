export interface TargetPrice {
  id: string
  price: number
  label: string
}

export interface TrackedStock {
  symbol: string
  name: string
  targets: TargetPrice[]
  currentPrice?: number
  change?: number
  changePercent?: number
  updatedAt?: string
  error?: string
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change?: number
  changePercent?: number
  updatedAt?: string
  targetPrice?: number
}

export interface DiscoveredStock {
  symbol: string
  name: string
  price: number
  targetPrice: number
  upside: number
  foreignNetBuy1Day: number
  foreignNetBuy5Day: number
}

export type ScanMode = 'short' | 'swing' | 'strong'

export interface DiscoveryResult {
  stocks: DiscoveredStock[]
  tradingDates: string[]
}
