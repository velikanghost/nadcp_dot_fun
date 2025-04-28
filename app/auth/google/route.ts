import { NextRequest, NextResponse } from 'next/server'

// This is a placeholder for the Google OAuth implementation
// You'll need to replace this with actual Google OAuth implementation

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI =
  process.env.NODE_ENV === 'production'
    ? 'https://nadcp-dot-fun.vercel.app/auth/google/callback'
    : 'http://localhost:3000/auth/google/callback'

// Route handler for initiating the OAuth flow
export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Google Client ID not configured' },
      { status: 500 },
    )
  }

  // Get the session ID from the request, which will be used to associate the auth response
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  // State parameter to prevent CSRF
  const state = sessionId || crypto.randomUUID()

  // Generate Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('state', state)

  // Redirect to Google's OAuth page
  return NextResponse.redirect(googleAuthUrl.toString())
}
