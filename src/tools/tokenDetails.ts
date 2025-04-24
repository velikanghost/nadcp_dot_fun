import { z } from 'zod'
import { PublicClient } from 'viem'
import { NadfunApi } from '../api/nadfunApi'

// Schema for token chart
export const tokenChartSchema = {
  tokenAddress: z.string().describe('Token contract address'),
  interval: z
    .enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
    .default('1h')
    .describe('Chart interval'),
  baseTimestamp: z
    .number()
    .optional()
    .describe('Base timestamp for the chart (current time if not provided)'),
}

// Interface for token chart parameters
export interface TokenChartParams {
  tokenAddress: string
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'
  baseTimestamp?: number
}

// Schema for token swap history
export const tokenSwapHistorySchema = {
  tokenAddress: z.string().describe('Token contract address'),
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for token swap history parameters
export interface TokenSwapHistoryParams {
  tokenAddress: string
  page?: number
  limit?: number
}

// Schema for token market information
export const tokenMarketSchema = {
  tokenAddress: z.string().describe('Token contract address'),
}

// Interface for token market parameters
export interface TokenMarketParams {
  tokenAddress: string
}

// Schema for token holders
export const tokenHoldersSchema = {
  tokenAddress: z.string().describe('Token contract address'),
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for token holders parameters
export interface TokenHoldersParams {
  tokenAddress: string
  page?: number
  limit?: number
}

// Implementation of token chart tool
export const getTokenChart = async (
  client: PublicClient,
  { tokenAddress, interval, baseTimestamp }: TokenChartParams,
) => {
  try {
    // Set default timestamp to current time if not provided
    const timestamp = baseTimestamp || Math.floor(Date.now() / 1000)

    // Fetch token chart data
    const response = await NadfunApi.getTokenChart(
      tokenAddress,
      interval,
      timestamp,
    )

    if (response.prices.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No chart data found for token ${tokenAddress}.`,
          },
        ],
      }
    }

    // Format chart data as markdown
    let chartText = `# Price Chart for Token (${tokenAddress})\n\n`
    chartText += `Interval: ${interval}\n`
    chartText += `Total data points: ${response.prices.length}\n\n`

    // Display tabular data of recent prices
    chartText += `| Time | Price |\n`
    chartText += `|------|-------|\n`

    // Show most recent 10 prices
    const recentPrices = response.prices.slice(-10)

    recentPrices.forEach((pricePoint) => {
      const time = new Date(pricePoint.timestamp * 1000).toLocaleString()
      chartText += `| ${time} | ${pricePoint.price} |\n`
    })

    // Add basic statistics
    if (response.prices.length > 0) {
      const prices = response.prices.map((p) => parseFloat(p.price))
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice =
        prices.reduce((sum, price) => sum + price, 0) / prices.length

      chartText += `\n## Statistics\n`
      chartText += `- Minimum Price: ${minPrice.toFixed(8)}\n`
      chartText += `- Maximum Price: ${maxPrice.toFixed(8)}\n`
      chartText += `- Average Price: ${avgPrice.toFixed(8)}\n`
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: chartText,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching token chart data from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token chart data: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of token swap history tool
export const getTokenSwapHistory = async (
  client: PublicClient,
  { tokenAddress, page = 1, limit = 10 }: TokenSwapHistoryParams,
) => {
  try {
    // Fetch token swap history
    const response = await NadfunApi.getTokenSwapHistory(
      tokenAddress,
      page,
      limit,
    )

    if (response.swaps.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No swap history found for token ${tokenAddress}.`,
          },
        ],
      }
    }

    // Format swap history as markdown
    let swapText = `# Swap History for Token (${tokenAddress})\n\n`
    swapText += `Found ${response.swaps.length} swaps:\n\n`

    response.swaps.forEach((swap, index) => {
      swapText += `## ${index + 1}. ${
        swap.is_buy ? 'Buy' : 'Sell'
      } on ${new Date(swap.created_at * 1000).toLocaleString()}\n`
      swapText += `- Account: ${swap.account_address}\n`
      swapText += `- MON Amount: ${swap.mon_amount}\n`
      swapText += `- Token Amount: ${swap.token_amount}\n`
      swapText += `- Transaction: ${swap.transaction_hash}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: swapText,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching token swap history from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token swap history: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of token market information tool
export const getTokenMarket = async (
  client: PublicClient,
  { tokenAddress }: TokenMarketParams,
) => {
  try {
    // Fetch token market information
    const response = await NadfunApi.getTokenMarket(tokenAddress)

    // Format market information as markdown
    let marketText = `# Market Information for Token (${tokenAddress})\n\n`
    marketText += `- Market ID: ${response.market_address}\n`
    marketText += `- Market Type: ${response.market_type}\n`
    marketText += `- Current Price: ${response.price}\n`

    if (response.virtual_native) {
      marketText += `- Virtual Native: ${response.virtual_native}\n`
    }

    if (response.virtual_token) {
      marketText += `- Virtual Token: ${response.virtual_token}\n`
    }

    if (response.reserve_token) {
      marketText += `- Reserve Token: ${response.reserve_token}\n`
    }

    if (response.reserve_native) {
      marketText += `- Reserve Native: ${response.reserve_native}\n`
    }

    if (response.latest_trade_at) {
      marketText += `- Latest Trade: ${new Date(
        response.latest_trade_at * 1000,
      ).toLocaleString()}\n`
    }

    marketText += `- Created: ${new Date(
      response.created_at * 1000,
    ).toLocaleString()}\n`

    return {
      content: [
        {
          type: 'text' as const,
          text: marketText,
        },
      ],
    }
  } catch (error) {
    console.error(
      'Error fetching token market information from Nad.fun API:',
      error,
    )
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token market information: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of token holders tool
export const getTokenHolders = async (
  client: PublicClient,
  { tokenAddress, page = 1, limit = 10 }: TokenHoldersParams,
) => {
  try {
    // Fetch token holders
    const response = await NadfunApi.getTokenHolders(tokenAddress, page, limit)

    if (response.holders.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No holders found for token ${tokenAddress}.`,
          },
        ],
      }
    }

    // Format holders as markdown
    let holdersText = `# Holders for Token (${tokenAddress})\n\n`
    holdersText += `Found ${response.holders.length} holders:\n\n`

    response.holders.forEach((holder, index) => {
      holdersText += `## ${index + 1}. ${holder.account_address}\n`
      holdersText += `- Amount: ${holder.current_amount}\n`
      holdersText += `- Developer: ${holder.is_dev ? 'Yes' : 'No'}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: holdersText,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching token holders from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token holders: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}
