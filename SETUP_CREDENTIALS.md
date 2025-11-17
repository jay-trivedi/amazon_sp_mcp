# Amazon SP-API Credentials Setup Guide

This guide will walk you through obtaining all the required credentials to use the Amazon Seller Central MCP server.

## Required Credentials

You need **7 credentials** in total:

1. AWS Access Key ID
2. AWS Secret Access Key
3. LWA Client ID
4. LWA Client Secret
5. LWA Refresh Token
6. Seller ID
7. Marketplace ID

---

## Part 1: Register as an SP-API Developer

### Step 1: Access Developer Console

1. Log in to **Amazon Seller Central**: https://sellercentral.amazon.com
2. Click **Apps & Services** in the top menu
3. Select **Develop Apps**

### Step 2: Create a New App

1. Click **Add new app client**
2. Fill in the application details:
   - **App Name**: `My MCP Server` (or any descriptive name)
   - **OAuth Redirect URIs**: `https://localhost`
3. Click **Save and get credentials**

### Step 3: Save Your LWA Credentials

You'll see a popup with:
- ✅ **LWA Client ID** (starts with `amzn1.application-oa2-client.`)
- ✅ **LWA Client Secret** (long random string)

**⚠️ IMPORTANT**: Copy these immediately! The Client Secret won't be shown again.

---

## Part 2: Generate Refresh Token

The refresh token allows your application to get access tokens without user interaction.

### Step 1: Authorize Your Application

1. **Replace `YOUR_CLIENT_ID`** in this URL with your actual Client ID:
   ```
   https://sellercentral.amazon.com/apps/authorize/consent?application_id=YOUR_CLIENT_ID&version=beta
   ```

2. Open the URL in your browser

3. You'll see an authorization page - click **Authorize**

4. You'll be redirected to: `https://localhost?spapi_oauth_code=XXXXXXXX`
   - Your browser may show "This site can't be reached" - **this is normal!**
   - Copy the `spapi_oauth_code` value from the URL bar

### Step 2: Exchange Code for Refresh Token

Run this curl command (replace the placeholders with your values):

```bash
curl -X POST https://api.amazon.com/auth/o2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_SPAPI_OAUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Response:**
```json
{
  "access_token": "Atza|...",
  "refresh_token": "Atzr|...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

✅ **Save the `refresh_token`** (starts with `Atzr|`) - this is your **LWA Refresh Token**

**Note**: The refresh token doesn't expire (unless revoked), so you only need to do this once.

---

## Part 3: Create AWS IAM User

SP-API requires AWS credentials to sign requests.

### Step 1: Access AWS IAM

1. Log in to **AWS Console**: https://console.aws.amazon.com
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** → **Add users**

### Step 2: Create User

1. **User name**: `sp-api-user` (or any name)
2. **Select AWS credential type**: ✅ **Access key - Programmatic access**
3. Click **Next: Permissions**

### Step 3: Set Permissions

1. Click **Attach existing policies directly** → **Create policy**
2. Switch to **JSON** tab and paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "execute-api:Invoke",
         "Resource": "arn:aws:execute-api:*:*:*"
       }
     ]
   }
   ```
3. Click **Review policy**
4. **Name**: `SPAPIExecutePolicy`
5. Click **Create policy**
6. Back on the user creation page, refresh and select `SPAPIExecutePolicy`
7. Click **Next** through tags and review
8. Click **Create user**

### Step 4: Save AWS Credentials

You'll see:
- ✅ **Access key ID** (starts with `AKIA`)
- ✅ **Secret access key** (long random string)

**⚠️ CRITICAL**: Download the CSV or copy these now! The secret key won't be shown again.

---

## Part 4: Get Seller ID

### Option 1: From Account Settings

1. In Seller Central, click **Settings** (gear icon)
2. Select **Account Info**
3. Look for **Merchant Token** or **Seller ID**
4. ✅ Copy the value (format: `A1XXXXXXXXXXXXX`)

### Option 2: From API Response

If you can't find it in settings, you can get it from the API later using:
```
GET /sellers/v1/marketplaceParticipations
```

---

## Part 5: Get Marketplace ID

Marketplace IDs are standardized by region:

### North America
- 🇺🇸 **US**: `ATVPDKIKX0DER`
- 🇨🇦 **Canada**: `A2EUQ1WTGCTBG2`
- 🇲🇽 **Mexico**: `A1AM78C64UM0Y8`
- 🇧🇷 **Brazil**: `A2Q3Y263D00KWC`

### Europe
- 🇬🇧 **UK**: `A1F83G8C2ARO7P`
- 🇩🇪 **Germany**: `A1PA6795UKMFR9`
- 🇫🇷 **France**: `A13V1IB3VIYZZH`
- 🇮🇹 **Italy**: `APJ6JRA9NG5V4`
- 🇪🇸 **Spain**: `A1RKKUPIHCS9HS`
- 🇳🇱 **Netherlands**: `A1805IZSGTT6HS`

### Asia Pacific
- 🇯🇵 **Japan**: `A1VC38T7YXB528`
- 🇦🇺 **Australia**: `A39IBJ37TRP1C6`
- 🇸🇬 **Singapore**: `A19VAU5U5O7RUS`

**[Full list of marketplace IDs](https://developer-docs.amazon.com/sp-api/docs/marketplace-ids)**

---

## Part 6: Configure Your .env File

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your credentials:
   ```env
   # AWS Credentials (from IAM user)
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1

   # LWA Credentials (from Developer Console)
   LWA_CLIENT_ID=amzn1.application-oa2-client.xxxxxxxxxxxxx
   LWA_CLIENT_SECRET=your_client_secret_here
   LWA_REFRESH_TOKEN=Atzr|IwEBxxxxxxxxxxxxxxx

   # Seller Information
   SELLER_ID=A1XXXXXXXXXXXXX
   MARKETPLACE_ID=ATVPDKIKX0DER

   # SP-API Endpoint (based on region)
   SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com
   ```

### SP-API Endpoints by Region

- **North America**: `https://sellingpartnerapi-na.amazon.com`
- **Europe**: `https://sellingpartnerapi-eu.amazon.com`
- **Far East**: `https://sellingpartnerapi-fe.amazon.com`

