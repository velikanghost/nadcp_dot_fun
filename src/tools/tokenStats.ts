import { z } from 'zod'
import { PublicClient } from 'viem'
import axios from 'axios'

// Nad.fun API endpoints
const NAD_FUN_API_BASE = 'https://testnet-api-server.nad.fun'
const NAD_FUN_TOKEN_INFO = (tokenId: string) =>
  `${NAD_FUN_API_BASE}/token/${tokenId}`

// Token stats schema
export const tokenStatsSchema = {
  tokenAddress: z.string().describe('Token name or contract address'),
}

// Define the interface for token stats parameters
export interface TokenStatsParams {
  tokenAddress: string
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
  reserve_token?: string
  reply_count?: string
}

interface AccountInfo {
  account_id: string
  nickname: string
  image_uri: string
  follower_count?: number
  following_count?: number
}

interface TokenData {
  token_info: TokenInfo
  account_info: AccountInfo
}

interface ApiListResponse {
  order_type: string
  order_token: TokenData[]
  total_count: number
}

// API response structure for token details
interface TokenResponse {
  token: {
    token_id: string
    name: string
    symbol: string
    image_uri: string
    description: string
    twitter: string
    telegram: string
    website: string
    is_listing: boolean
    created_at: number
    create_transaction_hash: string
    account_info: {
      account_id: string
      nickname: string
      image_uri: string
      follower_count: number
      following_count: number
    }
    is_king: boolean
    is_king_created_at: number
    total_supply: string
  }
}

// Token stats implementation
export const getTokenStats = async (
  client: PublicClient,
  { tokenAddress }: TokenStatsParams,
) => {
  try {
    // Fetch token details from the API
    const tokenInfoResponse = await axios.get<TokenResponse>(
      NAD_FUN_TOKEN_INFO(tokenAddress),
    )
    const tokenInfo = tokenInfoResponse.data.token

    if (!tokenInfo) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No token found with address "${tokenAddress}".`,
          },
        ],
      }
    }

    // Format total supply in a more readable way
    const totalSupply = tokenInfo.total_supply
      ? formatTokenAmount(tokenInfo.total_supply)
      : 'N/A'

    // Format token details
    let tokenDetails =
      `# ${tokenInfo.name} (${tokenInfo.symbol})\n\n` +
      `## Basic Information\n` +
      `- Address: ${tokenInfo.token_id}\n` +
      `- Total Supply: ${totalSupply}\n` +
      `- Description: ${tokenInfo.description}\n` +
      `- Creator: ${tokenInfo.account_info.account_id}\n` +
      `- Created: ${new Date(tokenInfo.created_at * 1000).toLocaleString()}\n`

    // Add social links if they exist
    if (tokenInfo.twitter || tokenInfo.telegram || tokenInfo.website) {
      tokenDetails += '\n## Links\n'
      if (tokenInfo.website) tokenDetails += `- Website: ${tokenInfo.website}\n`
      if (tokenInfo.twitter) tokenDetails += `- Twitter: ${tokenInfo.twitter}\n`
      if (tokenInfo.telegram)
        tokenDetails += `- Telegram: ${tokenInfo.telegram}\n`
    }

    // Add king status if applicable
    if (tokenInfo.is_king) {
      tokenDetails += '\n## Status\n'
      tokenDetails += `- King Status: Yes (since ${new Date(
        tokenInfo.is_king_created_at * 1000,
      ).toLocaleString()})\n`
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: tokenDetails,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching token stats from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching token stats: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Helper function to format large token amounts in a readable way
function formatTokenAmount(amount: string): string {
  try {
    // Handle scientific notation (e.g., "1000e+24")
    if (amount.includes('e+')) {
      const [base, exponent] = amount.split('e+')
      const baseNum = parseFloat(base)
      const exp = parseInt(exponent)

      // For very large numbers, return in scientific notation with suffix
      if (exp >= 24) {
        const quadrillions = baseNum * Math.pow(10, exp - 24)
        return `${quadrillions.toLocaleString()} quadrillion`
      } else if (exp >= 18) {
        const quintillions = baseNum * Math.pow(10, exp - 18)
        return `${quintillions.toLocaleString()} quintillion`
      } else if (exp >= 15) {
        const quadrillions = baseNum * Math.pow(10, exp - 15)
        return `${quadrillions.toLocaleString()} quadrillion`
      } else {
        return Number(amount).toLocaleString()
      }
    }

    // For regular numbers
    return Number(amount).toLocaleString()
  } catch (e) {
    return amount // Return as-is if parsing fails
  }
}
