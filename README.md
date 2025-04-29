# Nad.fun MCP Server

A Model Context Protocol (MCP) server for interacting with the Nad.fun platform on the Monad blockchain.

This server uses the standard input/output (stdio) transport layer for communication with AI assistants. For the server-sent events (SSE) version, please see [Nad.fun MCP SSE Server](https://github.com/velikanghost/nadcp_dot_fun).

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Setting up with Windsurf](#setting-up-with-windsurf)
  - [Setting up with Claude Desktop](#setting-up-with-claude-desktop)
- [Tools](#tools)
  - [Token Search and Information](#token-search-and-information)
  - [Account Related Tools](#account-related-tools)
  - [Token Listing Tools](#token-listing-tools)
  - [Token Details Tools](#token-details-tools)
- [API Integration](#api-integration)
- [License](#license)

## Features

This MCP server provides tools for:

- Searching tokens on Nad.fun by name or symbol
- Getting detailed statistics for specific tokens
- Retrieving account positions and created tokens
- Listing tokens by various criteria (creation time, market cap, latest trade)
- Fetching token market data, chart information, swap history, and holder lists
- Trading tokens during bonding curve and after

## Installation

```bash
# Clone the repository
git clone https://github.com/velikanghost/nadcp_dot_fun.git
cd nadcp_dot_fun
git checkout stdio

# Install dependencies
pnpm install
```

## Usage

```bash
# Build the project
pnpm build
```

### Setting up with Windsurf

To use this MCP server with Windsurf:

1. Build the server using `pnpm build`
2. Create or edit the `mcp_config.json` file:

   - `~/.codeium/windsurf/mcp_config.json`

3. Add the following configuration to the file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "command": "npx",
      "args": ["-y", "/full/path/to/nadcp_dot_fun/build/index.js"]
    }
  }
}
```

Replace `/full/path/to/nadcp_dot_fun` with the absolute path to where you installed this repository.

You can get the path by running

```bash
pwd
```

4. Refresh MCPs list to load the new MCP server configuration.

5. You can now use the Nad.fun MCP server functionality.

### Setting up with Claude Desktop

To use this MCP server with Claude Desktop:

1. Build the server using `pnpm build`
2. Create or edit the `claude_desktop_config.json` file:

   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - On Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the following configuration to the file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "command": "node",
      "args": ["/full/path/to/nadcp_dot_fun/build/index.js"]
    }
  }
}
```

Replace `/full/path/to/nadcp_dot_fun` with the absolute path to where you installed this repository.

You can get the path by running

```bash
pwd
```

4. Restart Claude Desktop to load the new MCP server configuration.

5. In Claude Desktop, you can now use the Nad.fun MCP server functionality.

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
