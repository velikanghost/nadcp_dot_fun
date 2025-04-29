import { z } from 'zod'
import { PublicClient } from 'viem'
import { parseEther, formatEther } from 'viem/utils'
import { NadfunApi } from '../api/nadfunApi'

// Schema for account positions
export const accountPositionsSchema = {
  accountAddress: z.string().describe('Account EOA address'),
  positionType: z
    .enum(['all', 'open', 'close'])
    .default('open')
    .describe('Type of positions to retrieve'),
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Interface for account positions parameters
export interface AccountPositionsParams {
  accountAddress: string
  positionType: 'all' | 'open' | 'close'
  page?: number
  limit?: number
}

// Schema for account created tokens
export const accountCreatedTokensSchema = {
  accountAddress: z.string().describe('Account EOA address'),
  page: z.number().optional().default(1).describe('Page number'),
  limit: z.number().optional().default(10).describe('Number of items per page'),
}

// Schema for wallet balance
export const walletBalanceSchema = {
  accountAddress: z.string().describe('Account EOA address'),
}

// Interface for account created tokens parameters
export interface AccountCreatedTokensParams {
  accountAddress: string
  page?: number
  limit?: number
}

// Interface for wallet balance parameters
export interface WalletBalanceParams {
  accountAddress: string
}

//Implementation of wallet balance tool
export const getWalletBalance = async (
  client: PublicClient,
  { accountAddress }: WalletBalanceParams,
) => {
  const balance = await client.getBalance({
    address: accountAddress as `0x${string}`,
  })
  return {
    content: [{ type: 'text' as const, text: `Wallet balance: ${balance}` }],
  }
}

// Schema for balance checking
export const getMonBalanceSchema = {
  accountAddress: z.string().describe('Account EOA address'),
}

// Interface for balance parameters
export interface MonBalanceParams {
  accountAddress: string
}

// Schema for MON transfer
export const transferMonSchema = {
  privateKey: z
    .string()
    .describe('Private key of the sender (will not be stored)'),
  accountAddress: z.string().describe('Account address to receive MON'),
  amount: z.string().describe('Amount of MON to transfer'),
}

// Interface for MON transfer parameters
export interface TransferMonParams {
  privateKey: string
  accountAddress: string
  amount: string
}

// Implementation of account positions tool
export const getAccountPositions = async (
  client: PublicClient,
  {
    accountAddress,
    positionType,
    page = 1,
    limit = 10,
  }: AccountPositionsParams,
) => {
  try {
    // Fetch account positions from the API
    const response = await NadfunApi.getAccountPositions(
      accountAddress,
      positionType,
      page,
      limit,
    )

    if (response.positions.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No ${positionType} positions found for account ${accountAddress}.`,
          },
        ],
      }
    }

    // Format positions as markdown
    let positionsText = `# Account Positions\n\n`
    positionsText += `Found ${response.positions.length} ${positionType} positions for account ${accountAddress}:\n\n`

    response.positions.forEach((item, index) => {
      const { token, position, market } = item

      // Convert token amounts from wei to standard units
      const currentAmount = parseFloat(
        formatEther(BigInt(position.current_token_amount)),
      ).toFixed(5)
      const totalBoughtToken = parseFloat(
        formatEther(BigInt(position.total_bought_token)),
      ).toFixed(5)

      positionsText += `## ${index + 1}. ${token.name} (${token.symbol})\n`
      positionsText += `- Token Address: ${token.token_address}\n`
      positionsText += `- Current Amount: ${currentAmount} ${token.symbol}\n`
      positionsText += `- Total Bought (MON): ${position.total_bought_native}\n`
      positionsText += `- Total Bought (Token): ${totalBoughtToken} ${token.symbol}\n`
      positionsText += `- Realized PnL (MON): ${position.realized_pnl}\n`
      positionsText += `- Unrealized PnL (MON): ${position.unrealized_pnl}\n`
      positionsText += `- Total PnL (MON): ${position.total_pnl}\n`
      positionsText += `- Current Price: ${market.price} MON\n`
      positionsText += `- Market Type: ${market.market_type}\n`
      positionsText += `- Last Traded: ${new Date(
        position.last_traded_at * 1000,
      ).toLocaleString()}\n\n`
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: positionsText,
        },
      ],
    }
  } catch (error) {
    console.error('Error fetching account positions from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching account positions: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of account created tokens tool
export const getAccountCreatedTokens = async (
  client: PublicClient,
  { accountAddress, page = 1, limit = 10 }: AccountCreatedTokensParams,
) => {
  try {
    // Fetch tokens created by the account from the API
    const response = await NadfunApi.getAccountCreatedTokens(
      accountAddress,
      page,
      limit,
    )

    if (response.tokens.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No tokens found created by account ${accountAddress}.`,
          },
        ],
      }
    }

    // Format created tokens as markdown
    let tokensText = `# Tokens Created by Account\n\n`
    tokensText += `Found ${response.tokens.length} tokens created by account ${accountAddress}:\n\n`

    response.tokens.forEach((token, index) => {
      tokensText += `## ${index + 1}. ${token.name} (${token.symbol})\n`
      tokensText += `- Token Address: ${token.token_address}\n`

      if (token.description) {
        tokensText += `- Description: ${token.description}\n`
      }

      tokensText += `- Total Supply: ${token.total_supply}\n`

      if (token.price) {
        tokensText += `- Current Price: ${token.price} MON\n`
      }

      if (token.market_cap) {
        tokensText += `- Market Cap: ${token.market_cap} MON\n`
      }

      if (token.current_amount) {
        tokensText += `- Current Amount: ${token.current_amount}\n`
      }

      tokensText += `- Listed: ${token.is_listing ? 'Yes' : 'No'}\n`
      tokensText += `- Created: ${new Date(
        token.created_at * 1000,
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
    console.error('Error fetching created tokens from Nad.fun API:', error)
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error fetching created tokens: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again later.`,
        },
      ],
    }
  }
}

// Implementation of MON balance check tool
export const getMonBalance = async (
  client: PublicClient,
  { accountAddress }: MonBalanceParams,
) => {
  try {
    const balance = await client.getBalance({
      address: accountAddress as `0x${string}`,
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: `Account ${accountAddress} has a balance of ${formatEther(
            balance,
          )} MON`,
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error checking MON balance: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
    }
  }
}

// Implementation of MON transfer tool
export const transferMon = async (
  client: PublicClient,
  { privateKey, accountAddress, amount }: TransferMonParams,
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

    // Import the transfer function
    const { transfer, createWalletClientFromPrivateKey } = await import(
      '../api/nadfunRpc'
    )

    // Get sender address from private key
    const walletClient = createWalletClientFromPrivateKey(privateKey)
    const senderAddress = walletClient.account?.address as `0x${string}`

    // Check sender's balance
    const balance = await client.getBalance({
      address: senderAddress,
    })

    const amountInWei = parseEther(amount)
    if (balance < amountInWei) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Insufficient balance. You have ${formatEther(
              balance,
            )} MON but trying to send ${amount} MON.`,
          },
        ],
      }
    }

    // Execute the transfer
    const txHash = await transfer(privateKey, accountAddress, amount)

    // Get updated balance
    const newBalance = await client.getBalance({
      address: senderAddress,
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: `Successfully transferred ${amount} MON to ${accountAddress}\n\nTransaction Hash: ${txHash}\nRemaining Balance: ${formatEther(
            newBalance,
          )} MON`,
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error transferring MON: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      ],
    }
  }
}
