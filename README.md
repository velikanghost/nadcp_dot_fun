# Nad.fun MCP Server

A Model Context Protocol (MCP) server for interacting with the Nad.fun platform on the Monad blockchain.

## Features

This MCP server provides tools for:

- Searching tokens on Nad.fun by name or symbol
- Getting detailed statistics for specific tokens
- Retrieving account positions and created tokens
- Listing tokens by various criteria (creation time, market cap, latest trade)
- Fetching token market data, chart information, swap history, and holder lists
- Getting information about market types (CURVE and DEX)
- Buying and selling tokens through bonding curve or DEX

All data is fetched directly from the Nad.fun API in real-time, with no mock data.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nad-fun-mcp.git
cd nad-fun-mcp

# Install dependencies
pnpm install
```

## Usage

```bash
# Build the project
pnpm build
```

This will start the server using the standard input/output transport layer, allowing AI assistants to interact with it.

## Tools

### Token Search and Information

#### search-tokens

Search for tokens on Nad.fun by name or symbol.

Parameters:

- `query` (string): Token name or symbol to search for
- `limit` (number, default: 10): Maximum number of results to return

#### token-stats

Get detailed statistics for a specific Nad.fun token.

Parameters:

- `tokenAddress` (string): Token contract address
- `includeSocialData` (boolean, default: true): Include social engagement metrics

### Account Related Tools

#### account-positions

Get token positions held by an account.

Parameters:

- `accountAddress` (string): Account EOA address
- `positionType` (enum: 'all', 'open', 'close', default: 'open'): Type of positions to retrieve
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

#### account-created-tokens

Get tokens created by a specific account.

Parameters:

- `accountAddress` (string): Account EOA address
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

### Token Listing Tools

#### list-tokens-by-creation-time

Get tokens ordered by creation time (newest first).

Parameters:

- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

#### list-tokens-by-market-cap

Get tokens ordered by market cap (highest first).

Parameters:

- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

#### list-tokens-by-latest-trade

Get tokens ordered by latest trade time.

Parameters:

- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

### Token Details Tools

#### token-chart

Get chart data for a specific token.

Parameters:

- `tokenAddress` (string): Token contract address
- `interval` (enum: '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', default: '1h'): Chart interval
- `baseTimestamp` (number, optional): Base timestamp for the chart (current time if not provided)

#### token-swap-history

Get swap history for a specific token.

Parameters:

- `tokenAddress` (string): Token contract address
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

#### token-market

Get market information for a specific token.

Parameters:

- `tokenAddress` (string): Token contract address

#### token-holders

Get list of holders for a specific token.

Parameters:

- `tokenAddress` (string): Token contract address
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Number of items per page

### Market Info Tools

#### market-type-info

Get detailed information about a specific market type.

Parameters:

- `marketType` (enum: 'CURVE', 'DEX'): Market type to get information about

#### market-type-comparison

Get a comparison between CURVE and DEX market types.

Parameters:

- None

#### token-market-phase

Get detailed information about a token's current market phase.

Parameters:

- `tokenAddress` (string): Token contract address to check

### Token Trading Tools

#### buy-tokens-from-curve

Buy tokens from bonding curve (only available in CURVE phase).

Parameters:

- `privateKey` (string): Private key of the sender (will not be stored)
- `tokenAddress` (string): Token contract address to buy
- `amount` (string): Amount of MON to spend

#### exact-out-buy-tokens-from-curve

Buy exact amount of tokens from bonding curve (only available in CURVE phase). This is useful for purchasing the remaining tokens to trigger DEX listing.

Parameters:

- `privateKey` (string): Private key of the sender (will not be stored)
- `tokenAddress` (string): Token contract address to buy
- `tokensOut` (string): Exact amount of tokens to receive

#### buy-tokens-from-dex

Buy tokens from DEX (only available in DEX phase).

Parameters:

- `privateKey` (string): Private key of the sender (will not be stored)
- `tokenAddress` (string): Token contract address to buy
- `amount` (string): Amount of MON to spend
- `slippage` (number, default: 0.5): Slippage percentage

#### sell-tokens-to-dex

Sell tokens to DEX (only available in DEX phase).

Parameters:

- `privateKey` (string): Private key of the sender (will not be stored)
- `tokenAddress` (string): Token contract address to sell
- `amount` (string): Amount of tokens to sell
- `slippage` (number, default: 0.5): Slippage percentage

## API Integration

This server integrates with the Nad.fun API:

- Base API endpoint: `https://testnet-bot-api-server.nad.fun/`

### Endpoints used:

- Account endpoints:

  - `/account/position/{account_address}` - Get account positions
  - `/account/create_token/{account_address}` - Get tokens created by account

- Order endpoints:

  - `/order/creation_time` - Get tokens by creation time
  - `/order/market_cap` - Get tokens by market cap
  - `/order/latest_trade` - Get tokens by latest trade

- Token endpoints:
  - `/token/{token}` - Get token information
  - `/token/chart/{token}` - Get token chart data
  - `/token/swap/{token}` - Get token swap history
  - `/token/market/{token}` - Get token market information
  - `/token/holder/{token}` - Get token holders

## License

ISC
