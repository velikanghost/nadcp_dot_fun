import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createPublicClient, http } from 'viem'

// Import our tool implementations
import { searchTokens, searchTokensSchema } from './tools/tokenSearch.js'
import { getTokenStats, tokenStatsSchema } from './tools/tokenStats.js'

// Import account tools
import {
  getAccountPositions,
  accountPositionsSchema,
  getAccountCreatedTokens,
  accountCreatedTokensSchema,
} from './tools/accountInfo.js'

// Import token listing tools
import {
  listTokensByCreationTime,
  listTokensByCreationTimeSchema,
  listTokensByMarketCap,
  listTokensByMarketCapSchema,
  listTokensByLatestTrade,
  listTokensByLatestTradeSchema,
} from './tools/tokenListing.js'

// Import token details tools
import {
  getTokenChart,
  tokenChartSchema,
  getTokenSwapHistory,
  tokenSwapHistorySchema,
  getTokenMarket,
  tokenMarketSchema,
  getTokenHolders,
  tokenHoldersSchema,
} from './tools/tokenDetails.js'

// Import market info tools
import {
  getMarketTypeInfoTool,
  marketTypeInfoSchema,
  getMarketTypeComparisonTool,
  marketTypeComparisonSchema,
  getTokenMarketPhaseTool,
  tokenMarketPhaseSchema,
} from './tools/marketInfo.js'

// Import token trading tools
import {
  buyTokensFromCurve,
  buyFromCurveSchema,
  exactOutBuyTokensFromCurve,
  exactOutBuyFromCurveSchema,
  buyTokensFromDex,
  buyFromDexSchema,
  sellTokensToDex,
  sellToDexSchema,
} from './tools/tokenTrading.js'

import { monadTestnet } from 'viem/chains'

// Create a public client to interact with Monad testnet
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

// Create an MCP server instance
const server = new McpServer({
  name: 'nadcp_dot_fun',
  version: '0.1.0',
  description: 'MCP server for interacting with Nad.fun on Monad blockchain',
})

/**
 * Main function to start the MCP server
 * Uses stdio for communication with LLM clients
 */

// Start the server
async function main() {
  // Register tools

  // Existing tools
  server.tool(
    'search-tokens',
    'Search for tokens on Nad.fun by name or symbol',
    searchTokensSchema,
    async (params) => searchTokens(publicClient, params),
  )

  server.tool(
    'token-stats',
    'Get detailed stats for a specific Nad.fun token',
    tokenStatsSchema,
    async (params) => getTokenStats(publicClient, params),
  )

  // Account tools
  server.tool(
    'account-positions',
    'Get token positions held by an account',
    accountPositionsSchema,
    async (params) => getAccountPositions(publicClient, params),
  )

  server.tool(
    'account-created-tokens',
    'Get tokens created by a specific account',
    accountCreatedTokensSchema,
    async (params) => getAccountCreatedTokens(publicClient, params),
  )

  // Token listing tools
  server.tool(
    'list-tokens-by-creation-time',
    'Get tokens ordered by creation time (newest first)',
    listTokensByCreationTimeSchema,
    async (params) => listTokensByCreationTime(publicClient, params),
  )

  server.tool(
    'list-tokens-by-market-cap',
    'Get tokens ordered by market cap (highest first)',
    listTokensByMarketCapSchema,
    async (params) => listTokensByMarketCap(publicClient, params),
  )

  server.tool(
    'list-tokens-by-latest-trade',
    'Get tokens ordered by latest trade time',
    listTokensByLatestTradeSchema,
    async (params) => listTokensByLatestTrade(publicClient, params),
  )

  // Token details tools
  server.tool(
    'token-chart',
    'Get chart data for a specific token',
    tokenChartSchema,
    async (params) => getTokenChart(publicClient, params),
  )

  server.tool(
    'token-swap-history',
    'Get swap history for a specific token',
    tokenSwapHistorySchema,
    async (params) => getTokenSwapHistory(publicClient, params),
  )

  server.tool(
    'token-market',
    'Get market information for a specific token',
    tokenMarketSchema,
    async (params) => getTokenMarket(publicClient, params),
  )

  server.tool(
    'token-holders',
    'Get list of holders for a specific token',
    tokenHoldersSchema,
    async (params) => getTokenHolders(publicClient, params),
  )

  // Market info tools
  server.tool(
    'market-type-info',
    'Get detailed information about a specific market type (CURVE or DEX)',
    marketTypeInfoSchema,
    async (params) => getMarketTypeInfoTool(publicClient, params),
  )

  server.tool(
    'market-type-comparison',
    'Get a comparison between CURVE and DEX market types',
    marketTypeComparisonSchema,
    async (params) => getMarketTypeComparisonTool(publicClient, params),
  )

  server.tool(
    'token-market-phase',
    "Get detailed information about a token's current market phase",
    tokenMarketPhaseSchema,
    async (params) => getTokenMarketPhaseTool(publicClient, params),
  )

  // Token trading tools
  server.tool(
    'buy-tokens-from-curve',
    'Buy tokens from bonding curve (only available in CURVE phase). ',
    buyFromCurveSchema,
    async (params) => buyTokensFromCurve(publicClient, params),
  )

  server.tool(
    'exact-out-buy-tokens-from-curve',
    'Buy exact amount of tokens from bonding curve (only available in CURVE phase). ',
    exactOutBuyFromCurveSchema,
    async (params) => exactOutBuyTokensFromCurve(publicClient, params),
  )

  server.tool(
    'buy-tokens-from-dex',
    'Buy tokens from DEX (only available in DEX phase). ',
    buyFromDexSchema,
    async (params) => buyTokensFromDex(publicClient, params),
  )

  server.tool(
    'sell-tokens-to-dex',
    'Sell tokens to DEX (only available in DEX phase). ',
    sellToDexSchema,
    async (params) => sellTokensToDex(publicClient, params),
  )

  // Create a transport layer using standard input/output
  const transport = new StdioServerTransport()

  // Connect the server to the transport
  await server.connect(transport)

  console.error('Nad.fun MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Error running MCP server:', error)
  process.exit(1)
})
