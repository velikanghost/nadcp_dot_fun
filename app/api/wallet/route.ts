import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'
import { sendTransaction } from '@/lib/privy-client'

// Redis setup
const redisUrl = process.env.REDIS_REMOTE_REDIS_URL || process.env.KV_URL

// GET endpoint to retrieve wallet information
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    const redis = createClient({ url: redisUrl! })
    redis.on('error', (err) => console.error('Redis error', err))

    await redis.connect()

    // Get the user's auth data
    const authData = await redis.get(`auth:${sessionId}`)
    await redis.disconnect()

    if (!authData) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      )
    }

    const authInfo = JSON.parse(authData)

    // Check if the user has a wallet
    if (!authInfo.wallet) {
      return NextResponse.json(
        { error: 'No wallet found for this user' },
        { status: 404 },
      )
    }

    // Return the wallet info (without sensitive data)
    return NextResponse.json({
      address: authInfo.wallet.address,
      message: 'Wallet found for this user',
    })
  } catch (error) {
    console.error('Error retrieving wallet:', error)
    return NextResponse.json(
      { error: 'Error retrieving wallet information' },
      { status: 500 },
    )
  }
}

// POST endpoint for wallet operations
export async function POST(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    // Get the operation parameters from the request body
    const body = await request.json()
    const { operation, params } = body

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation parameter required' },
        { status: 400 },
      )
    }

    const redis = createClient({ url: redisUrl! })
    redis.on('error', (err) => console.error('Redis error', err))

    await redis.connect()

    // Get the user's auth data
    const authData = await redis.get(`auth:${sessionId}`)
    await redis.disconnect()

    if (!authData) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      )
    }

    const authInfo = JSON.parse(authData)

    // Check if the user has a wallet
    if (!authInfo.wallet) {
      return NextResponse.json(
        { error: 'No wallet found for this user' },
        { status: 404 },
      )
    }

    // Handle different wallet operations
    switch (operation) {
      case 'send_transaction':
        // Validate required parameters
        if (!params.to || !params.amount) {
          return NextResponse.json(
            { error: 'To address and amount are required for transaction' },
            { status: 400 },
          )
        }

        // Process the transaction
        try {
          const transaction = await sendTransaction(
            authInfo.wallet.id,
            params.to,
            params.amount,
          )

          return NextResponse.json({
            success: true,
            transaction,
          })
        } catch (txError) {
          console.error('Transaction error:', txError)
          return NextResponse.json(
            { error: 'Failed to execute transaction', details: txError },
            { status: 500 },
          )
        }

      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Wallet operation error:', error)
    return NextResponse.json(
      { error: 'Error processing wallet operation' },
      { status: 500 },
    )
  }
}
