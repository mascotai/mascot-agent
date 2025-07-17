import { randomBytes } from "crypto";
import { logger } from "@elizaos/core";

/**
 * Generate OAuth state parameter for security
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Twitter OAuth 1.0a utility functions
 */
export class TwitterOAuthUtils {
  /**
   * Validate Twitter OAuth callback parameters
   */
  static validateCallbackParams(params: {
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
  }): boolean {
    return !!(params.oauth_token && params.oauth_verifier && params.state);
  }

  /**
   * Generate Twitter API callback URL
   */
  static generateCallbackUrl(baseUrl: string): string {
    return `${baseUrl}/api/auth/twitter/callback`;
  }

  /**
   * Parse Twitter API error response
   */
  static parseTwitterError(error: any): string {
    if (error.data?.detail) {
      return error.data.detail;
    }
    if (error.data?.errors?.length > 0) {
      return error.data.errors[0].message;
    }
    return error.message || "Unknown Twitter API error";
  }

  /**
   * Validate Twitter credentials structure
   */
  static validateTwitterCredentials(credentials: any): boolean {
    return !!(
      credentials.apiKey &&
      credentials.apiSecretKey &&
      credentials.accessToken &&
      credentials.accessTokenSecret
    );
  }
}