# Naddotfun MCP Server built using Next.js

This project provides a Model Context Protocol (MCP) server for interacting with the Nad.fun platform on the Monad blockchain, built using Next.js and Server-Sent Events (SSE).

## Features

- Implements the MCP protocol via Server-Sent Events
- Provides tools for interacting with Nad.fun on Monad blockchain
- Supports token searching, market information, token trading, and more
- Easy to deploy on Vercel with Redis
- Wallet integration for token transactions

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

## How to add new tools

Update `app/mcp.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

## Notes for running on Vercel

- Requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/sse/route.ts` and adjust max duration to 800 if you are using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Client

`scripts/test-client.mjs` contains a sample client to try tool invocations:

```sh
npm run test-client -- http://localhost:3000
```

This will test a few of the available tools and display the results.

## Running locally

1. Clone the repository
2. Install dependencies with `npm install` or `pnpm install`
3. Start a local Redis instance
4. Set the `REDIS_URL` environment variable
5. Run `npm run dev` to start the development server
6. Test with `npm run test-client -- http://localhost:3000`

## How to use the server with Cursor

Go to `Cursor > Settings > Cursor Settings > MCP`

![add_mcp](/static/add_mcp.png)

Paste the following in the `mcp.json` file:

```json
{
  "mcpServers": {
    "nadcp-dot-fun": {
      "url": "[your_app_vercel_url]/sse",
      "env": {
        "PRIVATE_KEY": "",
        "ALCHEMY_API_KEY": "",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```
