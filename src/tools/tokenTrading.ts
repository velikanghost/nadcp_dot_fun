import { z } from 'zod'
import { PublicClient } from 'viem'
import { parseEther } from 'viem/utils'
import {
  buyFromCore,
  exactOutBuyFromCore,
  buyFromDex,
  sellToDex,
} from '../api/nadfunRpc'
import { NadfunApi } from '../api/nadfunApi'

// Schema for buying tokens from bonding curve
export const buyFromCurveSchema = {
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
}

// Interface for buying tokens from bonding curve parameters
export interface BuyFromCurveParams {
  privateKey: string
  tokenAddress: string
  amount: string
}

// Schema for buying exact amount of tokens from bonding curve
export const exactOutBuyFromCurveSchema = {
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  tokenAddress: z.string().describe('Token contract address to buy'),
  tokensOut: z.string().describe('Exact amount of tokens to receive'),
}

// Interface for buying exact amount of tokens parameters
export interface ExactOutBuyFromCurveParams {
  privateKey: string
  tokenAddress: string
  tokensOut: string
}

// Schema for buying tokens from DEX
export const buyFromDexSchema = {
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
  slippage: z
    .number()
    .optional()
    .default(0.5)
    .describe('Slippage percentage (default 0.5%)'),
}

// Interface for buying tokens from DEX parameters
export interface BuyFromDexParams {
  privateKey: string
  tokenAddress: string
  amount: string
  slippage?: number
}

// Schema for selling tokens to DEX
export const sellToDexSchema = {
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  tokenAddress: z.string().describe('Token contract address to sell'),
  amount: z.string().describe('Amount of tokens to sell'),
  slippage: z
    .number()
    .optional()
    .default(0.5)
    .describe('Slippage percentage (default 0.5%)'),
}

// Interface for selling tokens to DEX parameters
export interface SellToDexParams {
  privateKey: string
  tokenAddress: string
  amount: string
  slippage?: number
}

