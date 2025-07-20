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
    path: "/api/auth/twitter/connect",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        const { agentId, returnUrl } = req.body;

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
          return res.status(500).json({
            error:
              "Twitter API credentials not configured. Please set TWITTER_API_KEY and TWITTER_API_SECRET_KEY.",
          });
        }

        // Initialize Twitter API client for OAuth
        const twitterApi = new TwitterApi({
          appKey: consumerKey,
          appSecret: consumerSecret,
        });

        // Generate callback URL
        const callbackUrl = `${req.protocol}://${req.get("host")}/api/auth/twitter/callback`;

        // Get request token
        const authLink = await twitterApi.generateAuthLink(callbackUrl, {
          linkMode: "authorize", // Use 'authorize' for web apps
        });

        // Generate state for security
        const state = generateOAuthState();

        // Store OAuth session
        await authService.createOAuthSession(
          agentId,
          "twitter",
          state,
          returnUrl,
        );

        // Store temporary credentials in session (in production, use Redis or database)
        // For now, we'll include it in the response securely

        res.json({
          authUrl: authLink.url,
          state,
          oauth_token: authLink.oauth_token,
          oauth_token_secret: authLink.oauth_token_secret,
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
    path: "/api/auth/twitter/callback",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        const { oauth_token, oauth_verifier, state } = req.query;

        if (!oauth_token || !oauth_verifier || !state) {
          return res.status(400).json({
            error: "Missing required OAuth parameters",
          });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Find OAuth session (we need to store agentId in session)
        // For now, we'll extract it from the state or require it as a parameter
        const { agentId } = req.query;
        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Validate OAuth session
        const session = authService.validateOAuthSession(state);
        if (!session) {
          return res.status(400).json({
            error: "Invalid or expired OAuth session",
          });
        }

        // Get Twitter API credentials
        const consumerKey = process.env.TWITTER_API_KEY;
        const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

        if (!consumerKey || !consumerSecret) {
          return res.status(500).json({
            error: "Twitter API credentials not configured",
          });
        }

        // We need to retrieve the oauth_token_secret from the session
        // In a real implementation, this would be stored securely
        const { oauth_token_secret } = req.query;
        if (!oauth_token_secret) {
          return res.status(400).json({
            error: "OAuth token secret is required",
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

        // Redirect to success page or return JSON
        if (session.returnUrl) {
          res.redirect(`${session.returnUrl}?success=true&service=twitter`);
        } else {
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
        res.status(500).json({
          error: "Failed to complete Twitter authentication",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "twitter-auth-status",
    path: "/api/auth/twitter/status",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        const { agentId } = req.query;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Get connection status
        const status = await authService.getConnectionStatus(
          agentId,
          "twitter",
        );

        res.json(status);
      } catch (error) {
        logger.error("Twitter status check failed:", error);
        res.status(500).json({
          error: "Failed to check Twitter status",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "twitter-auth-disconnect",
    path: "/api/auth/twitter/disconnect",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        const { agentId } = req.body;

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
