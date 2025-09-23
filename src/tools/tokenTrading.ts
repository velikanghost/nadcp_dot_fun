import { z } from 'zod'
import { PublicClient } from 'viem'
import { parseEther, formatEther } from 'viem/utils'
import {
  buyFromBondingCurve,
  exactOutBuyFromBondingCurve,
  buyFromDex,
  sellToDex,
  getPrivateKeyFromEnv,
} from '../api/nadfunRpc'
import { NadfunApi } from '../api/nadfunApi'

// Schema for buying tokens from bonding curve
export const buyFromCurveSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
}

// Interface for buying tokens from bonding curve parameters
export interface BuyFromCurveParams {
  tokenAddress: string
  amount: string
  privateKey: string
}

// Schema for buying exact amount of tokens from bonding curve
export const exactOutBuyFromCurveSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  tokensOut: z.string().describe('Exact amount of tokens to receive'),
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
}

// Interface for buying exact amount of tokens parameters
export interface ExactOutBuyFromCurveParams {
  tokenAddress: string
  tokensOut: string
  privateKey: string
}

// Schema for buying tokens from DEX
export const buyFromDexSchema = {
  tokenAddress: z.string().describe('Token contract address to buy'),
  amount: z.string().describe('Amount of MON to spend'),
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  slippage: z
    .number()
    .optional()
    .default(0.5)
    .describe('Slippage percentage (default 0.5%)'),
}

// Interface for buying tokens from DEX parameters
export interface BuyFromDexParams {
  tokenAddress: string
  amount: string
  privateKey: string
  slippage?: number
}

// Schema for selling tokens to DEX
export const sellToDexSchema = {
  tokenAddress: z.string().describe('Token contract address to sell'),
  amount: z.string().describe('Amount of tokens to sell'),
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
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
  privateKey: string
  slippage?: number
}