// Implementation of buying tokens from curve tool
export const buyTokensFromCurve = async (
  client: PublicClient,
  { privateKey, tokenAddress, amount }: BuyFromCurveParams,
) => {
  try {
    // First, verify that the token is in bonding curve phase
    const marketInfo = await NadfunApi.getTokenMarket(tokenAddress)

    if (marketInfo.market_type !== 'CURVE') {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is not in the bonding curve phase. It is already listed on DEX. Use the buyTokensFromDex tool instead.`,
          },
        ],
      }
    }

    // Calculate estimated output amount (basic estimate)
    const virtualNative = BigInt(marketInfo.virtual_native || '0')
    const virtualToken = BigInt(marketInfo.virtual_token || '0')
    const amountInWei = parseEther(amount)

    // Constant product formula k = virtualNative * virtualToken
    // New virtualNative = oldVirtualNative + amountIn
    // New virtualToken = k / newVirtualNative
    // tokensOut = oldVirtualToken - newVirtualToken
    const k = virtualNative * virtualToken
    const newVirtualNative = virtualNative + amountInWei
    const newVirtualToken = k / newVirtualNative
    const estimatedTokensOut = virtualToken - newVirtualToken

    // Execute transaction
    const txHash = await buyFromCore(privateKey, tokenAddress, amount)

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully initiated purchase of approximately ${estimatedTokensOut.toString()} tokens for ${amount} MON.\n\nTransaction hash: ${txHash}\n\nNote: The exact token amount may vary slightly depending on other transactions that may have occurred.`,
        },
      ],
    }
  } catch (error) {
    console.error('Error buying tokens from curve:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error buying tokens from curve: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of buying exact amount of tokens from curve tool
export const exactOutBuyTokensFromCurve = async (
  client: PublicClient,
  { privateKey, tokenAddress, tokensOut }: ExactOutBuyFromCurveParams,
) => {
  try {
    // First, verify that the token is in bonding curve phase
    const marketInfo = await NadfunApi.getTokenMarket(tokenAddress)

    if (marketInfo.market_type !== 'CURVE') {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is not in the bonding curve phase. It is already listed on DEX. Use the buyTokensFromDex tool instead.`,
          },
        ],
      }
    }

    // Check available tokens - Calculate from reserve_token and reserve_native if they exist
    // In the bonding curve, available tokens = reserve_token - (remaining tokens sold)
    const reserveToken = BigInt(marketInfo.reserve_token || '0')
    // We can estimate the target/sold tokens by subtracting reserve_native from reserve_token
    // This is an approximation since we don't have direct access to target_token
    const soldTokens = BigInt(marketInfo.reserve_native || '0')
    const availableTokens =
      reserveToken > soldTokens ? reserveToken - soldTokens : 0n
    const requestedTokens = parseEther(tokensOut)

    if (requestedTokens > availableTokens) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `The requested token amount (${tokensOut}) exceeds the available supply. Maximum available: ${availableTokens.toString()}`,
          },
        ],
      }
    }

    // Calculate estimated input amount
    const virtualNative = BigInt(marketInfo.virtual_native || '0')
    const virtualToken = BigInt(marketInfo.virtual_token || '0')
    const k = virtualNative * virtualToken

    // Formula: (k / (virtualToken - tokensOut)) - virtualNative
    const estimatedAmountIn =
      k / (virtualToken - requestedTokens) - virtualNative
    const estimatedTotalCost =
      estimatedAmountIn + (estimatedAmountIn * 10n) / 1000n // Include 1% fee

    // Execute transaction
    const txHash = await exactOutBuyFromCore(
      privateKey,
      tokenAddress,
      requestedTokens,
    )

    // Check if this purchase might trigger DEX listing
    let additionalInfo = ''
    if (requestedTokens >= availableTokens) {
      additionalInfo =
        '\n\nThis purchase will consume the remaining tokens in the bonding curve and trigger DEX listing for this token.'
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully initiated purchase of exactly ${tokensOut} tokens for approximately ${estimatedTotalCost.toString()} MON (including fee).${additionalInfo}\n\nTransaction hash: ${txHash}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error buying exact tokens from curve:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error buying exact tokens from curve: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of buying tokens from DEX tool
export const buyTokensFromDex = async (
  client: PublicClient,
  { privateKey, tokenAddress, amount, slippage = 0.5 }: BuyFromDexParams,
) => {
  try {
    // Check if the token is in DEX phase
    const tokenInfo = await NadfunApi.getTokenInfo(tokenAddress)

    if (!tokenInfo.is_listing) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is not listed on DEX yet. It is still in the bonding curve phase. Use the buyTokensFromCurve tool instead.`,
          },
        ],
      }
    }

    // Execute transaction
    const txHash = await buyFromDex(privateKey, tokenAddress, amount, slippage)

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully initiated purchase of tokens for ${amount} MON with ${slippage}% slippage.\n\nTransaction hash: ${txHash}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error buying tokens from DEX:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error buying tokens from DEX: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of selling tokens to DEX tool
export const sellTokensToDex = async (
  client: PublicClient,
  { privateKey, tokenAddress, amount, slippage = 0.5 }: SellToDexParams,
) => {
  try {
    // Check if the token is in DEX phase
    const tokenInfo = await NadfunApi.getTokenInfo(tokenAddress)

    if (!tokenInfo.is_listing) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is not listed on DEX yet. It is still in the bonding curve phase. Tokens cannot be sold or transferred in the bonding curve phase.`,
          },
        ],
      }
    }

    // Execute transaction
    const txHash = await sellToDex(privateKey, tokenAddress, amount, slippage)

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully initiated sale of ${amount} tokens with ${slippage}% slippage.\n\nTransaction hash: ${txHash}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error selling tokens to DEX:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error selling tokens to DEX: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}
