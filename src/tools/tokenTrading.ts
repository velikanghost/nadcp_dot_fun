import { z } from 'zod'
import { PublicClient } from 'viem'
import { parseEther, formatEther } from 'viem/utils'
import {
  buyFromCore,
  exactOutBuyFromCore,
  buyFromDex,
  sellToDex,
  getPrivateKeyFromEnv,
} from '../api/nadfunRpc'
import { NadfunApi } from '../api/nadfunApi'
import { createClient } from 'redis'

// Schema for buying tokens from bonding curve
export const buyFromCurveSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
  privateKey: z
    .string()
    .optional()
    .describe('Private key of the sender (will not be stored)'),
  sessionId: z
    .string()
    .optional()
    .describe('Session ID for authenticated users'),
}

// Interface for buying tokens from bonding curve parameters
export interface BuyFromCurveParams {
  tokenAddress: string
  amount: string
  privateKey?: string
  sessionId?: string
}

// Schema for buying exact amount of tokens from bonding curve
export const exactOutBuyFromCurveSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  tokensOut: z.string().describe('Exact amount of tokens to receive'),
  privateKey: z
    .string()
    .optional()
    .describe('Private key of the sender (will not be stored)'),
  sessionId: z
    .string()
    .optional()
    .describe('Session ID for authenticated users'),
}

// Interface for buying exact amount of tokens parameters
export interface ExactOutBuyFromCurveParams {
  tokenAddress: string
  tokensOut: string
  privateKey?: string
  sessionId?: string
}

// Schema for buying tokens from DEX
export const buyFromDexSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
  slippage: z
    .number()
    .optional()
    .default(0.5)
    .describe('Slippage percentage (default 0.5%)'),
  privateKey: z
    .string()
    .optional()
    .describe('Private key of the sender (will not be stored)'),
  sessionId: z
    .string()
    .optional()
    .describe('Session ID for authenticated users'),
}

// Interface for buying tokens from DEX parameters
export interface BuyFromDexParams {
  tokenAddress: string
  amount: string
  slippage?: number
  privateKey?: string
  sessionId?: string
}

// Schema for selling tokens to DEX
export const sellToDexSchema = {
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
  tokenAddress: string
  amount: string
  slippage?: number
}

// Add this helper function to get wallet information from session
export async function getWalletFromSession(sessionId: string) {
  // Skip if no session ID
  if (!sessionId) {
    return null
  }

  // Get Redis URL from environment
  const redisUrl = process.env.REDIS_REMOTE_REDIS_URL || process.env.KV_URL
  if (!redisUrl) {
    return null
  }

  try {
    // Connect to Redis
    const redis = createClient({ url: redisUrl })
    redis.on('error', (err) => console.error('Redis error', err))

    await redis.connect()

    // Get auth data
    const authData = await redis.get(`auth:${sessionId}`)
    await redis.disconnect()

    // If no auth data, return null
    if (!authData) {
      return null
    }

    // Parse auth data and return wallet if available
    const authInfo = JSON.parse(authData)
    return authInfo.wallet || null
  } catch (error) {
    console.error('Error retrieving wallet from session:', error)
    return null
  }
}

