import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { schema } from "./schema";
import { twitterAuthRoutes } from "./routes/twitter-auth";
import { connectionsRoutes } from "./routes/connections";
import { AuthService } from "./services/auth.service";
import { DatabaseService } from "./services/database.service";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Define the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the frontend distribution directory
// Try multiple possible locations for the frontend files
const possibleFrontendPaths = [
  path.resolve(__dirname, "dist/frontend"),
  path.resolve(__dirname, "../dist/frontend"),
  path.resolve(__dirname, "../../plugins/plugin-connections/dist/frontend"),
  path.resolve(process.cwd(), "plugins/plugin-connections/dist/frontend"),
];

let frontendDist: string | null = null;
for (const possiblePath of possibleFrontendPaths) {
  const indexPath = path.resolve(possiblePath, "index.html");
  if (fs.existsSync(indexPath)) {
    frontendDist = possiblePath;
    break;
  }
}

if (!frontendDist) {
  logger.warn("Frontend distribution directory not found in any of:", possibleFrontendPaths);
  frontendDist = path.resolve(__dirname, "dist/frontend"); // fallback
}

const frontPagePath = path.resolve(frontendDist, "index.html");
const assetsPath = path.resolve(frontendDist, "assets");

console.log("*** Using frontendDist:", frontendDist);
console.log("*** frontPagePath", frontPagePath);
console.log("*** assetsPath", assetsPath);

