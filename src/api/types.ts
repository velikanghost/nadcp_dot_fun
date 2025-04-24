// Type definitions for Nad.fun API responses

// Token types
export interface Token {
  token_address: string
  name: string
  symbol: string
  image_uri: string
  creator?: string
  total_supply?: string
  created_at: number
}

export interface TokenWithDescription extends Token {
  description?: string
  is_listing?: boolean
  market_cap?: string
  price?: string
  current_amount?: string
}

// Market types
export interface Market {
  market_address: string
  market_type: string
  price: string
}

export interface DetailedMarket extends Market {
  token_address: string
  virtual_native?: string
  virtual_token?: string
  reserve_token?: string
  reserve_native?: string
  latest_trade_at?: number
  created_at: number
}

// Position types
export interface Position {
  total_bought_native: string
  total_bought_token: string
  current_token_amount: string
  realized_pnl: string
  unrealized_pnl: string
  total_pnl: string
  created_at: number
  last_traded_at: number
}

// Account Position Response
export interface AccountPositionResponse {
  account_address: string
  positions: Array<{
    token: Token
    position: Position
    market: Market
  }>
  total_count: number
}

// Account Created Tokens Response
export interface AccountCreatedTokensResponse {
  tokens: Array<TokenWithDescription>
  total_count: number
}

// Order Token Response
export interface OrderTokenResponse {
  order_type: string
  order_token: Array<{
    token_info: {
      token_address: string
      name: string
      symbol: string
      image_uri: string
      creator: string
      total_supply: string
      created_at: number
    }
    market_info: Market
  }>
  total_count: number
}

// Token Info Response
export interface TokenInfoResponse {
  token_address: string
  name: string
  symbol: string
  image_uri: string
  creator: string
  total_supply: string
  description?: string
  is_listing?: boolean
  created_at: number
}

// Token Chart Response
export interface TokenChartResponse {
  prices: Array<{
    timestamp: number
    price: string
  }>
  token_address: string
  interval: string
  base_timestamp: number
  total_count: number
}

// Swap history types
export interface Swap {
  swap_id: number
  account_address: string
  token_address: string
  is_buy: boolean
  mon_amount: string
  token_amount: string
  created_at: number
  transaction_hash: string
}

// Token Swap Response
export interface TokenSwapResponse {
  swaps: Array<Swap>
  total_count: number
}

// Token Market Response
export interface TokenMarketResponse extends DetailedMarket {}

// Token Holder types
export interface TokenHolder {
  current_amount: string
  account_address: string
  is_dev: boolean
}

// Token Holders Response
export interface TokenHoldersResponse {
  holders: Array<TokenHolder>
  total_count: number
}
