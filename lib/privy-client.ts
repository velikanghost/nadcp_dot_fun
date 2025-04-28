import { PrivyClient } from '@privy-io/server-auth'

// Get Privy configuration from environment variables
const PRIVY_APP_ID = process.env.PRIVY_APP_ID || ''
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || ''
const PRIVY_WALLET_AUTH_KEY = process.env.PRIVY_WALLET_AUTH_KEY || ''

// Default Ethereum chain ID (Monad Testnet)
const DEFAULT_CHAIN_ID = '2442'

// Initialize the Privy client with wallet API support
export const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET, {
  walletApi: {
    authorizationPrivateKey: PRIVY_WALLET_AUTH_KEY,
  },
})

/**
 * Helper function to create a wallet
 */
export async function createWallet() {
  try {
    // Create a new wallet
    const newWallet = await privyClient.walletApi.create({
      chainType: 'ethereum',
    })

    return newWallet
  } catch (error) {
    console.error('Error creating wallet:', error)
    throw error
  }
}

/**
 * Function to sign a message with a wallet
 */
export async function signMessage(walletId: string, message: string) {
  try {
    const { signature } = await privyClient.walletApi.ethereum.signMessage({
      walletId,
      message,
    })

    return signature
  } catch (error) {
    console.error('Error signing message:', error)
    throw error
  }
}

/**
 * Function to send a transaction
 * @param walletId The ID of the wallet to use
 * @param to The recipient address
 * @param amountInWei The amount to send in wei
 * @param chainId The chain ID (defaults to Monad Testnet)
 */
export async function sendTransaction(
  walletId: string,
  to: string,
  amountInWei: string,
  chainId: string = DEFAULT_CHAIN_ID,
) {
  try {
    // Convert to hex format for Ethereum transaction
    const toAddress = to.startsWith('0x') ? to : `0x${to}`

    // Convert amount to hex for Ethereum transaction
    const hexAmount = `0x${BigInt(amountInWei).toString(16)}`

    // Create the CAIP-2 identifier for the chain with proper type
    const caip2 = `eip155:${chainId}` as `eip155:${string}`

    const transaction = await privyClient.walletApi.ethereum.sendTransaction({
      walletId,
      caip2,
      transaction: {
        to: toAddress as `0x${string}`,
        value: hexAmount as `0x${string}`,
        data: '0x' as `0x${string}`,
      },
    })

    return transaction
  } catch (error) {
    console.error('Error sending transaction:', error)
    throw error
  }
}
