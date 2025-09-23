# Naddotfun MCP Server built using Next.js

This project provides a Model Context Protocol (MCP) server for interacting with the Nad.fun platform on the Monad blockchain, built using Next.js and Server-Sent Events (SSE).

This server uses the sse transport layer for communication with AI assistants. For the stdio version, please see [stdio-based Nad.fun MCP Server](https://github.com/velikanghost/nadcp_dot_fun/tree/stdio).

## Table of Contents

- [Features](#features)
- [Available Tools](#available-tools)
  - [Wallet Operations](#wallet-operations)
  - [Token Search and Information](#token-search-and-information)
  - [Account Information](#account-information)
  - [Token Listings](#token-listings)
  - [Token Details](#token-details)
  - [Market Information](#market-information)
  - [Token Trading](#token-trading)
- [Connecting to this MCP Server](#connecting-to-this-mcp-server)
  - [Using with Cursor](#using-with-cursor-native-sse-support)
  - [Using with Claude Desktop and stdio-only clients](#using-with-claude-desktop-windsurf-and-other-stdio-only-clients)

## Features

- Implements the MCP protocol via Server-Sent Events
- Provides tools for interacting with Nad.fun on Monad blockchain
- Supports token searching, market information, token trading, and more

## Available Tools

The server provides the following Nad.fun tools:

### Wallet Operations

- `get-mon-balance`: Check MON balance for a Monad address
- `transfer-mon`: Transfer MON to another Monad address

### Token Search and Information

- `search-tokens`: Search for tokens by name or symbol
- `token-stats`: Get detailed stats for a specific token

### Account Information

- `account-positions`: Get token positions held by an account
- `account-created-tokens`: Get tokens created by a specific account

### Token Listings

- `list-tokens-by-creation-time`: Get tokens ordered by creation time
- `list-tokens-by-market-cap`: Get tokens ordered by market cap
- `list-tokens-by-latest-trade`: Get tokens ordered by latest trade time

### Token Details

- `token-chart`: Get chart data for a specific token
- `token-swap-history`: Get swap history for a specific token
- `token-market`: Get market information for a specific token
- `token-holders`: Get list of holders for a specific token

### Market Information

- `market-type-info`: Get information about a specific market type
- `market-type-comparison`: Compare CURVE and DEX market types
- `token-market-phase`: Get information about a token's market phase

### Token Trading

- `buy-tokens-from-curve`: Buy tokens from bonding curve (CURVE phase)
- `exact-out-buy-tokens-from-curve`: Buy exact amount of tokens from bonding curve
- `sell-tokens-to-curve`: Sell tokens to bonding curve (CURVE phase)
- `buy-tokens-from-dex`: Buy tokens from DEX (DEX phase)
- `sell-tokens-to-dex`: Sell tokens to DEX (DEX phase)

## Technical Details

### Contract Integration

This MCP server uses the latest Nad.fun contracts on Monad testnet:

- **BondingCurve**: `0x52D34d8536350Cd997bCBD0b9E9d722452f341F5`
- **BondingCurveRouter**: `0x4F5A3518F082275edf59026f72B66AC2838c0414`
- **DexRouter**: `0x4FBDC27FAE5f99E7B09590bEc8Bf20481FCf9551`
- **Factory**: `0x961235a9020B05C44DF1026D956D1F4D78014276`
- **WMON**: `0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701`

### Trading Phases

- **CURVE Phase**: Tokens are sold through bonding curve mechanism

  - Use `buy-tokens-from-curve` or `sell-tokens-to-curve`
  - Tokens cannot be transferred between wallets
  - Price follows mathematical formula

- **DEX Phase**: Tokens are traded on decentralized exchange
  - Use `buy-tokens-from-dex` or `sell-tokens-to-dex`
  - Tokens can be freely transferred
  - Price determined by market supply and demand

### Security Features

- Private key validation and secure handling
- Automatic slippage protection (5% for bonding curve, 0.5% for DEX)
- Gas limit protection (300,000 gas)
- Deadline protection (5 minutes)
- Real-time balance checking

## Setup

### Environment Variables

Before using this MCP server, you need to set up the following environment variables:

#### Required Environment Variables

1. **ALCHEMY_API_KEY**: Your Alchemy API key for Monad testnet

   ```bash
   ALCHEMY_API_KEY="your_alchemy_api_key_here"
   ```

2. **REDIS_URL**: Redis connection URL for caching and session management

   **Option 1: Local Redis**

   Install Redis using Homebrew:

   ```bash
   brew install redis
   brew services start redis
   ```

   Then set the environment variable:

   ```bash
   REDIS_REMOTE_REDIS_URL="redis://localhost:6379"
   ```

   **Option 2: Remote/Cloud Redis**

   Use a cloud Redis service like Redis Cloud, AWS ElastiCache, or Upstash:

   ```bash
   export REDIS_REMOTE_REDIS_URL="redis://username:password@host:port"
   # or for Redis Cloud/Upstash
   export REDIS_REMOTE_REDIS_URL="rediss://username:password@host:port"
   ```

### Getting Your Alchemy API Key

1. Go to [Alchemy](https://www.alchemy.com/)
2. Create an account or sign in
3. Create a new app and select "Monad" as the chain
4. Copy your API key from the dashboard

### Redis Setup Options

- **Local**: Use local Redis with Homebrew (easiest setup)
- **Cloud**: Use a managed Redis service for better reliability

## Connecting to this MCP Server

This is an SSE-based MCP server that can be accessed in different ways depending on your client.

### Using with Cursor (Native SSE Support)

Go to `Cursor > Settings > Cursor Settings > MCP`

Paste the following in the `mcp.json` file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "url": "https://nadcp-dot-fun.vercel.app/sse",
      "env": {
        "PRIVATE_KEY": your_private_key
      }
    }
  }
}
```

### Using with Windsurf (Native SSE Support)

Go to `Windsurf > Windsurf Settings > MCP Servers`

Paste the following in the `mcp_config.json` file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "serverUrl": "https://nadcp-dot-fun.vercel.app/sse"
    }
  }
}
```

### Using with Claude Desktop, Windsurf, and other stdio-only clients

Some clients only support stdio-based MCP servers. You can connect to this SSE-based server using the `mcp-remote` bridge:

#### Claude Desktop Setup

Create or edit the `claude_desktop_config.json` file:

- On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- On Linux: `~/.config/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://nadcp-dot-fun.vercel.app/sse"]
    }
  }
}
```

#### Windsurf and Other stdio-only Clients

Use the same configuration format as above, adjusting the path according to your client's configuration file location.
