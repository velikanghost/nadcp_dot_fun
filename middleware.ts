import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'

// Paths that require authentication
const PROTECTED_PATHS = ['/sse', '/message']

// Redis setup
const redisUrl = process.env.REDIS_REMOTE_REDIS_URL || process.env.KV_URL

// Check if environment is set to require authentication
const AUTH_REQUIRED = process.env.REQUIRE_AUTH === 'true'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip authentication if not required or for non-protected paths
  if (
    !AUTH_REQUIRED ||
    !PROTECTED_PATHS.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next()
  }

  // Check for authentication
  const sessionId =
    request.nextUrl.searchParams.get('sessionId') ||
    request.headers.get('x-mcp-session-id')

  if (!sessionId) {
    console.log('No session ID provided')
    return redirectToAuth(request)
  }

  // Check if the session is authenticated
  if (redisUrl) {
    const redis = createClient({ url: redisUrl })
    redis.on('error', (err) => console.error('Redis error', err))

    try {
      await redis.connect()
      const authData = await redis.get(`auth:${sessionId}`)
      await redis.disconnect()

      if (!authData) {
        console.log(`Session ${sessionId} not authenticated`)
        return redirectToAuth(request)
      }

      // Parse the auth data to check expiration
      const { tokens } = JSON.parse(authData)
      if (tokens.expires_at < Date.now()) {
        console.log(`Session ${sessionId} token expired`)
        return redirectToAuth(request)
      }

      // Authentication valid, continue
      return NextResponse.next()
    } catch (error) {
      console.error('Error checking authentication:', error)
      await redis.disconnect().catch(() => {})
      return redirectToAuth(request)
    }
  }

  // If Redis is not available, we can't check authentication
  return NextResponse.next()
}

function redirectToAuth(request: NextRequest) {
  const url = request.nextUrl.clone()
  const sessionId =
    request.nextUrl.searchParams.get('sessionId') ||
    request.headers.get('x-mcp-session-id') ||
    crypto.randomUUID()

  // Redirect to the auth endpoint
  url.pathname = '/auth/google'
  url.searchParams.set('sessionId', sessionId)

  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/sse/:path*', '/message/:path*'],
}
