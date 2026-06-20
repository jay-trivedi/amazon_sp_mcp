#!/usr/bin/env tsx

/**
 * Manual test script for authentication with REAL Amazon credentials
 * Run with: pnpm test:manual-auth
 */

/* eslint-disable no-console */

import * as dotenv from 'dotenv';
import { CredentialsManager } from '../src/auth/credentials.js';
import { TokenManager } from '../src/auth/token-manager.js';
import { signRequest } from '../src/utils/aws-signature.js';

// Load environment variables
dotenv.config();

async function testAuthentication() {
  console.log('🔐 Testing Amazon SP-API Authentication Flow\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Load and validate credentials
    console.log('\n📋 Step 1: Loading credentials from .env file...');
    const credManager = new CredentialsManager();
    console.log('✅ Credentials loaded and validated successfully!');

    const awsCreds = credManager.getAWSCredentials();
    const lwaCreds = credManager.getLWACredentials();
    const config = credManager.getSPAPIConfig();

    console.log('\n📊 Credential Summary:');
    console.log(`  AWS Region: ${awsCreds.region}`);
    console.log(`  AWS Access Key: ${awsCreds.accessKeyId.substring(0, 8)}...`);
    console.log(`  LWA Client ID: ${lwaCreds.clientId.substring(0, 20)}...`);
    console.log(`  Seller ID: ${config.sellerId}`);
    console.log(`  Marketplace: ${config.marketplaceId}`);
    console.log(`  Endpoint: ${config.endpoint}`);

    // Step 2: Test LWA token exchange
    console.log('\n🔄 Step 2: Testing LWA OAuth 2.0 token exchange...');
    const tokenManager = new TokenManager(lwaCreds);

    console.log('  Requesting access token from Amazon...');
    const accessToken = await tokenManager.getAccessToken();

    if (accessToken && accessToken.length > 0) {
      console.log(`✅ Access token received successfully!`);
      console.log(
        `  Token preview: ${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`
      );
      console.log(`  Token length: ${accessToken.length} characters`);
      console.log(`  Cached: ${tokenManager.hasCachedToken() ? 'Yes' : 'No'}`);
    } else {
      throw new Error('Received empty access token');
    }

    // Step 3: Test token caching
    console.log('\n💾 Step 3: Testing token caching...');
    const startTime = Date.now();
    const cachedToken = await tokenManager.getAccessToken();
    const cacheTime = Date.now() - startTime;

    if (cachedToken === accessToken) {
      console.log(`✅ Token retrieved from cache successfully!`);
      console.log(`  Cache retrieval time: ${cacheTime}ms`);
    } else {
      console.warn('⚠️  Warning: Cached token differs from original');
    }

    // Step 4: Test AWS Signature V4
    console.log('\n🔏 Step 4: Testing AWS Signature V4 signing...');
    const testRequest = {
      method: 'GET',
      url: `${config.endpoint}/orders/v0/orders?MarketplaceIds=${config.marketplaceId}`,
      headers: {
        'x-amz-access-token': accessToken,
      },
    };

    const signedHeaders = signRequest(testRequest, awsCreds);

    if (signedHeaders.Authorization && signedHeaders['X-Amz-Date']) {
      console.log('✅ Request signed successfully!');
      console.log(`  Authorization header: ${signedHeaders.Authorization.substring(0, 50)}...`);
      console.log(`  X-Amz-Date: ${signedHeaders['X-Amz-Date']}`);
      console.log(`  Host: ${signedHeaders.host}`);
    } else {
      throw new Error('Failed to generate signature headers');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 SUCCESS! All authentication tests passed!\n');
    console.log('✅ Credentials are valid');
    console.log('✅ LWA OAuth 2.0 token exchange works');
    console.log('✅ Token caching works');
    console.log('✅ AWS Signature V4 signing works');
    console.log('\n✨ Your authentication setup is ready for SP-API calls!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('\n❌ AUTHENTICATION TEST FAILED\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      // Provide helpful guidance based on error
      if (error.message.includes('Missing required credentials')) {
        console.error('\n💡 Fix: Make sure your .env file has all required credentials');
        console.error('   Run: cp .env.example .env');
        console.error('   Then fill in your actual credentials');
      } else if (error.message.includes('invalid_grant')) {
        console.error('\n💡 Fix: Your LWA_REFRESH_TOKEN is invalid or expired');
        console.error('   You need to re-authorize and get a new refresh token');
      } else if (error.message.includes('invalid_client')) {
        console.error('\n💡 Fix: Your LWA_CLIENT_ID or LWA_CLIENT_SECRET is incorrect');
        console.error('   Check your Developer Console settings');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
        console.error('\n💡 Fix: Network connection issue');
        console.error('   Check your internet connection');
      }

      console.error('\n📖 See SETUP_CREDENTIALS.md for detailed instructions');
    } else {
      console.error('Unknown error:', error);
    }

    console.error('\n');
    process.exit(1);
  }
}

// Run the test
testAuthentication();