// Implementation of buying tokens from curve tool
export const buyTokensFromCurve = async (
  client: PublicClient,
  { tokenAddress, amount }: BuyFromCurveParams,
) => {
  try {
    // Get private key from environment variables
    const privateKey = getPrivateKeyFromEnv()

    // Validate amount to ensure it's a proper number
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid amount: ${amount}. Please provide a positive number.`,
          },
        ],
      }
    }

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

    // Get token info for symbol
    const tokenInfo = await NadfunApi.getTokenInfo(tokenAddress)
    let tokenSymbol = tokenInfo.symbol || 'tokens'

    // Get wallet address from private key to check positions later
    const { createWalletClientFromPrivateKey } = await import(
      '../api/nadfunRpc'
    )
    const walletClient = createWalletClientFromPrivateKey(privateKey)
    const walletAddress = walletClient.account?.address

    // Get positions before purchase to compare later
    let tokenAmountBefore = 0
    try {
      const positionsBefore = await NadfunApi.getAccountPositions(
        walletAddress as string,
        'open',
      )
      const tokenPosition = positionsBefore.positions.find(
        (p) =>
          p.token.token_address.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        tokenAmountBefore = parseFloat(
          formatEther(BigInt(tokenPosition.position.current_token_amount)),
        )
        tokenSymbol = tokenPosition.token.symbol
      }
    } catch (error) {
      console.error('Error fetching positions before purchase:', error)
    }

    // Verify available tokens
    const reserveToken = BigInt(marketInfo.reserve_token || '0')
    const soldTokens = BigInt(marketInfo.reserve_native || '0')
    const availableTokens =
      reserveToken > soldTokens ? reserveToken - soldTokens : 0n

    if (availableTokens <= 0n) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No tokens available for purchase. This token may be fully sold out or already listed on DEX.`,
          },
        ],
      }
    }

    // Estimate tokens received
    const virtualNative = BigInt(marketInfo.virtual_native || '0')
    const virtualToken = BigInt(marketInfo.virtual_token || '0')
    const amountInWei = parseEther(amount)

    // Use conservative estimate (some tokens might be sold between estimate and transaction)
    const k = virtualNative * virtualToken
    const newVirtualNative = virtualNative + amountInWei
    const newVirtualToken = k / newVirtualNative
    const estimatedTokensOut = virtualToken - newVirtualToken

    // Ensure we don't try to buy more than available
    if (estimatedTokensOut > availableTokens) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `The requested MON amount would buy more tokens than available. Maximum available: ${availableTokens.toString()} tokens. Please use a smaller amount or use exactOutBuy to purchase the exact remaining tokens.`,
          },
        ],
      }
    }

    // Execute transaction with proper error handling
    try {
      const txHash = await buyFromCore(privateKey, tokenAddress, amount)

      // Wait for transaction receipt and check status
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      })
      if (receipt.status !== 'success') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Transaction failed: Transaction reverted or ran out of gas.`,
            },
          ],
        }
      }

      // Get positions after purchase to calculate tokens received
      let tokenAmountReceived = 0
      try {
        // Wait a short time for blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 3000))

        const positionsAfter = await NadfunApi.getAccountPositions(
          walletAddress as string,
          'open',
        )
        const tokenPosition = positionsAfter.positions.find(
          (p) =>
            p.token.token_address.toLowerCase() === tokenAddress.toLowerCase(),
        )
        if (tokenPosition) {
          const tokenAmountAfter = parseFloat(
            formatEther(BigInt(tokenPosition.position.current_token_amount)),
          )
          tokenAmountReceived = tokenAmountAfter - tokenAmountBefore
          tokenSymbol = tokenPosition.token.symbol
        }
      } catch (error) {
        console.error('Error fetching positions after purchase:', error)
      }

      // Format estimatedTokensOut from wei to standard units
      const estimatedTokensOutStandard = parseFloat(
        formatEther(estimatedTokensOut),
      ).toFixed(5)

      let message = `Successfully purchased approximately ${estimatedTokensOutStandard} ${tokenSymbol} for ${amount} MON.`
      if (tokenAmountReceived > 0) {
        message = `Successfully purchased ${tokenAmountReceived.toFixed(
          5,
        )} ${tokenSymbol} for ${amount} MON.`
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `${message}\n\nTransaction hash: ${txHash}`,
          },
        ],
      }
    } catch (txError: any) {
      // Handle specific transaction errors
      console.log('txError', txError)
      if (txError.message && txError.message.includes('insufficient balance')) {
        // Calculate total cost including fee
        const amountInWei = parseEther(amount)
        const fee = (amountInWei * 10n) / 1000n
        const totalCost = amountInWei + fee

        return {
          content: [
            {
              type: 'text' as const,
              text: `Transaction failed: Insufficient balance. The total cost including 1% fee is ${totalCost.toString()} wei (${amount} MON + ${fee.toString()} wei fee). Please ensure your wallet has enough MON to cover this amount plus gas fees.`,
            },
          ],
        }
      }

      // Generic error handling
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error buying tokens from curve: ${
              txError.message || 'Unknown error'
            }. Please try again later.`,
          },
        ],
      }
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
  { tokenAddress, tokensOut }: ExactOutBuyFromCurveParams,
) => {
  try {
    // Get private key from environment variables
    const privateKey = getPrivateKeyFromEnv()

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
export async function buyTokensFromDex(
  client: PublicClient,
  {
    tokenAddress,
    amount,
    slippage = 0.5,
    privateKey,
    sessionId,
  }: BuyFromDexParams,
) {
  try {
    // First check if there's a session with a wallet
    let walletInfo = null
    if (sessionId) {
      walletInfo = await getWalletFromSession(sessionId)
    }

    // If we have a wallet from the session, use it
    if (walletInfo) {
      // Make API call to the wallet endpoint to process the transaction
      const response = await fetch(`/api/wallet?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'send_transaction',
          params: {
            to: tokenAddress, // The contract address
            amount: amount, // The amount to send
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transaction failed')
      }

      const result = await response.json()
      return {
        content: [
          {
            type: 'text' as const,
            text: `Transaction sent using your authenticated wallet: ${result.transaction.hash}\nWait for confirmation...`,
          },
        ],
      }
    }

    // Otherwise, fall back to using the provided private key
    if (!privateKey) {
      throw new Error(
        'PRIVATE_KEY not found and no authenticated wallet available. Please provide a private key or authenticate with Google.',
      )
    }

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

    // Get wallet address from private key to check positions later
    const { createWalletClientFromPrivateKey } = await import(
      '../api/nadfunRpc'
    )
    const walletClient = createWalletClientFromPrivateKey(privateKey)
    const walletAddress = walletClient.account?.address

    // Get positions before purchase to compare later
    let tokenAmountBefore = 0
    let tokenSymbol = tokenInfo.symbol || 'tokens'
    try {
      const positionsBefore = await NadfunApi.getAccountPositions(
        walletAddress as string,
        'open',
      )
      const tokenPosition = positionsBefore.positions.find(
        (p) =>
          p.token.token_address.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        tokenAmountBefore = parseFloat(
          formatEther(BigInt(tokenPosition.position.current_token_amount)),
        )
        tokenSymbol = tokenPosition.token.symbol
      }
    } catch (error) {
      console.error('Error fetching positions before purchase:', error)
    }

    // Execute transaction
    const txHash = await buyFromDex(privateKey, tokenAddress, amount, slippage)

    // Wait for transaction receipt and check status
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    })
    if (receipt.status !== 'success') {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Transaction failed: Transaction reverted or ran out of gas.`,
          },
        ],
      }
    }

    // Get positions after purchase to calculate tokens received
    let tokenAmountReceived = 0
    try {
      // Wait a short time for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const positionsAfter = await NadfunApi.getAccountPositions(
        walletAddress as string,
        'open',
      )
      const tokenPosition = positionsAfter.positions.find(
        (p) =>
          p.token.token_address.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        const tokenAmountAfter = parseFloat(
          formatEther(BigInt(tokenPosition.position.current_token_amount)),
        )
        tokenAmountReceived = tokenAmountAfter - tokenAmountBefore
        tokenSymbol = tokenPosition.token.symbol
      }
    } catch (error) {
      console.error('Error fetching positions after purchase:', error)
    }

    let message = `Successfully purchased tokens for ${amount} MON with ${slippage}% slippage.`
    if (tokenAmountReceived > 0) {
      message = `Successfully purchased ${tokenAmountReceived.toFixed(
        5,
      )} ${tokenSymbol} for ${amount} MON with ${slippage}% slippage.`
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `${message}\n\nTransaction hash: ${txHash}`,
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
  { tokenAddress, amount, slippage = 0.5 }: SellToDexParams,
) => {
  try {
    // Get private key from environment variables
    const privateKey = getPrivateKeyFromEnv()

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

    // Convert amount to standard units for display
    const amountStandard = parseFloat(amount).toFixed(5)

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully initiated sale of ${amountStandard} tokens with ${slippage}% slippage.\n\nTransaction hash: ${txHash}`,
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
