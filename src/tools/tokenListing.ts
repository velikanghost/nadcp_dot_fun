import { z } from 'zod'
import { PublicClient } from 'viem'
import { NadfunApi } from '../api/nadfunApi'

// Schema for listing tokens by creation time
export const listTokensByCreationTimeSchema = {
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for listing tokens by creation time parameters
export interface ListTokensByCreationTimeParams {
  page?: number
  limit?: number
}

// Schema for listing tokens by market cap
export const listTokensByMarketCapSchema = {
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for listing tokens by market cap parameters
export interface ListTokensByMarketCapParams {
  page?: number
  limit?: number
}

// Schema for listing tokens by latest trade
export const listTokensByLatestTradeSchema = {
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for listing tokens by latest trade parameters
export interface ListTokensByLatestTradeParams {
  page?: number
  limit?: number
}

// Implementation of listing tokens by creation time tool
export const listTokensByCreationTime = async (
  client: PublicClient,
  { page = 1, limit = 10 }: ListTokensByCreationTimeParams,
) => {
  try {
    // Fetch tokens ordered by creation time
    const response = await NadfunApi.getTokensByCreationTime(page, limit)

    if (response.order_token.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No tokens found.',
          },
        ],
      }
    }

    // Format tokens as markdown
    let tokensText = `# Newest Tokens on Nad.fun\n\n`
    tokensText += `Found ${response.total_count} tokens (ordered by creation time):\n\n`

    response.order_token.forEach((item, index) => {
      const tokenInfo = item.token_info
      const accountInfo = item.account_info

      tokensText += `## ${index + 1}. ${tokenInfo.name} (${tokenInfo.symbol})\n`
      tokensText += `- Token Address: ${tokenInfo.token_id}\n`
      tokensText += `- Market Cap: ${tokenInfo.market_cap}\n`
      tokensText += `- Creator: ${accountInfo.nickname}\n`
      tokensText += `- Description: ${tokenInfo.description}\n`
      tokensText += `- Total Supply: ${tokenInfo.reserve_token}\n`
      tokensText += `- Market Type: ${tokenInfo.market_type}\n`
      tokensText += `- Created: ${new Date(
        tokenInfo.created_at * 1000,
      ).toLocaleString()}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: tokensText,
        },
      ],
    }
  } catch (error) {
    console.error(
      'Error fetching tokens by creation time from Nad.fun API:',
      error,
    )
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching tokens: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of listing tokens by market cap tool
export const listTokensByMarketCap = async (
  client: PublicClient,
  { page = 1, limit = 10 }: ListTokensByMarketCapParams,
) => {
  try {
    // Fetch tokens ordered by market cap
    const response = await NadfunApi.getTokensByMarketCap(page, limit)

    if (response.order_token.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No tokens found.',
          },
        ],
      }
    }

    // Format tokens as markdown
    let tokensText = `# Top Tokens by Market Cap on Nad.fun\n\n`
    tokensText += `Found ${response.order_token.length} tokens (ordered by market cap):\n\n`

    response.order_token.forEach((item, index) => {
      const tokenInfo = item.token_info
      const accountInfo = item.account_info

      tokensText += `## ${index + 1}. ${tokenInfo.name} (${tokenInfo.symbol})\n`
      tokensText += `- Token Address: ${tokenInfo.token_id}\n`
      tokensText += `- Market Cap: ${tokenInfo.market_cap}\n`
      tokensText += `- Creator: ${accountInfo.nickname}\n`
      tokensText += `- Total Supply: ${tokenInfo.reserve_token}\n`
      tokensText += `- Market Type: ${tokenInfo.market_type}\n`
      tokensText += `- Created: ${new Date(
        tokenInfo.created_at * 1000,
      ).toLocaleString()}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: tokensText,
        },
      ],
    }
  } catch (error) {
    console.error(
      'Error fetching tokens by market cap from Nad.fun API:',
      error,
    )
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching tokens: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of listing tokens by latest trade tool
export const listTokensByLatestTrade = async (
  client: PublicClient,
  { page = 1, limit = 10 }: ListTokensByLatestTradeParams,
) => {
  try {
    // Fetch tokens ordered by latest trade
    const response = await NadfunApi.getTokensByLatestTrade(page, limit)

    if (response.order_token.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No tokens found.',
          },
        ],
      }
    }

    // Format tokens as markdown
    let tokensText = `# Most Recently Traded Tokens on Nad.fun\n\n`
    tokensText += `Found ${response.order_token.length} tokens (ordered by latest trade):\n\n`

    response.order_token.forEach((item, index) => {
      const tokenInfo = item.token_info
      const accountInfo = item.account_info

      tokensText += `## ${index + 1}. ${tokenInfo.name} (${tokenInfo.symbol})\n`
      tokensText += `- Token Address: ${tokenInfo.token_id}\n`
      tokensText += `- Market Cap: ${tokenInfo.market_cap}\n`
      tokensText += `- Creator: ${accountInfo.nickname}\n`
      tokensText += `- Description: ${tokenInfo.description}\n`
      tokensText += `- Total Supply: ${tokenInfo.reserve_token}\n`
      tokensText += `- Market Type: ${tokenInfo.market_type}\n`
      tokensText += `- Created: ${new Date(
        tokenInfo.created_at * 1000,
      ).toLocaleString()}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: tokensText,
        },
      ],
    }
  } catch (error) {
    console.error(
      'Error fetching tokens by latest trade from Nad.fun API:',
      error,
    )
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching tokens: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}