---

## Part 7: Test Your Credentials

Run the authentication test script:

```bash
npm run test:manual-auth
```

**Expected output:**
```
🔐 Testing Amazon SP-API Authentication Flow

============================================================

📋 Step 1: Loading credentials from .env file...
✅ Credentials loaded and validated successfully!

🔄 Step 2: Testing LWA OAuth 2.0 token exchange...
  Requesting access token from Amazon...
✅ Access token received successfully!

💾 Step 3: Testing token caching...
✅ Token retrieved from cache successfully!

🔏 Step 4: Testing AWS Signature V4 signing...
✅ Request signed successfully!

============================================================

🎉 SUCCESS! All authentication tests passed!
```

---

## Troubleshooting

### Error: "invalid_grant"
**Problem**: Your refresh token is invalid or expired

**Solution**:
1. Go through Part 2 again to get a new refresh token
2. Make sure you copied the entire token (they're quite long)

### Error: "invalid_client"
**Problem**: Your LWA Client ID or Secret is incorrect

**Solution**:
1. Check Developer Console for correct values
2. Make sure there are no extra spaces in your `.env` file
3. Client Secret should be the one from initial app creation

### Error: "Missing required credentials"
**Problem**: One or more environment variables are not set

**Solution**:
1. Check your `.env` file exists
2. Verify all 7 credentials are filled in
3. Make sure variable names match exactly (case-sensitive)

### Error: "UnrecognizedClientException"
**Problem**: Your AWS credentials are incorrect or IAM user doesn't have permissions

**Solution**:
1. Verify AWS Access Key ID and Secret
2. Check IAM user has `execute-api:Invoke` permission
3. Region should match your marketplace (usually `us-east-1`)

### Error: Network/Connection Issues
**Problem**: Can't reach Amazon APIs

**Solution**:
1. Check your internet connection
2. Verify you're not behind a restrictive firewall
3. Try accessing https://api.amazon.com in a browser

---

## Security Best Practices

### ✅ DO:
- Store credentials in `.env` file (already in `.gitignore`)
- Rotate your AWS access keys periodically
- Use IAM user with minimal required permissions
- Keep your refresh token secret

### ❌ DON'T:
- Commit `.env` file to git
- Share your credentials publicly
- Use root AWS account credentials
- Hardcode credentials in source code

---

## Next Steps

Once your credentials are working:

1. ✅ Authentication is complete
2. Move on to **Phase 1.4: HTTP Client** implementation
3. Start making actual SP-API calls (orders, inventory, etc.)

---

## Helpful Links

- [SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [LWA Authentication](https://developer-docs.amazon.com/sp-api/docs/lwa-authorisation-workflow)
- [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [Marketplace IDs](https://developer-docs.amazon.com/sp-api/docs/marketplace-ids)
- [Seller Central](https://sellercentral.amazon.com)

---

## Still Having Issues?

1. Check the [GitHub Issues](https://github.com/jay-trivedi/amazon_sp_mcp/issues)
2. Review the SP-API documentation
3. Verify all steps were followed exactly
4. Double-check for typos in your `.env` file

**Remember**: Getting credentials is a one-time setup. Once you have them, they'll work for all future development!