const plugin: Plugin = {
  name: "connections",
  description:
    "Connection management plugin for Twitter authentication and other services",
  dependencies: ["@elizaos/plugin-sql"],
  // Set higher priority number to ensure SQL plugin initializes first
  priority: 200,
  schema,
  config: {
    AUTH_ENCRYPTION_KEY: process.env.AUTH_ENCRYPTION_KEY,
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET_KEY: process.env.TWITTER_API_SECRET_KEY,
  },
  async init(config: Record<string, string>, runtime: IAgentRuntime) {
    logger.info("*** Initializing Connections plugin ***");
    logger.info("Schema being passed to migrations:", Object.keys(schema));
    try {
      // Initialize database service - it will handle table creation
      logger.info("🔄 Initializing database service...");
      const databaseService = runtime.getService("database") as DatabaseService;
      if (databaseService) {
        await databaseService.initialize();
        logger.info("✅ Database service initialized successfully");
      } else {
        logger.warn(
          "Database service not available - this may cause connection issues",
        );
      }

      // Validate encryption key
      const encryptionKey =
        config.AUTH_ENCRYPTION_KEY || process.env.AUTH_ENCRYPTION_KEY;
      if (!encryptionKey) {
        logger.warn(
          "AUTH_ENCRYPTION_KEY not found - credential encryption will be disabled",
        );
      } else {
        logger.info("✅ Auth encryption key configured");
      }

      // Validate Twitter API credentials
      const twitterApiKey =
        config.TWITTER_API_KEY || process.env.TWITTER_API_KEY;
      const twitterApiSecret =
        config.TWITTER_API_SECRET_KEY || process.env.TWITTER_API_SECRET_KEY;

      if (twitterApiKey && twitterApiSecret) {
        logger.info("✅ Twitter API credentials configured");

        // Check for saved credentials and initialize Twitter service if available
        try {
          logger.info("🔄 Checking for saved Twitter credentials...");

          const authService = runtime.getService("auth") as AuthService;
          if (authService) {
            // Get saved credentials for this agent
            const savedCredentials = await authService.getCredentials(
              runtime.agentId,
              "twitter",
            );

            if (
              savedCredentials &&
              savedCredentials.accessToken &&
              savedCredentials.accessTokenSecret
            ) {
              logger.info(
                "🔑 Found saved Twitter credentials, updating runtime settings...",
              );

              // Log if API keys are different from stored ones
              if (savedCredentials.apiKey !== twitterApiKey) {
                logger.warn(
                  `🔄 API Key changed - Stored: ${savedCredentials.apiKey?.substring(0, 8)}..., Environment: ${twitterApiKey?.substring(0, 8)}...`,
                );
              }
              if (savedCredentials.apiSecretKey !== twitterApiSecret) {
                logger.warn(
                  `🔄 API Secret changed - Stored: ${savedCredentials.apiSecretKey?.substring(0, 8)}..., Environment: ${twitterApiSecret?.substring(0, 8)}...`,
                );
              }

              // Update runtime settings with environment API keys and saved access tokens
              runtime.setSetting("TWITTER_API_KEY", twitterApiKey);
              runtime.setSetting("TWITTER_API_SECRET_KEY", twitterApiSecret);
              runtime.setSetting(
                "TWITTER_ACCESS_TOKEN",
                savedCredentials.accessToken,
              );
              runtime.setSetting(
                "TWITTER_ACCESS_TOKEN_SECRET",
                savedCredentials.accessTokenSecret,
              );

              logger.info(
                `✅ Twitter credentials loaded from database and updated in runtime settings (user: @${savedCredentials.username})`,
              );
            } else {
              logger.info(
                "ℹ️  No saved Twitter credentials found for this agent",
              );
            }
          } else {
            logger.warn("Auth service not available during initialization");
          }
        } catch (error) {
          logger.error("❌ Failed to initialize saved credentials:", error);
          // Don't throw - this shouldn't prevent plugin initialization
        }
      } else {
        logger.info(
          "ℹ️  Twitter API credentials not configured - set TWITTER_API_KEY and TWITTER_API_SECRET_KEY for Twitter authentication",
        );
      }

      logger.info("✅ Connections plugin initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize Connections plugin:", error);
      throw error;
    }
  },
  routes: [
    // Frontend routes
    {
      type: "GET",
      path: "/goals",
      name: "Connections",
      public: true,
      handler: async (_req: any, res: any, runtime: IAgentRuntime) => {
        const goalsHtmlPath = path.resolve(frontendDist, "index.html");
        console.log("*** Checking for HTML file at:", goalsHtmlPath);
        console.log("*** File exists:", fs.existsSync(goalsHtmlPath));
        if (fs.existsSync(goalsHtmlPath)) {
          let htmlContent = fs.readFileSync(goalsHtmlPath, "utf-8");

          // Inject the actual agent ID from the runtime
          const agentId = runtime.agentId;
          const config = {
            agentId: agentId,
            apiBase: `http://localhost:3000`, // This could be configurable
          };

          // Replace the test config with the actual config
          htmlContent = htmlContent.replace(
            /window\.ELIZA_CONFIG = \{[^}]+\};/,
            `window.ELIZA_CONFIG = ${JSON.stringify(config)};`,
          );

          res.setHeader("Content-Type", "text/html");
          res.send(htmlContent);
        } else {
          res.status(404).send("Connections HTML file not found");
        }
      },
    },
    {
      type: "GET",
      path: "/goals/assets/*",
      public: true,
      handler: async (req: any, res: any, _runtime: IAgentRuntime) => {
        const fullPath = req.path;
        const assetRelativePath = fullPath.replace(/^\/api\/goals\/assets\//, "").replace(/^\/goals\/assets\//, "");
        console.log("*** Goals assets - fullPath:", fullPath);
        console.log("*** Goals assets - assetRelativePath:", assetRelativePath);
        if (!assetRelativePath) {
          return res.status(400).send("Invalid asset path");
        }

        const filePath = path.resolve(assetsPath, assetRelativePath);

        console.log("*** Goals assets - filePath:", filePath);
        if (!filePath.startsWith(assetsPath)) {
          return res.status(403).send("Forbidden");
        }

        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          res.status(404).send("Asset not found");
        }
      },
    },
    {
      type: "GET", 
      path: "/assets/*",
      public: true,
      handler: async (req: any, res: any, _runtime: IAgentRuntime) => {
        const fullPath = req.path;
        const assetRelativePath = fullPath.replace(/^\/api\/assets\//, "").replace(/^\/assets\//, "");
        console.log("*** Direct assets - fullPath:", fullPath);
        console.log("*** Direct assets - assetRelativePath:", assetRelativePath);
        if (!assetRelativePath) {
          return res.status(400).send("Invalid asset path");
        }

        const filePath = path.resolve(assetsPath, assetRelativePath);

        console.log("*** Direct assets - filePath:", filePath);
        if (!filePath.startsWith(assetsPath)) {
          return res.status(403).send("Forbidden");
        }

        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          res.status(404).send("Asset not found");
        }
      },
    },
    // Real Twitter Auth API routes
    ...twitterAuthRoutes.map((route) => ({
      ...route,
      handler: async (req: any, res: any, runtime: IAgentRuntime) => {
        req.runtime = runtime;
        return route.handler(req, res);
      },
    })),

    // Connection management routes
    ...connectionsRoutes.map((route) => ({
      ...route,
      handler: async (req: any, res: any, runtime: IAgentRuntime) => {
        req.runtime = runtime;
        return route.handler(req, res);
      },
    })),
  ],
  services: [DatabaseService, AuthService],
};

export default plugin;