import { z } from 'zod'
import { PublicClient } from 'viem'
import axios from 'axios'

// Nad.fun API endpoint for fetching token data
const NAD_FUN_API_URL = 'https://testnet-api-server.nad.fun/order/latest_trade'

// Token search schema
export const searchTokensSchema = {
  query: z.string().describe('Token name or symbol to search for'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
}

// Define the interface for search parameters
export interface SearchTokensParams {
  query: string
  limit: number
}

// Interface for API response token structure
interface TokenInfo {
  token_id: string
  name: string
  symbol: string
  image_uri: string
  description: string
  price: string
  created_at: number
  market_type: string
  is_king: boolean
  score: number
}

interface AccountInfo {
  account_id: string
  nickname: string
  image_uri: string
}

interface TokenData {
  token_info: TokenInfo
  account_info: AccountInfo
}

interface ApiResponse {
  order_type: string
  order_token: TokenData[]
  total_count: number
}

// Token search implementation
export const searchTokens = async (
  client: PublicClient,
  { query, limit }: SearchTokensParams,
) => {
  try {
    // Fetch data from Nad.fun API
    const response = await axios.get<ApiResponse>(NAD_FUN_API_URL, {
      params: {
        page: 1,
        limit: 52, // Fetch more tokens to filter through
      },
    })

    // Convert query to lowercase for case-insensitive search
    const queryLower = query.toLowerCase()

    // Filter tokens by name or symbol
    const results = response.data.order_token
      .filter((token: TokenData) => {
        const name = token.token_info.name.toLowerCase()
        const symbol = token.token_info.symbol.toLowerCase()
        return name.includes(queryLower) || symbol.includes(queryLower)
      })
      .slice(0, limit)

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No tokens found matching "${query}".`,
          },
        ],
      }
    }

    // Format results
    const formattedResults = results
      .map(
        (token: TokenData) =>
          `${token.token_info.name} (${token.token_info.symbol}):\n` +
          `- Address: ${token.token_info.token_id}\n` +
          `- Price: $${parseFloat(token.token_info.price).toLocaleString(
            'en-US',
            { maximumFractionDigits: 10 },
          )}\n` +
          `- Created: ${new Date(
            token.token_info.created_at * 1000,
          ).toLocaleString()}\n` +
          `- Market Type: ${token.token_info.market_type}\n` +
          `- Creator: ${
            token.account_info.nickname || token.account_info.account_id
          }\n` +
          `- Description: ${token.token_info.description}`,
      )
      .join('\n\n')

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${results.length} token(s) matching "${query}":\n\n${formattedResults}`,
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
