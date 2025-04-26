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
// Import official contract ABIs
import * as NadFunAbi from 'contract-abi'

// Load environment variables
dotenv.config()

export const CONTRACT_ADDRESSES = {
  CORE: '0x822EB1ADD41cf87C3F178100596cf24c9a6442f6',
  BONDING_CURVE_FACTORY: '0x60216FB3285595F4643f9f7cddAB842E799BD642',
  UNISWAP_V2_ROUTER: '0x619d07287e87C9c643C60882cA80d23C8ed44652',
  UNISWAP_V2_FACTORY: '0x13eD0D5e1567684D964469cCbA8A977CDA580827',
  WRAPPED_MON: '0x3bb9AFB94c82752E47706A10779EA525Cf95dc27',
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
 * Buys tokens from a bonding curve via Core
 * @param privateKey - Private key of the sender
 * @param tokenAddress - Token address to buy
 * @param amount - Amount of MON to spend
 * @returns Transaction hash
 */
export async function buyFromCore(
  privateKey: string,
  tokenAddress: string,
  amount: string,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const coreAbi = NadFunAbi.ICore

  const amountIn = parseEther(amount)
  // 1% fee
  const fee = (amountIn * 10n) / 1000n
  const totalValue = amountIn + fee

  // 20 minutes deadline
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)
  const to = walletClient.account?.address

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.CORE as `0x${string}`,
    abi: coreAbi,
    functionName: 'buy',
    args: [amountIn, fee, tokenAddress, to, deadline],
    value: totalValue,
    gas: 300000n, // Explicit gas limit
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
export async function exactOutBuyFromCore(
  privateKey: string,
  tokenAddress: string,
  tokensOut: bigint,
): Promise<string> {
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const address = walletClient.account?.address

  // Get token market information
  const tokenMarketInfo = await fetch(
    `https://testnet-bot-api-server.nad.fun/token/market/${tokenAddress}`,
  )
  const marketData = await tokenMarketInfo.json()

  // Extract values from market data
  const virtualNative = BigInt(marketData.virtual_native)
  const virtualToken = BigInt(marketData.virtual_token)
  const reserveToken = BigInt(marketData.reserve_token || '0')
  const targetToken = BigInt(marketData.target_token || '0')

  // Calculate available tokens
  const availableTokens = reserveToken - targetToken

  // Check if enough tokens are available
  if (tokensOut > availableTokens) {
    throw new Error(
      `Requested token amount exceeds available supply. Maximum available: ${availableTokens}`,
    )
  }

  // Calculate constant product k
  const k = virtualNative * virtualToken

  // Calculate required input amount
  const requiredNativeIn = calculateRequiredAmountIn(
    tokensOut,
    k,
    virtualNative,
    virtualToken,
  )

  // Add buffer for price movement (5%)
  const maxNativeIn = (requiredNativeIn * 105n) / 100n

  // 1% fee
  const fee = (maxNativeIn * 10n) / 1000n
  const totalValue = maxNativeIn + fee

  // 20 minutes deadline
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.CORE as `0x${string}`,
    abi: NadFunAbi.ICore,
    functionName: 'exactOutBuy',
    args: [tokensOut, maxNativeIn, fee, tokenAddress, address, deadline],
    value: totalValue,
    gas: 300000n, // Explicit gas limit
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
 * @param slippage - Slippage percentage (default 10%)
 * @returns Transaction hash
 */
export async function buyFromDex(
  privateKey: string,
  tokenAddress: string,
  amount: string,
  slippage: number = 10,
): Promise<string> {
  // Create wallet client
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check if token is listed
  const tokenInfo = await fetch(
    `https://testnet-bot-api-server.nad.fun/token/${tokenAddress}`,
  )
  const tokenData = await tokenInfo.json()

  if (!tokenData.is_listing) {
    throw new Error(
      'Token is not listed on DEX. Use bonding curve functions to buy.',
    )
  }

  // Parse amount to wei
  const nativeAmountInWei = parseEther(amount)

  // Calculate deadline (20 minutes from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  // Get expected output amount
  const path = [
    CONTRACT_ADDRESSES.WRAPPED_MON as `0x${string}`,
    tokenAddress as `0x${string}`,
  ]

  const amounts = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.UNISWAP_V2_ROUTER as `0x${string}`,
    abi: NadFunAbi.IUniswapV2Router,
    functionName: 'getAmountsOut',
    args: [nativeAmountInWei, path],
  })

  // Calculate minimum amount with slippage
  const expectedAmount = (amounts as bigint[])[1]
  const slippageFactor = 1000n - BigInt(Math.floor(slippage * 10))
  const minAmount = (expectedAmount * slippageFactor) / 1000n

  // Submit transaction with explicit gas limit
  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.UNISWAP_V2_ROUTER as `0x${string}`,
    abi: NadFunAbi.IUniswapV2Router,
    functionName: 'swapExactNativeForTokens',
    args: [minAmount, path, walletClient.account?.address, deadline],
    value: nativeAmountInWei,
    gas: 300000n, // Explicit gas limit
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
  // Create wallet client
  const walletClient = createWalletClientFromPrivateKey(privateKey)
  const publicClient = createPublicRpcClient()

  // Check if token is listed
  const tokenInfo = await fetch(
    `https://testnet-bot-api-server.nad.fun/token/${tokenAddress}`,
  )
  const tokenData = await tokenInfo.json()

  if (!tokenData.is_listing) {
    throw new Error(
      'Token is not listed on DEX. Use bonding curve functions to sell.',
    )
  }

  // Parse amount to wei
  const tokenAmountInWei = parseEther(amount)

  // Calculate deadline (20 minutes from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  // First approve tokens to Router
  const approveTxHash = await walletClient.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: NadFunAbi.IToken,
    functionName: 'approve',
    args: [
      CONTRACT_ADDRESSES.UNISWAP_V2_ROUTER as `0x${string}`,
      tokenAmountInWei,
    ],
    gas: 300000n, // Explicit gas limit
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  // Wait for approval confirmation
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash })

  // Get expected output amount
  const path = [
    tokenAddress as `0x${string}`,
    CONTRACT_ADDRESSES.WRAPPED_MON as `0x${string}`,
  ]
  const amounts = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.UNISWAP_V2_ROUTER as `0x${string}`,
    abi: NadFunAbi.IUniswapV2Router,
    functionName: 'getAmountsOut',
    args: [tokenAmountInWei, path],
  })

  // Calculate minimum amount with slippage
  const expectedAmount = (amounts as bigint[])[1]
  const slippageFactor = 1000n - BigInt(Math.floor(slippage * 10))
  const minAmount = (expectedAmount * slippageFactor) / 1000n

  // Submit transaction
  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.UNISWAP_V2_ROUTER as `0x${string}`,
    abi: NadFunAbi.IUniswapV2Router,
    functionName: 'swapExactTokensForNative',
    args: [
      tokenAmountInWei,
      minAmount,
      path,
      walletClient.account?.address,
      deadline,
    ],
    gas: 300000n, // Explicit gas limit
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
    throw new Error('RIVATE_KEY not found in environment variables')
  }
  return privateKey
}
