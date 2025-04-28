# Setting Up Google OAuth for Nad.fun MCP Server

This guide explains how to set up Google OAuth for authenticating users of the Nad.fun MCP server.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Give your project a name (e.g., "Nad.fun MCP")
4. Wait for the project to be created

## 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type (unless you're limiting to a Google Workspace organization)
3. Fill in the required fields:
   - App name: "Nad.fun MCP"
   - User support email: Your email address
   - Developer contact information: Your email address
4. Click "Save and Continue"
5. Add the following scopes:
   - `openid`
   - `email`
   - `profile`
6. Click "Save and Continue"
7. Add test users if you're not verifying your app
8. Click "Save and Continue"

## 3. Create OAuth Client ID

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Name: "Nad.fun MCP Web Client"
5. Add authorized JavaScript origins:
   - For production: `https://nadcp-dot-fun.vercel.app`
   - For development: `http://localhost:3000`
6. Add authorized redirect URIs:
   - For production: `https://nadcp-dot-fun.vercel.app/auth/google/callback`
   - For development: `http://localhost:3000/auth/google/callback`
7. Click "Create"
8. Note your Client ID and Client Secret

## 4. Add Environment Variables

Add the following environment variables to your Vercel project:

1. `GOOGLE_CLIENT_ID`: Your OAuth client ID
2. `GOOGLE_CLIENT_SECRET`: Your OAuth client secret
3. `REQUIRE_AUTH`: Set to "true" to enable authentication

For local development, create a `.env.local` file with the same variables:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
REQUIRE_AUTH=true
```

## 5. Deploy Your Application

Deploy your application to Vercel. The authentication system will now:

1. Redirect unauthenticated users to Google login
2. Process the authentication callback
3. Store user session information in Redis
4. Allow authenticated users to access the MCP endpoints

## 6. Testing the Authentication

To test the authentication flow:

1. Visit `https://nadcp-dot-fun.vercel.app/sse` directly in a browser
2. You should be redirected to Google's login page
3. After logging in, you should be redirected back to your application

## 7. Troubleshooting

If you encounter issues:

1. **Invalid Redirect**: Make sure your redirect URIs are correctly configured in Google Cloud Console
2. **Authentication Errors**: Check the logs in Vercel for error messages
3. **Redis Connection Issues**: Verify your Redis instance is running and accessible
4. **CORS Errors**: Make sure your application's origins are properly configured

## 8. Security Considerations

- Authentication tokens are stored in Redis with a 24-hour expiration
- Never store sensitive user data beyond what's needed for authentication
- Periodically review and update your OAuth consent screen and credentials
- Consider implementing rate limiting for authentication attempts