// Implementation of buying tokens from curve tool
export const buyTokensFromCurve = async (
  client: PublicClient,
  { tokenAddress, amount, privateKey }: BuyFromCurveParams,
) => {
  try {
    // No need to get private key from environment variables anymore
    // Validate the private key format
    if (!privateKey || !privateKey.startsWith('0x')) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid private key format. Private key must start with '0x'.`,
          },
        ],
      }
    }

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

    // Check token status using contract methods directly
    const { getTokenStatus } = await import('../api/nadfunRpc')
    const { isListed, isLocked } = await getTokenStatus(tokenAddress)

    if (isListed) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is already listed on DEX. Use the buyTokensFromDex tool instead.`,
          },
        ],
      }
    }

    if (isLocked) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is locked and cannot be purchased at this time.`,
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
      const tokenPosition = positionsBefore.tokens.find(
        (p: any) =>
          p.token_info.token_id.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        tokenAmountBefore = parseFloat(
          formatEther(BigInt(tokenPosition.balance)),
        )
        tokenSymbol = tokenPosition.token_info.symbol
      }
    } catch (error) {
      console.error('Error fetching positions before purchase:', error)
    }

    // Check available tokens using contract method directly
    const { getAvailableBuyTokens } = await import('../api/nadfunRpc')
    const { availableTokens } = await getAvailableBuyTokens(tokenAddress)

    if (availableTokens === 0n) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No tokens available for purchase. This token may be fully sold out.`,
          },
        ],
      }
    }

    // Get expected output amount using contract method
    const { createPublicRpcClient } = await import('../api/nadfunRpc')
    const publicClient = createPublicRpcClient()
    const amountInWei = parseEther(amount)

    const amountOut = await publicClient.readContract({
      address: '0x4F5A3518F082275edf59026f72B66AC2838c0414' as `0x${string}`,
      abi: (await import('../abi/IBondingCurveRouter.json')).default,
      functionName: 'getAmountOut',
      args: [tokenAddress as `0x${string}`, amountInWei, true],
    })

    const estimatedTokensOut = amountOut as bigint

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
      const txHash = await buyFromBondingCurve(privateKey, tokenAddress, amount)

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
        const tokenPosition = positionsAfter.tokens.find(
          (p: any) =>
            p.token_info.token_id.toLowerCase() === tokenAddress.toLowerCase(),
        )
        if (tokenPosition) {
          const tokenAmountAfter = parseFloat(
            formatEther(BigInt(tokenPosition.balance)),
          )
          tokenAmountReceived = tokenAmountAfter - tokenAmountBefore
          tokenSymbol = tokenPosition.token_info.symbol
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
  { tokenAddress, tokensOut, privateKey }: ExactOutBuyFromCurveParams,
) => {
  try {
    // Validate the private key format
    if (!privateKey || !privateKey.startsWith('0x')) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid private key format. Private key must start with '0x'.`,
          },
        ],
      }
    }

    // Validate tokensOut to ensure it's a proper number
    const numTokensOut = parseFloat(tokensOut)
    if (isNaN(numTokensOut) || numTokensOut <= 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid tokens amount: ${tokensOut}. Please provide a positive number.`,
          },
        ],
      }
    }

    // Check token status using contract methods directly
    const { getTokenStatus, getAvailableBuyTokens } = await import(
      '../api/nadfunRpc'
    )
    const { isListed, isLocked } = await getTokenStatus(tokenAddress)

    if (isListed) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is already listed on DEX. Use the buyTokensFromDex tool instead.`,
          },
        ],
      }
    }

    if (isLocked) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `This token (${tokenAddress}) is locked and cannot be purchased at this time.`,
          },
        ],
      }
    }

    // Check available tokens using contract method
    const { availableTokens } = await getAvailableBuyTokens(tokenAddress)
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

    // Get required input amount using contract method
    const { createPublicRpcClient } = await import('../api/nadfunRpc')
    const publicClient = createPublicRpcClient()

    const amountInMax = await publicClient.readContract({
      address: '0x4F5A3518F082275edf59026f72B66AC2838c0414' as `0x${string}`,
      abi: (await import('../abi/IBondingCurveRouter.json')).default,
      functionName: 'getAmountIn',
      args: [tokenAddress as `0x${string}`, requestedTokens, true],
    })

    const estimatedAmountIn = amountInMax as bigint
    const estimatedTotalCost =
      estimatedAmountIn + (estimatedAmountIn * 10n) / 1000n // Include 1% fee

    // Execute transaction
    const txHash = await exactOutBuyFromBondingCurve(
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
  { tokenAddress, amount, privateKey, slippage = 0.5 }: BuyFromDexParams,
) => {
  try {
    // Validate the private key format
    if (!privateKey || !privateKey.startsWith('0x')) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid private key format. Private key must start with '0x'.`,
          },
        ],
      }
    }

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

    // Check token status using contract methods directly
    const { getTokenStatus } = await import('../api/nadfunRpc')
    const { isListed } = await getTokenStatus(tokenAddress)

    if (!isListed) {
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

    // Get token info for symbol
    const tokenInfo = await NadfunApi.getTokenInfo(tokenAddress)
    let tokenSymbol = tokenInfo.symbol || 'tokens'

    // Get positions before purchase to compare later
    let tokenAmountBefore = 0
    try {
      const positionsBefore = await NadfunApi.getAccountPositions(
        walletAddress as string,
        'open',
      )
      const tokenPosition = positionsBefore.tokens.find(
        (p: any) =>
          p.token_info.token_id.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        tokenAmountBefore = parseFloat(
          formatEther(BigInt(tokenPosition.balance)),
        )
        tokenSymbol = tokenPosition.token_info.symbol
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
      const tokenPosition = positionsAfter.tokens.find(
        (p: any) =>
          p.token_info.token_id.toLowerCase() === tokenAddress.toLowerCase(),
      )
      if (tokenPosition) {
        const tokenAmountAfter = parseFloat(
          formatEther(BigInt(tokenPosition.balance)),
        )
        tokenAmountReceived = tokenAmountAfter - tokenAmountBefore
        tokenSymbol = tokenPosition.token_info.symbol
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
  { tokenAddress, amount, privateKey, slippage = 0.5 }: SellToDexParams,
) => {
  try {
    // Validate the private key format
    if (!privateKey || !privateKey.startsWith('0x')) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid private key format. Private key must start with '0x'.`,
          },
        ],
      }
    }

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

    // Check token status using contract methods directly
    const { getTokenStatus } = await import('../api/nadfunRpc')
    const { isListed } = await getTokenStatus(tokenAddress)

    if (!isListed) {
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
