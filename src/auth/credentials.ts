/**
 * Credential management for Amazon SP-API
 */

import { SPAPICredentials, AWSCredentials, LWACredentials, SPAPIConfig } from '../types/sp-api.js';

/**
 * Load and validate SP-API credentials from environment variables
 */
export class CredentialsManager {
  private credentials: SPAPICredentials;

  constructor() {
    this.credentials = this.loadFromEnvironment();
    this.validate();
  }

  /**
   * Load credentials from environment variables
   */
  private loadFromEnvironment(): SPAPICredentials {
    const aws: AWSCredentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
    };

    const lwa: LWACredentials = {
      clientId: process.env.LWA_CLIENT_ID || '',
      clientSecret: process.env.LWA_CLIENT_SECRET || '',
      refreshToken: process.env.LWA_REFRESH_TOKEN || '',
    };

    const config: SPAPIConfig = {
      sellerId: process.env.SELLER_ID || '',
      marketplaceId: process.env.MARKETPLACE_ID || '',
      endpoint: process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com',
    };

    return { aws, lwa, config };
  }

  /**
   * Validate that all required credentials are present
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate AWS credentials
    if (!this.credentials.aws.accessKeyId) {
      errors.push('AWS_ACCESS_KEY_ID is required');
    }
    if (!this.credentials.aws.secretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY is required');
    }

    // Validate LWA credentials
    if (!this.credentials.lwa.clientId) {
      errors.push('LWA_CLIENT_ID is required');
    }
    if (!this.credentials.lwa.clientSecret) {
      errors.push('LWA_CLIENT_SECRET is required');
    }
    if (!this.credentials.lwa.refreshToken) {
      errors.push('LWA_REFRESH_TOKEN is required');
    }

    // Validate SP-API config
    if (!this.credentials.config.sellerId) {
      errors.push('SELLER_ID is required');
    }
    if (!this.credentials.config.marketplaceId) {
      errors.push('MARKETPLACE_ID is required');
    }

    if (errors.length > 0) {
      throw new Error(`Missing required credentials:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
  }

  /**
   * Get AWS credentials
   */
  getAWSCredentials(): AWSCredentials {
    return this.credentials.aws;
  }

  /**
   * Get LWA credentials
   */
  getLWACredentials(): LWACredentials {
    return this.credentials.lwa;
  }

  /**
   * Get SP-API configuration
   */
  getSPAPIConfig(): SPAPIConfig {
    return this.credentials.config;
  }

  /**
   * Get all credentials
   */
  getAll(): SPAPICredentials {
    return this.credentials;
  }
}
