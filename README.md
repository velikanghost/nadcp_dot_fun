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

- `buy-tokens-from-curve`: Buy tokens from bonding curve
- `exact-out-buy-tokens-from-curve`: Buy exact amount of tokens from curve
- `buy-tokens-from-dex`: Buy tokens from DEX
- `sell-tokens-to-dex`: Sell tokens to DEX

## Connecting to this MCP Server

This is an SSE-based MCP server that can be accessed in different ways depending on your client.

### Using with Cursor (Native SSE Support)

Go to `Cursor > Settings > Cursor Settings > MCP`

Paste the following in the `mcp.json` file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "url": "https://nadcp-dot-fun.vercel.app/sse"
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
