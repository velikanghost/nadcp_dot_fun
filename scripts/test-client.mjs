#!/usr/bin/env node

import fetch from 'node-fetch'
import { createEventSource } from './event-source.mjs'

/**
 * Test script for the SSE-based MCP server
 * Usage: node scripts/test-client.mjs http://localhost:3000
 */

const baseUrl = process.argv[2] || 'http://localhost:3000'

async function testTokenSearch() {
  console.log('Testing search-tokens tool...')
  const result = await invokeTool('search-tokens', { query: 'bitcoin' })
  console.log('Results:', JSON.stringify(result, null, 2))
  return result
}

async function testTokenStats(tokenId) {
  console.log(`Testing token-stats tool for token ${tokenId}...`)
  const result = await invokeTool('token-stats', { tokenId })
  console.log('Results:', JSON.stringify(result, null, 2))
  return result
}

async function testListTokensByMarketCap() {
  console.log('Testing list-tokens-by-market-cap tool...')
  const result = await invokeTool('list-tokens-by-market-cap', { limit: 5 })
  console.log('Results:', JSON.stringify(result, null, 2))
  return result
}

async function testGetMonBalance(address) {
  console.log(`Testing get-mon-balance tool for address ${address}...`)
  const result = await invokeTool('get-mon-balance', { address })
  console.log('Results:', JSON.stringify(result, null, 2))
  return result
}

async function invokeTool(toolId, params) {
  // Create a new SSE connection
  console.log(`Connecting to SSE endpoint at ${baseUrl}/sse`)

  const eventSource = createEventSource(`${baseUrl}/sse`)

  // Wait for connection
  await new Promise((resolve) => {
    eventSource.onopen = () => {
      console.log('Connected to SSE')
      resolve()
    }
  })

  // Get the session ID from the URL
  const sessionId = new URL(eventSource.url).searchParams.get('sessionId')
  console.log(`Session ID: ${sessionId}`)

  // Listen for events
  let result = null

  const resultPromise = new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      console.log('Received event:', event.data)

      // Check if the event is a successful result
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'tool-call-result' && data.success) {
          result = data.result
          console.log('Received successful result')
          resolve(result)
        }
      } catch (error) {
        console.error('Error parsing event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      reject(error)
    }
  })

  // Send the tool call request
  console.log(`Invoking tool ${toolId} with params:`, params)

  const response = await fetch(`${baseUrl}/message?sessionId=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'tool-call',
      toolId,
      params,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error invoking tool:', error)
    throw new Error(`Failed to invoke tool: ${error}`)
  }

  // Wait for the result
  await resultPromise

  // Close the connection
  eventSource.close()

  return result
}

async function main() {
  try {
    // Test the MON balance tool with a sample address
    await testGetMonBalance('0x3bb9AFB94c82752E47706A10779EA525Cf95dc27')

    // Run the test sequence
    const searchResults = await testTokenSearch()

    if (
      searchResults &&
      searchResults.tokens &&
      searchResults.tokens.length > 0
    ) {
      const tokenId = searchResults.tokens[0].id
      await testTokenStats(tokenId)
    }

    await testListTokensByMarketCap()

    console.log('All tests completed successfully')
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

main()
