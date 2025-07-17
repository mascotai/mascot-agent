import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as schema from "./schema";
import { twitterAuthRoutes } from "./routes/twitter-auth";
import { connectionsRoutes } from "./routes/connections";
import { AuthService } from "./services/auth.service";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Define the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the frontend distribution directory, assuming it's in 'dist'
// relative to the package root (which is two levels up from src/plugin-todo)
const frontendDist = path.resolve(__dirname, "../dist/frontend");

const frontPagePath = path.resolve(frontendDist, "index.html");
const assetsPath = path.resolve(frontendDist, "assets");
console.log("*** frontPagePath", frontPagePath);
console.log("*** assetsPath", assetsPath);

const plugin: Plugin = {
  name: "twitter-auth",
  description: "Twitter authentication and connection management plugin",
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
    logger.info("*** Initializing Twitter Auth plugin ***");
    logger.info(
      "Schema being passed to migrations:",
      Object.keys(schema),
    );
    try {
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
      } else {
        logger.info(
          "ℹ️  Twitter API credentials not configured - set TWITTER_API_KEY and TWITTER_API_SECRET_KEY for Twitter authentication",
        );
      }

      logger.info("✅ Twitter Auth plugin initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize Twitter Auth plugin:", error);
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
        const assetRelativePath = fullPath.replace(/^\/goals\/assets\//, "");
        console.log("assetRelativePath:", assetRelativePath);
        if (!assetRelativePath) {
          return res.status(400).send("Invalid asset path");
        }

        const filePath = path.resolve(assetsPath, assetRelativePath);

        console.log("filePath:", filePath);
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
  services: [AuthService],
};

export default plugin;
