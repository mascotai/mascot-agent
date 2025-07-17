import { logger, type UUID } from "@elizaos/core";
import type { AuthService } from "../services/auth.service.js";
import { generateOAuthState, TwitterOAuthUtils } from "../utils/oauth.utils.js";
import type { TwitterCredentials } from "../types/auth.types.js";
import { TwitterApi } from "twitter-api-v2";

/**
 * Twitter OAuth 1.0a authentication routes
 */
export const twitterAuthRoutes = [
  {
    name: "twitter-auth-initiate",
    path: "/auth/twitter/connect",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        const { returnUrl } = req.body;

        // Extract agentId from URL or headers - using window.ELIZA_CONFIG pattern
        const agentId = req.headers["x-agent-id"] || req.query.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Get Twitter API credentials from environment
        const consumerKey = process.env.TWITTER_API_KEY;
        const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

        if (!consumerKey || !consumerSecret) {
          logger.error("Twitter API credentials not found in environment");
          return res.status(500).json({
            error:
              "Twitter API credentials not configured. Please set TWITTER_API_KEY and TWITTER_API_SECRET_KEY.",
          });
        }

        logger.info(`Using Twitter API credentials - Key: ${consumerKey?.substring(0, 5)}..., Secret: ${consumerSecret?.substring(0, 5)}...`);

        // Initialize Twitter API client for OAuth
        const twitterApi = new TwitterApi({
          appKey: consumerKey,
          appSecret: consumerSecret,
        });

        // Generate state for security first
        const state = generateOAuthState();

        // Generate callback URL with agentId and state
        const callbackUrl = TwitterOAuthUtils.generateCallbackUrl(
          `${req.protocol}://${req.get("host")}`,
          agentId,
          state
        );

        logger.info(`Generated callback URL: ${callbackUrl}`);

        // Get request token
        logger.info("Requesting Twitter OAuth request token...");
        logger.info(`Request details - Callback: ${callbackUrl}, Consumer Key: ${consumerKey?.substring(0, 10)}...`);
        
        let authLink;
        try {
          authLink = await twitterApi.generateAuthLink(callbackUrl, {
            linkMode: "authorize", // Use 'authorize' for web apps
          });
          
          logger.info(`Twitter OAuth request successful - token: ${authLink.oauth_token?.substring(0, 10)}...`);
        } catch (twitterError: any) {
          logger.error("Twitter API Error Details:", {
            message: twitterError.message,
            code: twitterError.code,
            status: twitterError.status,
            data: twitterError.data,
            errors: twitterError.errors,
          });
          throw twitterError;
        }

        // Store OAuth session with temporary credentials
        await authService.createOAuthSession(
          agentId,
          "twitter",
          state,
          returnUrl,
        );

        // Store temporary credentials securely in cache
        // Use a separate cache key for OAuth token secrets
        const tempCredentialsKey = `${agentId}:twitter:temp:${authLink.oauth_token}`;
        const tempCredentials = {
          oauth_token_secret: authLink.oauth_token_secret,
          agentId,
          createdAt: new Date().toISOString(),
        };

        // Store temp credentials with 15 minute TTL (matching OAuth session)
        authService.storeTempCredentials(tempCredentialsKey, tempCredentials);

        // Return auth URL and state - no sensitive data in response
        res.json({
          authUrl: authLink.url,
          state,
          oauth_token: authLink.oauth_token,
        });
      } catch (error) {
        logger.error("Twitter OAuth initiation failed:", error);
        res.status(500).json({
          error: "Failed to initiate Twitter authentication",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "twitter-auth-callback",
    path: "/auth/twitter/callback",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        const { oauth_token, oauth_verifier, state, agentId } = req.query;

        if (
          !TwitterOAuthUtils.validateCallbackParams({
            oauth_token,
            oauth_verifier,
            state,
          })
        ) {
          return res.status(400).json({
            error: "Missing required OAuth parameters",
          });
        }

        if (!agentId) {
          return res.status(400).json({
            error: "Missing Agent ID",
          });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Validate OAuth session
        const session = await authService.validateOAuthSession(
          agentId,
          "twitter",
          state,
        );
        if (!session) {
          return res.status(400).json({
            error: "Invalid or expired OAuth session",
          });
        }

        // Retrieve temporary credentials from cache
        const tempCredentialsKey = `${agentId}:twitter:temp:${oauth_token}`;
        const tempCredentials = authService.getTempCredentials(tempCredentialsKey);

        if (!tempCredentials) {
          return res.status(400).json({
            error: "Temporary credentials not found or expired",
          });
        }

        const { oauth_token_secret } = tempCredentials;

        // Get Twitter API credentials
        const consumerKey = process.env.TWITTER_API_KEY;
        const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

        if (!consumerKey || !consumerSecret) {
          return res.status(500).json({
            error: "Twitter API credentials not configured",
          });
        }

        // Initialize Twitter API client with temporary credentials
        const twitterApi = new TwitterApi({
          appKey: consumerKey,
          appSecret: consumerSecret,
          accessToken: oauth_token,
          accessSecret: oauth_token_secret,
        });

        // Exchange for access token
        const { accessToken, accessSecret } =
          await twitterApi.login(oauth_verifier);

        // Get user information
        const userApi = new TwitterApi({
          appKey: consumerKey,
          appSecret: consumerSecret,
          accessToken,
          accessSecret,
        });

        const user = await userApi.v2.me();

        // Prepare credentials for storage
        const credentials: TwitterCredentials = {
          apiKey: consumerKey,
          apiSecretKey: consumerSecret,
          accessToken,
          accessTokenSecret: accessSecret,
          userId: user.data.id,
          username: user.data.username,
        };

        // Store credentials
        await authService.storeCredentials(agentId, "twitter", credentials);

        // Clean up temporary credentials from cache
        authService.deleteTempCredentials(tempCredentialsKey);

        // Update OAuth session status to authorized
        await authService.updateOAuthSession(agentId, "twitter", state, {
          status: "authorized",
          authorizationCode: oauth_verifier,
        });

        // Handle popup OAuth completion
        if (session.returnUrl && session.returnUrl.includes('/goals')) {
          // For popup OAuth, return an HTML page that notifies parent and closes
          const successHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Twitter Connection Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #22c55e; font-size: 18px; }
                .loading { color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="success">✅ Twitter connection successful!</div>
              <div class="loading">This window will close automatically...</div>
              <script>
                // Notify parent window of success
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_SUCCESS', 
                    service: 'twitter',
                    user: {
                      id: '${user.data.id}',
                      username: '${user.data.username}',
                      name: '${user.data.name || ''}'
                    }
                  }, window.location.origin);
                }
                // Close popup after short delay
                setTimeout(() => {
                  window.close();
                }, 2000);
              </script>
            </body>
            </html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.send(successHtml);
        } else if (session.returnUrl) {
          // Regular redirect for non-popup flows
          res.redirect(`${session.returnUrl}?success=true&service=twitter`);
        } else {
          // JSON response for API usage
          res.json({
            success: true,
            user: {
              id: user.data.id,
              username: user.data.username,
              name: user.data.name,
            },
          });
        }
      } catch (error) {
        logger.error("Twitter OAuth callback failed:", error);

        // Clean up temporary credentials on error
        try {
          const { oauth_token, agentId, state } = req.query;
          if (oauth_token && agentId) {
            const tempCredentialsKey = `${agentId}:twitter:temp:${oauth_token}`;
            const authService = req.runtime?.getService("auth") as AuthService;
            authService?.deleteTempCredentials(tempCredentialsKey);
          }

          // Update OAuth session status to failed
          if (agentId && state) {
            const authService = req.runtime?.getService("auth") as AuthService;
            await authService?.updateOAuthSession(agentId, "twitter", state, {
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
          }
        } catch (cleanupError) {
          logger.error("Failed to cleanup after OAuth error:", cleanupError);
        }

        res.status(500).json({
          error: "Failed to complete Twitter authentication",
          details: TwitterOAuthUtils.parseTwitterError(error),
        });
      }
    },
  },

  {
    name: "twitter-auth-disconnect",
    path: "/connections/twitter/disconnect",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        // Extract agentId from headers or body
        const agentId = req.headers["x-agent-id"] || req.body.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Revoke credentials
        await authService.revokeCredentials(agentId, "twitter");

        res.json({
          success: true,
          message: "Twitter connection disconnected successfully",
        });
      } catch (error) {
        logger.error("Twitter disconnect failed:", error);
        res.status(500).json({
          error: "Failed to disconnect Twitter",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
];
