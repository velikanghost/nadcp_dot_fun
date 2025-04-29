/**
 * Nad.fun Market Type Information
 * This file provides detailed descriptions of the different market types on Nad.fun
 */

/**
 * Description of Bonding Curve (CURVE) market type
 */
export const CURVE_MARKET_INFO = {
  name: 'Bonding Curve',
  key: 'CURVE',
  description: `
# Bonding Curve Market

A bonding curve is a mathematical mechanism that establishes the price of a token. In the Nad.fun bonding curve:

- The price increases as more tokens are bought
- The price decreases as tokens are sold
- The formula follows a constant product curve: price = virtualNative / virtualToken
- Tokens in this phase **cannot be transferred** - they must be bought and sold directly with the bonding curve
- Available token amount is calculated as \`reserveToken - targetToken\`

## Lifecycle

1. Tokens are initially sold through the bonding curve
2. Once all available tokens are sold, the token is automatically listed on DEX
3. The transition happens when someone buys the exact remaining tokens using the \`exactOutBuy\` function

## Trading

- Buy: Use the \`buy\` function with an amount of MON to spend
- ExactOutBuy: Use the \`exactOutBuy\` function to purchase an exact amount of tokens
- Buying the last tokens triggers DEX listing
- A 1% fee is added to all transactions

## Benefits

- Guaranteed liquidity
- Deterministic pricing formula
- Automatic price discovery
- No need for initial liquidity provision
  `,
  shortDescription:
    'Initial token offering through a mathematical price curve. Tokens cannot be transferred during this phase.',
}

/**
 * Description of DEX market type
 */
export const DEX_MARKET_INFO = {
  name: 'Decentralized Exchange (DEX)',
  key: 'DEX',
  description: `
# DEX Market

Once a token has sold out its bonding curve allocation, it gets listed on the Nad.fun decentralized exchange (DEX), which uses a Uniswap-compatible protocol. In the DEX:

- Tokens can be freely transferred like standard ERC-20 tokens
- Price is determined by supply and demand
- Liquidity is provided in a trading pair with WMON (Wrapped MON)
- Trading follows the Automated Market Maker (AMM) model

## Lifecycle

1. Token is automatically listed on DEX after all bonding curve tokens are purchased
2. Initial liquidity is created from the bonding curve reserves
3. Additional liquidity can be added by any token holder

## Trading

- Buy: Use \`swapExactNativeForTokens\` to buy with a specific amount of MON
- Sell: Use \`swapExactTokensForNative\` to sell a specific amount of tokens
- Always set a slippage tolerance to account for price movement (typically 0.5%)
- Tokens need to be approved before selling

## Benefits

- Free transferability
- Market-driven pricing
- Trading pair liquidity
- Standard ERC-20 token functionality
  `,
  shortDescription:
    'Standard DEX trading with a liquidity pool. Tokens can be freely transferred.',
}

/**
 * Get information about a specific market type
 * @param marketType Type of market ('CURVE' or 'DEX')
 * @returns Market information object
 */
export function getMarketTypeInfo(marketType: string) {
  switch (marketType.toUpperCase()) {
    case 'CURVE':
      return CURVE_MARKET_INFO
    case 'DEX':
      return DEX_MARKET_INFO
    default:
      throw new Error(`Unknown market type: ${marketType}`)
  }
}

/**
 * Get a brief comparison of the two market types
 */
export function getMarketTypeComparison() {
  return {
    title: 'Nad.fun Market Types Comparison',
    description: `
# Nad.fun Market Types

Nad.fun has two main market types:

## Bonding Curve (CURVE)

- **Initial Phase**: Tokens are first sold through a bonding curve
- **Price Formation**: Price follows a mathematical formula (constant product)
- **Transfers**: Tokens cannot be transferred during this phase
- **Liquidity**: Always available through the curve mechanism
- **End Condition**: Phase ends when all available tokens are purchased

## Decentralized Exchange (DEX)

- **Second Phase**: Tokens move to DEX after bonding curve sells out
- **Price Formation**: Price determined by market supply and demand
- **Transfers**: Standard ERC-20 tokens that can be freely transferred
- **Liquidity**: Provided through MON/Token trading pairs
- **Trading**: Standard AMM swaps with configurable slippage

The transition from CURVE to DEX is automatic when the last tokens are purchased from the bonding curve.
    `,
  }
}
