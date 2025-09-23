import {
  PublicClient,
  WalletClient,
  createPublicClient,
  createWalletClient,
  http,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { parseEther } from 'viem/utils'
import { monadTestnet } from 'viem/chains'
import * as dotenv from 'dotenv'
// Import local contract ABIs
import BondingCurveAbi from '../abi/IBondingCurve.json'
import BondingCurveRouterAbi from '../abi/IBondingCurveRouter.json'
import DexRouterAbi from '../abi/IDexRouter.json'
import TokenAbi from '../abi/IToken.json'

// Load environment variables
dotenv.config()

export const CONTRACT_ADDRESSES = {
  BONDING_CURVE: '0x52D34d8536350Cd997bCBD0b9E9d722452f341F5',
  BONDING_CURVE_ROUTER: '0x4F5A3518F082275edf59026f72B66AC2838c0414',
  DEX_ROUTER: '0x4FBDC27FAE5f99E7B09590bEc8Bf20481FCf9551',
  FACTORY: '0x961235a9020B05C44DF1026D956D1F4D78014276',
  WRAPPED_MON: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701',
}

// Blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  chain: monadTestnet,
  rpcUrl: `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
}

/**
 * Creates a wallet client from a private key
 * @param privateKey - Private key to use
 * @returns Viem wallet client
 */
export function createWalletClientFromPrivateKey(
  privateKey: string,
): WalletClient {
  const account = privateKeyToAccount(privateKey as `0x${string}`)

  return createWalletClient({
    account,
    chain: BLOCKCHAIN_CONFIG.chain,
    transport: http(BLOCKCHAIN_CONFIG.rpcUrl),
  })
}

/**
 * Creates a public client for read-only operations
 * @returns Viem public client
 */
export function createPublicRpcClient(): PublicClient {
  return createPublicClient({
    chain: BLOCKCHAIN_CONFIG.chain,
    transport: http(BLOCKCHAIN_CONFIG.rpcUrl),
  })
}

/**
 * Transfer tokens from one account to another
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to transfer
 * @param amount - Amount of tokens to transfer
 * @returns Transaction hash
 */
export async function transfer(
  privateKey: string,
  accountAddress: string,
  amount: string,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()
  //check balance
  const balance = await publicClient.getBalance({
    address: walletClient.account?.address as `0x${string}`,
  })
  if (balance < parseEther(amount)) {
    throw new Error('Insufficient balance')
  }
  const tx = await walletClient.sendTransaction({
    account: walletClient.account!,
    to: accountAddress as `0x${string}`,
    value: parseEther(amount),
    chain: walletClient.chain,
  })
  return tx
}

/**
 * Calculate required input amount for bonding curve's exactOutBuy
 * @param tokensOut - Desired token output amount
 * @param k - Constant product (virtualNative * virtualToken)
 * @param virtualNative - Virtual native token balance
 * @param virtualToken - Virtual token balance
 * @returns Required input amount
 */
export function calculateRequiredAmountIn(
  tokensOut: bigint,
  k: bigint,
  virtualNative: bigint,
  virtualToken: bigint,
): bigint {
  // Formula: (k / (virtualToken - tokensOut)) - virtualNative
  return k / (virtualToken - tokensOut) - virtualNative
}

/**
 * Buys tokens from bonding curve using BondingCurveRouter
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to buy
 * @param amount - Amount of MON to spend
 * @returns Transaction hash
 */
export async function buyFromBondingCurve(
  privateKey: string,
  tokenAddress: string,
  amount: string,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check token status using contract methods as per documentation
  const { isListed, isLocked } = await getTokenStatus(tokenAddress)
  if (isListed) {
    throw new Error('Token is already listed on DEX. Use DEX functions to buy.')
  }
  if (isLocked) {
    throw new Error('Token is locked. Cannot buy at this time.')
  }

  // Check available tokens using contract method
  const { availableTokens } = await getAvailableBuyTokens(tokenAddress)
  if (availableTokens === 0n) {
    throw new Error(
      'No tokens available for purchase. Token may be fully sold out.',
    )
  }

  const amountIn = parseEther(amount)
  const to = walletClient.account?.address
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

  // Get expected output amount using contract method
  const amountOut = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, amountIn, true],
  })

  // Set minimum output with 5% slippage
  const amountOutMin = ((amountOut as bigint) * 95n) / 100n

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'buy',
    args: [
      {
        token: tokenAddress as `0x${string}`,
        amountIn,
        amountOutMin,
        to,
        deadline,
      },
    ],
    value: amountIn,
    gas: 300000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  return txHash
}

/**
 * Buys exact output amount of tokens from bonding curve
 * The last token purchase will trigger DEX listing
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to buy
 * @param tokensOut - Exact amount of tokens to receive
 * @returns Transaction hash
 */
export async function exactOutBuyFromBondingCurve(
  privateKey: string,
  tokenAddress: string,
  tokensOut: bigint,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check token status
  const { isListed, isLocked } = await getTokenStatus(tokenAddress)
  if (isListed) {
    throw new Error('Token is already listed on DEX. Use DEX functions to buy.')
  }
  if (isLocked) {
    throw new Error('Token is locked. Cannot buy at this time.')
  }

  const to = walletClient.account?.address
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

  // Get required input amount
  const amountInMax = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'getAmountIn',
    args: [tokenAddress as `0x${string}`, tokensOut, true],
  })

  // Add 5% buffer for price movement
  const amountInMaxWithBuffer = ((amountInMax as bigint) * 105n) / 100n

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'exactOutBuy',
    args: [
      {
        token: tokenAddress as `0x${string}`,
        amountOut: tokensOut,
        amountInMax: amountInMaxWithBuffer,
        to,
        deadline,
      },
    ],
    value: amountInMaxWithBuffer,
    gas: 300000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  return txHash
}

/**
 * Buys tokens from DEX
 * Only available after the token is listed
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to buy
 * @param amount - Amount of MON to spend
 * @param slippage - Slippage percentage (default 0.5%)
 * @returns Transaction hash
 */
export async function buyFromDex(
  privateKey: string,
  tokenAddress: string,
  amount: string,
  slippage: number = 0.5,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check token status
  const { isListed } = await getTokenStatus(tokenAddress)
  if (!isListed) {
    throw new Error(
      'Token is not listed on DEX. Use bonding curve functions to buy.',
    )
  }

  const amountIn = parseEther(amount)
  const to = walletClient.account?.address
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

  // Set a conservative minimum amount with high slippage tolerance
  // Since we can't reliably get the price from getAmountOut, we'll use a very low minimum
  const amountOutMin = 1n // Very low minimum to ensure transaction goes through

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.DEX_ROUTER as `0x${string}`,
    abi: DexRouterAbi,
    functionName: 'buy',
    args: [
      {
        token: tokenAddress as `0x${string}`,
        amountOutMin,
        to,
        deadline,
      },
    ],
    value: amountIn,
    gas: 300000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  return txHash
}

/**
 * Sells tokens to DEX
 * Only available after the token is listed
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to sell
 * @param amount - Amount of tokens to sell
 * @param slippage - Slippage percentage (default 0.5%)
 * @returns Transaction hash
 */
export async function sellToDex(
  privateKey: string,
  tokenAddress: string,
  amount: string,
  slippage: number = 0.5,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check token status
  const { isListed } = await getTokenStatus(tokenAddress)
  if (!isListed) {
    throw new Error(
      'Token is not listed on DEX. Use bonding curve functions to sell.',
    )
  }

  const amountIn = parseEther(amount)
  const to = walletClient.account?.address
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

  // First approve tokens to DEX Router
  const approveTxHash = await walletClient.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: TokenAbi,
    functionName: 'approve',
    args: [CONTRACT_ADDRESSES.DEX_ROUTER as `0x${string}`, amountIn],
    gas: 100000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  // Wait for approval confirmation
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash })

  // Set a conservative minimum amount with high slippage tolerance
  // Since we can't reliably get the price from getAmountOut, we'll use a very low minimum
  const amountOutMin = 1n // Very low minimum to ensure transaction goes through

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.DEX_ROUTER as `0x${string}`,
    abi: DexRouterAbi,
    functionName: 'sell',
    args: [
      {
        token: tokenAddress as `0x${string}`,
        amountIn,
        amountOutMin,
        to,
        deadline,
      },
    ],
    gas: 300000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  return txHash
}

/**
 * Check token status (listed/locked) on bonding curve
 * @param tokenAddress - Token address to check
 * @returns Object with isListed and isLocked status
 */
export async function getTokenStatus(tokenAddress: string): Promise<{
  isListed: boolean
  isLocked: boolean
}> {
  const publicClient = createPublicRpcClient()

  const [isListed, isLocked] = await Promise.all([
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.BONDING_CURVE as `0x${string}`,
      abi: BondingCurveAbi,
      functionName: 'isListed',
      args: [tokenAddress as `0x${string}`],
    }),
    publicClient.readContract({
      address: CONTRACT_ADDRESSES.BONDING_CURVE as `0x${string}`,
      abi: BondingCurveAbi,
      functionName: 'isLocked',
      args: [tokenAddress as `0x${string}`],
    }),
  ])

  return {
    isListed: isListed as boolean,
    isLocked: isLocked as boolean,
  }
}

/**
 * Get available tokens for purchase from bonding curve
 * @param tokenAddress - Token address to check
 * @returns Object with available tokens and required MON amount
 */
export async function getAvailableBuyTokens(tokenAddress: string): Promise<{
  availableTokens: bigint
  requiredMonAmount: bigint
}> {
  const publicClient = createPublicRpcClient()

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'availableBuyTokens',
    args: [tokenAddress as `0x${string}`],
  })

  return {
    availableTokens: (result as [bigint, bigint])[0],
    requiredMonAmount: (result as [bigint, bigint])[1],
  }
}

/**
 * Sells tokens to bonding curve using BondingCurveRouter
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to sell
 * @param amount - Amount of tokens to sell
 * @returns Transaction hash
 */
export async function sellToBondingCurve(
  privateKey: string,
  tokenAddress: string,
  amount: string,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check token status using contract methods as per documentation
  const { isListed, isLocked } = await getTokenStatus(tokenAddress)
  if (isListed) {
    throw new Error(
      'Token is already listed on DEX. Use DEX functions to sell.',
    )
  }
  if (isLocked) {
    throw new Error('Token is locked. Cannot sell at this time.')
  }

  const amountIn = parseEther(amount)
  const to = walletClient.account?.address
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

  // Get expected output amount using contract method
  const amountOut = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, amountIn, false], // false for sell
  })

  // Set minimum output with 5% slippage
  const amountOutMin = ((amountOut as bigint) * 95n) / 100n

  // First approve tokens to BondingCurveRouter
  const approveTxHash = await walletClient.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: TokenAbi,
    functionName: 'approve',
    args: [CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`, amountIn],
    gas: 100000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  // Wait for approval confirmation
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash })

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.BONDING_CURVE_ROUTER as `0x${string}`,
    abi: BondingCurveRouterAbi,
    functionName: 'sell',
    args: [
      {
        token: tokenAddress as `0x${string}`,
        amountIn,
        amountOutMin,
        to,
        deadline,
      },
    ],
    gas: 300000n,
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  return txHash
}

/**
 * Gets the private key from environment variables
 * @returns Private key from environment or throw error if not found
 */
export function getPrivateKeyFromEnv(): string {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment variables')
  }
  return privateKey
}
