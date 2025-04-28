import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'
import { createWallet } from '@/lib/privy-client'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? 'https://nadcp-dot-fun.vercel.app/auth/google/callback'
    : 'http://localhost:3000/auth/google/callback'

// Redis setup
const redisUrl = process.env.REDIS_REMOTE_REDIS_URL || process.env.KV_URL

// Route handler for the OAuth callback
export async function GET(request: NextRequest) {
  // Extract code and state from the callback
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth credentials not configured' },
      { status: 500 },
    )
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: 400 },
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user information' },
        { status: 400 },
      )
    }

    const userData = await userInfoResponse.json()

    // Generate a wallet for the user if first login
    let walletInfo: any = null
    try {
      // Create a new wallet
      walletInfo = await createWallet()
      console.log('Created new wallet for user:', userData.email, walletInfo)
    } catch (error) {
      console.error('Error creating wallet:', error)
      // Continue the flow even if wallet creation fails
    }

    // Store the user data and tokens in Redis
    if (redisUrl && state) {
      const redis = createClient({ url: redisUrl })
      redis.on('error', (err) => console.error('Redis error', err))

      await redis.connect()

      // Store user information and tokens
      // Key format: auth:{sessionId}
      await redis.set(
        `auth:${state}`,
        JSON.stringify({
          user: {
            id: userData.sub,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
          },
          wallet: walletInfo
            ? {
                id: walletInfo.id,
                address: walletInfo.address,
              }
            : null,
          tokens: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            id_token: tokenData.id_token,
            expires_at: Date.now() + tokenData.expires_in * 1000,
          },
        }),
        { EX: 24 * 60 * 60 }, // 24 hours expiration
      )

      await redis.disconnect()
    }

    // For mcp-remote, return a success response that it can parse
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <script>
            window.onload = function() {
              window.close();
            }
          </script>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 0.5rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #4CAF50;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 1.5rem;
            }
            .wallet-info {
              background-color: #f8f9fa;
              padding: 1rem;
              border-radius: 0.5rem;
              margin-top: 1rem;
              font-family: monospace;
              text-align: left;
              font-size: 0.8rem;
              max-width: 100%;
              overflow-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Successful</h1>
            <p>You are now authenticated with Google. You can close this window and return to Claude Desktop.</p>
            ${
              walletInfo
                ? `
            <div class="wallet-info">
              <strong>Wallet created:</strong><br>
              Address: ${walletInfo.address}
            </div>
            `
                : ''
            }
          </div>
        </body>
      </html>
    `

    return new NextResponse(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 },
    )
  }
}
