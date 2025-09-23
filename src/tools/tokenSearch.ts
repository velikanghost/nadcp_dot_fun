import { z } from 'zod'
import { PublicClient } from 'viem'
import axios from 'axios'

// Nad.fun API endpoint for fetching token data
const NAD_FUN_API_URL = 'https://testnet-v3-api.nad.fun/search'

interface SearchTokenData {
  token_info: SearchTokenInfo
  price: string
  market_cap: string
  created_at: number
}

// Interface for API response token structure
interface SearchTokenInfo {
  token_id: string
  name: string
  symbol: string
  image_uri: string
}

interface AccountInfo {
  account_id: string
  nickname: string
  image_uri: string
}

interface ApiResponse {
  accounts: {
    accounts: AccountInfo[]
    total_count: number
  }
  tokens: {
    tokens: SearchTokenData[]
    total_count: number
  }
}

// Token search implementation
export const searchTokens = async (client: PublicClient, keyword: string) => {
  try {
    // Fetch data from Nad.fun API
    const response = await axios.get<ApiResponse>(
      NAD_FUN_API_URL + '/' + keyword,
    )

    if (response.data.tokens.total_count === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No tokens found matching "${keyword}".`,
          },
        ],
      }
    }

    // Format results
    const formattedResults = response.data.tokens.tokens
      .map(
        (token: SearchTokenData) =>
          `${token.token_info.name} (${token.token_info.symbol}):\n` +
          `- Address: ${token.token_info.token_id}\n` +
          `- Price: $${parseFloat(token.price).toLocaleString('en-US', {
            maximumFractionDigits: 10,
          })}\n` +
          `- Created: ${new Date(token.created_at * 1000).toLocaleString()}\n` +
          `- Market Cap: ${token.market_cap}\n`,
      )
      .join('\n\n')

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${response.data.tokens.total_count} token(s) matching "${keyword}":\n\n${formattedResults}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching token data from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token data: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}
