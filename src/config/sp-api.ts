/**
 * SP-API configuration and initialization
 */

import { CredentialsManager } from '../auth/credentials.js';
import { TokenManager } from '../auth/token-manager.js';
import { SPAPIConfig, AWSCredentials } from '../types/sp-api.js';

/**
 * Centralized SP-API configuration
 */
export class SPAPIConfigManager {
  private credentialsManager: CredentialsManager;
  private tokenManager: TokenManager;

  constructor() {
    this.credentialsManager = new CredentialsManager();
    this.tokenManager = new TokenManager(this.credentialsManager.getLWACredentials());
  }

  /**
   * Get the token manager instance
   */
  getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  /**
   * Get AWS credentials
   */
  getAWSCredentials(): AWSCredentials {
    return this.credentialsManager.getAWSCredentials();
  }

  /**
   * Get SP-API configuration
   */
  getSPAPIConfig(): SPAPIConfig {
    return this.credentialsManager.getSPAPIConfig();
  }

  /**
   * Get a valid access token
   */
  async getAccessToken(): Promise<string> {
    return await this.tokenManager.getAccessToken();
  }
}

// Export a singleton instance
let configInstance: SPAPIConfigManager | null = null;

/**
 * Get or create the SP-API config instance
 */
export function getSPAPIConfig(): SPAPIConfigManager {
  if (!configInstance) {
    configInstance = new SPAPIConfigManager();
  }
  return configInstance;
}

/**
 * Reset the config instance (useful for testing)
 */
export function resetSPAPIConfig(): void {
  configInstance = null;
}
