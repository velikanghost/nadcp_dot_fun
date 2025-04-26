import { z } from 'zod'
import { PublicClient } from 'viem'
import { getMarketTypeInfo, getMarketTypeComparison } from '../api/marketInfo'
import { NadfunApi } from '../api/nadfunApi'

// Schema for getting market type information
export const marketTypeInfoSchema = {
  marketType: z
    .enum(['CURVE', 'DEX'])
    .describe('Market type to get information about'),
}

// Interface for market type info parameters
export interface MarketTypeInfoParams {
  marketType: 'CURVE' | 'DEX'
}

// Schema for getting market type comparison
export const marketTypeComparisonSchema = {
  // No parameters needed
}

// Interface for market type comparison parameters
export interface MarketTypeComparisonParams {}

// Schema for getting token market phase
export const tokenMarketPhaseSchema = {
  tokenAddress: z.string().describe('Token contract address to check'),
}

// Interface for token market phase parameters
export interface TokenMarketPhaseParams {
  tokenAddress: string
}

// Implementation of market type info tool
export const getMarketTypeInfoTool = async (
  client: PublicClient,
  { marketType }: MarketTypeInfoParams,
) => {
  try {
    const marketInfo = getMarketTypeInfo(marketType)

    return {
      content: [
        {
          type: 'text' as const,
          text: marketInfo.description,
        },
      ],
    }
  } catch (error) {
    console.error('Error getting market type info:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting market type information: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of market type comparison tool
export const getMarketTypeComparisonTool = async (
  client: PublicClient,
  params: MarketTypeComparisonParams,
) => {
  try {
    const comparison = getMarketTypeComparison()

    return {
      content: [
        {
          type: 'text' as const,
          text: comparison.description,
        },
      ],
    }
  } catch (error) {
    console.error('Error getting market type comparison:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting market type comparison: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of token market phase tool
export const getTokenMarketPhaseTool = async (
  client: PublicClient,
  { tokenAddress }: TokenMarketPhaseParams,
) => {
  try {
    // Get the token market data
    const marketData = await NadfunApi.getTokenMarket(tokenAddress)
    const tokenInfo = await NadfunApi.getTokenInfo(tokenAddress)

    // Determine the phase
    const marketType = marketData.market_type
    const isListed = tokenInfo.is_listing

    // Provide detailed information based on the market type
    let phaseInfo = ''

    if (marketType === 'CURVE') {
      // Calculate available tokens if it's in the bonding curve phase
      const reserveToken = marketData.reserve_token
        ? BigInt(marketData.reserve_token)
        : 0n
      const targetToken = marketData.reserve_token
        ? BigInt(marketData.reserve_token) -
          BigInt(marketData.reserve_native || '0')
        : 0n
      const availableTokens = reserveToken - targetToken

      phaseInfo = `
# Token Market Phase: Bonding Curve

This token (${tokenAddress}) is currently in the **Bonding Curve** phase.

## Current Status
- Market Type: CURVE
- Token Name: ${tokenInfo.name}
- Symbol: ${tokenInfo.symbol}
- Current Price: ${marketData.price} MON
- Available Tokens: ${availableTokens.toString()}
- Virtual Native: ${marketData.virtual_native}
- Virtual Token: ${marketData.virtual_token}

## What This Means
- Tokens can be purchased through the bonding curve mechanism
- Tokens **cannot be transferred** in this phase
- The price follows a mathematical formula (constant product)
- When all available tokens are purchased, the token will be automatically listed on DEX

## How to Trade
- Use the \`buy-tokens-from-curve\` tool to purchase tokens with MON
- If you want to purchase the exact remaining tokens, use the \`exact-out-buy-tokens-from-curve\` tool
      `
    } else if (marketType === 'DEX') {
      phaseInfo = `
# Token Market Phase: DEX

This token (${tokenAddress}) is currently in the **DEX** phase.

## Current Status
- Market Type: DEX
- Token Name: ${tokenInfo.name}
- Symbol: ${tokenInfo.symbol}
- Current Price: ${marketData.price} MON
- Listed on DEX: ${isListed ? 'Yes' : 'No'}

## What This Means
- Tokens can be freely transferred like standard ERC-20 tokens
- Trading happens through the DEX (Uniswap-compatible)
- Price is determined by market supply and demand
- Liquidity is provided through MON/Token trading pairs

## How to Trade
- Use the \`buy-tokens-from-dex\` tool to purchase tokens with MON
- Use the \`sell-tokens-to-dex\` tool to sell tokens for MON
- Always set a slippage tolerance (default 0.5%) to account for price movement
      `
    } else {
      phaseInfo = `
# Token Market Phase: Unknown

This token (${tokenAddress}) has an unknown market type: ${marketType}.

## Current Status
- Market Type: ${marketType}
- Token Name: ${tokenInfo.name}
- Symbol: ${tokenInfo.symbol}
- Listed on DEX: ${isListed ? 'Yes' : 'No'}

Please check with Nad.fun support for more information about this market type.
      `
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: phaseInfo,
        },
      ],
    }
  } catch (error) {
    console.error('Error getting token market phase:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting token market phase: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}
