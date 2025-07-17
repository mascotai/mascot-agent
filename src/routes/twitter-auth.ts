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
        const callbackUrl = TwitterOAuthUtils.generateCallbackUrl(
          `${req.protocol}://${req.get("host")}`
        );

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

        // Store temporary credentials securely in session
        // In production, this should be stored in Redis or database
        const sessionData = {
          oauth_token_secret: authLink.oauth_token_secret,
          agentId,
        };

        // For now, we'll return the auth URL and let the frontend handle the redirect
        res.json({
          authUrl: authLink.url,
          state,
          oauth_token: authLink.oauth_token,
          sessionData, // This would be stored server-side in production
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
        const { oauth_token, oauth_verifier, state, agentId, oauth_token_secret } = req.query;

        if (!TwitterOAuthUtils.validateCallbackParams({ oauth_token, oauth_verifier, state })) {
          return res.status(400).json({
            error: "Missing required OAuth parameters",
          });
        }

        if (!agentId || !oauth_token_secret) {
          return res.status(400).json({
            error: "Missing session data - Agent ID and token secret required",
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