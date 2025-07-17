import { logger, type UUID } from "@elizaos/core";
import type { AuthService } from "../services/auth.service.js";
import type { ServiceName } from "../types/auth.types.js";
import { TwitterApi } from "twitter-api-v2";

/**
 * Connection management routes
 */
export const connectionsRoutes = [
  {
    name: "connections-list",
    path: "/connections",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        // Extract agentId from headers or query
        const agentId = req.headers["x-agent-id"] || req.query.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Get status for all supported services
        const supportedServices: ServiceName[] = ["twitter"];

        const getServiceMetadata = (service: ServiceName) => {
          const metadata = {
            twitter: {
              displayName: "Twitter/X",
              icon: "twitter",
              color: "#1DA1F2",
              description:
                "Connect to post tweets and interact with your audience",
            },
            discord: {
              displayName: "Discord",
              icon: "discord",
              color: "#5865F2",
              description: "Connect to Discord servers and channels",
            },
            telegram: {
              displayName: "Telegram",
              icon: "telegram",
              color: "#0088cc",
              description: "Connect to Telegram chats and channels",
            },
          };
          return (
            metadata[service] || {
              displayName: service,
              icon: service,
              color: "#6B7280",
              description: `Connect to ${service}`,
            }
          );
        };

        const connections = await Promise.all(
          supportedServices.map(async (service) => {
            const status = await authService.getConnectionStatus(
              agentId,
              service,
            );
            const serviceMetadata = getServiceMetadata(service);
            return {
              service,
              ...status,
              ...serviceMetadata,
            };
          }),
        );

        res.json({
          agentId,
          connections,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Connections list failed:", error);
        res.status(500).json({
          error: "Failed to fetch connections",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "connection-status",
    path: "/connections/:service/status",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        const { service } = req.params;
        const agentId = req.headers["x-agent-id"] || req.query.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        if (!["twitter", "discord", "telegram"].includes(service)) {
          return res.status(400).json({ error: "Unsupported service" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Get connection status
        const status = await authService.getConnectionStatus(
          agentId,
          service as ServiceName,
        );

        res.json(status);
      } catch (error) {
        logger.error(
          `Connection status check failed for ${req.params.service}:`,
          error,
        );
        res.status(500).json({
          error: `Failed to check ${req.params.service} status`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "connection-disconnect",
    path: "/connections/:service/disconnect",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        const { service } = req.params;
        const agentId = req.headers["x-agent-id"] || req.body.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        if (!["twitter", "discord", "telegram"].includes(service)) {
          return res.status(400).json({ error: "Unsupported service" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Revoke credentials
        await authService.revokeCredentials(agentId, service as ServiceName);

        res.json({
          success: true,
          service,
          message: `${service} connection disconnected successfully`,
        });
      } catch (error) {
        logger.error(
          `Connection disconnect failed for ${req.params.service}:`,
          error,
        );
        res.status(500).json({
          error: `Failed to disconnect ${req.params.service}`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "connection-test",
    path: "/connections/:service/test",
    type: "POST" as const,
    handler: async (req: any, res: any) => {
      try {
        const { service } = req.params;
        const agentId = req.headers["x-agent-id"] || req.body.agentId;

        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        if (!["twitter", "discord", "telegram"].includes(service)) {
          return res.status(400).json({ error: "Unsupported service" });
        }

        // Get auth service from runtime
        const authService = req.runtime?.getService("auth") as AuthService;
        if (!authService) {
          return res.status(500).json({ error: "Auth service not available" });
        }

        // Get credentials
        const credentials = await authService.getCredentials(
          agentId,
          service as ServiceName,
        );

        if (!credentials) {
          return res.status(404).json({
            error: `No credentials found for ${service}`,
          });
        }

        // Test connection based on service
        let testResult;

        switch (service) {
          case "twitter":
            testResult = await testTwitterConnection(credentials);
            break;
          default:
            return res.status(400).json({
              error: `Connection testing not implemented for ${service}`,
            });
        }

        res.json({
          success: true,
          service,
          test: testResult,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          `Connection test failed for ${req.params.service}:`,
          error,
        );
        res.status(500).json({
          error: `Failed to test ${req.params.service} connection`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
];

/**
 * Test Twitter connection
 */
async function testTwitterConnection(credentials: any): Promise<any> {
  try {
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecretKey,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessTokenSecret,
    });

    // Test with a simple API call
    const user = await client.v2.me();

    return {
      success: true,
      user: {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
      },
      rateLimit: {
        remaining: (user as any).rateLimit?.remaining,
        reset: (user as any).rateLimit?.reset,
      },
    };
  } catch (error) {
    logger.error("Twitter connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
