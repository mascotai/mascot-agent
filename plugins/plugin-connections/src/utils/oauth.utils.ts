import { randomBytes, createHash } from "crypto";
import { logger } from "@elizaos/core";

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(
  providedState: string,
  storedState: string,
): boolean {
  if (!providedState || !storedState) {
    return false;
  }

  // Use timing-safe comparison
  return providedState === storedState;
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);
  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Parse OAuth callback URL parameters
 */
export function parseOAuthCallback(
  callbackUrl: string,
): Record<string, string> {
  try {
    const url = new URL(callbackUrl);
    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  } catch (error) {
    logger.error("Failed to parse OAuth callback URL:", error);
    return {};
  }
}

/**
 * Twitter OAuth 1.0a signature utilities
 */
export class TwitterOAuthUtils {
  /**
   * Generate OAuth 1.0a signature for Twitter API
   */
  static generateSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret?: string,
  ): string {
    // Create parameter string
    const sortedParams = Object.keys(params)
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
      )
      .join("&");

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join("&");

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || "")}`;

    // Generate signature
    const signature = createHash("sha1")
      .update(signatureBaseString)
      .digest("base64");

    return signature;
  }

  /**
   * Build OAuth 1.0a authorization header
   */
  static buildAuthorizationHeader(params: Record<string, string>): string {
    const oauthParams = Object.keys(params)
      .filter((key) => key.startsWith("oauth_"))
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`,
      )
      .join(", ");

    return `OAuth ${oauthParams}`;
  }
}

/**
 * Generic OAuth 2.0 utilities
 */
export class OAuth2Utils {
  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    if (codeVerifier) {
      params.append("code_verifier", codeVerifier);
    }

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(
          `Token exchange failed: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      logger.error("OAuth2 token exchange failed:", error);
      throw error;
    }
  }

  /**
   * Refresh OAuth 2.0 access token
   */
  static async refreshAccessToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      logger.error("OAuth2 token refresh failed:", error);
      throw error;
    }
  }
}
