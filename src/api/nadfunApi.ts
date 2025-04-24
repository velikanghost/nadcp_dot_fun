import axios from 'axios'
import {
  AccountPositionResponse,
  AccountCreatedTokensResponse,
  OrderTokenResponse,
  TokenInfoResponse,
  TokenChartResponse,
  TokenSwapResponse,
  TokenMarketResponse,
  TokenHoldersResponse,
} from './types'

// Base API URL as specified in the documentation
const BASE_URL = 'https://testnet-bot-api-server.nad.fun'

// API client for Nad.fun
export class NadfunApi {
  // Account endpoints

  /**
   * Get account positions
   * @param accountAddress The EOA address
   * @param positionType Filter by position type (all, open, close)
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getAccountPositions(
    accountAddress: string,
    positionType: 'all' | 'open' | 'close' = 'open',
    page: number = 1,
    limit: number = 10,
  ): Promise<AccountPositionResponse> {
    const url = `${BASE_URL}/account/position/${accountAddress}`
    const response = await axios.get<AccountPositionResponse>(url, {
      params: { position_type: positionType, page, limit },
    })
    return response.data
  }

  /**
   * Get tokens created by an account
   * @param accountAddress The EOA address
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getAccountCreatedTokens(
    accountAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<AccountCreatedTokensResponse> {
    const url = `${BASE_URL}/account/create_token/${accountAddress}`
    const response = await axios.get<AccountCreatedTokensResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }

  // Order endpoints

  /**
   * Get tokens ordered by creation time
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getTokensByCreationTime(
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderTokenResponse> {
    const url = `${BASE_URL}/order/creation_time`
    const response = await axios.get<OrderTokenResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }

  /**
   * Get tokens ordered by market cap
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getTokensByMarketCap(
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderTokenResponse> {
    const url = `${BASE_URL}/order/market_cap`
    const response = await axios.get<OrderTokenResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }

  /**
   * Get tokens ordered by latest trade
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getTokensByLatestTrade(
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderTokenResponse> {
    const url = `${BASE_URL}/order/latest_trade`
    const response = await axios.get<OrderTokenResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }

  // Token endpoints

  /**
   * Get token information
   * @param tokenAddress Token contract address
   */
  static async getTokenInfo(tokenAddress: string): Promise<TokenInfoResponse> {
    const url = `${BASE_URL}/token/${tokenAddress}`
    const response = await axios.get<TokenInfoResponse>(url)
    return response.data
  }

  /**
   * Get token chart data
   * @param tokenAddress Token contract address
   * @param interval Chart interval (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w)
   * @param baseTimestamp Base timestamp for the chart
   */
  static async getTokenChart(
    tokenAddress: string,
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' = '1h',
    baseTimestamp: number = Math.floor(Date.now() / 1000),
  ): Promise<TokenChartResponse> {
    const url = `${BASE_URL}/token/chart/${tokenAddress}`
    const response = await axios.get<TokenChartResponse>(url, {
      params: { interval, base_timestamp: baseTimestamp },
    })
    return response.data
  }

  /**
   * Get token swap history
   * @param tokenAddress Token contract address
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getTokenSwapHistory(
    tokenAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<TokenSwapResponse> {
    const url = `${BASE_URL}/token/swap/${tokenAddress}`
    const response = await axios.get<TokenSwapResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }

  /**
   * Get token market information
   * @param tokenAddress Token contract address
   */
  static async getTokenMarket(
    tokenAddress: string,
  ): Promise<TokenMarketResponse> {
    const url = `${BASE_URL}/token/market/${tokenAddress}`
    const response = await axios.get<TokenMarketResponse>(url)
    return response.data
  }

  /**
   * Get token holders
   * @param tokenAddress Token contract address
   * @param page Page number
   * @param limit Number of items per page
   */
  static async getTokenHolders(
    tokenAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<TokenHoldersResponse> {
    const url = `${BASE_URL}/token/holder/${tokenAddress}`
    const response = await axios.get<TokenHoldersResponse>(url, {
      params: { page, limit },
    })
    return response.data
  }
}
