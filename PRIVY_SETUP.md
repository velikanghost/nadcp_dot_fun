# Setting Up Privy Wallets for Nad.fun MCP

This guide explains how to set up Privy for wallet management with your MCP server, eliminating the need for users to provide their private keys when performing transactions.

## Why Privy?

Privy provides embedded wallets that are:

- **Self-custodial**: Users maintain full control of their assets
- **Easy to use**: No need for users to manage private keys manually
- **Secure**: Private keys are never exposed in plaintext
- **Integrated**: Wallets are tied to user authentication

## 1. Create a Privy Account

1. Go to [Privy](https://privy.io/) and sign up for an account
2. Create a new app in the Privy dashboard

## 2. Set Up Your App in Privy Dashboard

1. Navigate to the "App Settings" section in your Privy dashboard
2. Note your App ID and App Secret
3. Go to "Wallets" and enable "Server-to-Server Wallet API"
4. Generate an authorization key for wallet operations

## 3. Configure Your Vercel Environment

Add the following environment variables to your Vercel project:

1. `PRIVY_APP_ID`: Your Privy App ID
2. `PRIVY_APP_SECRET`: Your Privy App Secret
3. `PRIVY_WALLET_AUTH_KEY`: The authorization key generated in the previous step (in the format `wallet-auth:your-key`)

For local development, add these variables to your `.env.local` file.

## 4. How the Integration Works

When a user authenticates with Google OAuth, the system:

1. Creates a unique Privy wallet for the user (if they don't already have one)
2. Stores the wallet ID and address in the user's session
3. Uses this wallet for all transaction operations

When the user performs a transaction:

1. The system checks if there's an authenticated wallet in their session
2. If found, it uses the Privy wallet to sign and send the transaction
3. If not, it falls back to asking for a private key

## 5. Testing the Integration

To test that the Privy integration is working:

1. Log in to your MCP with Google authentication
2. Try to perform a transaction (like buying tokens)
3. The transaction should proceed without asking for a private key
4. Check your Privy dashboard to see the wallet and transaction activity

## 6. Troubleshooting

If you encounter issues:

1. **Wallet Creation Fails**: Verify your Privy credentials and authorization key
2. **Transaction Fails**: Check that the wallet has enough balance for the transaction
3. **Authentication Issues**: Make sure your OAuth flow is working correctly

## 7. Security Considerations

- Never log or expose the Privy App Secret or authorization key
- Use HTTPS for all API calls to ensure sensitive data is encrypted in transit
- Monitor your Privy dashboard for unusual wallet activity

## 8. Production Readiness

Before deploying to production:

1. Implement proper error handling and recovery mechanisms
2. Set up monitoring for wallet operations
3. Add rate limiting to prevent abuse
4. Have a plan for wallet recovery if users lose access to their authentication method
