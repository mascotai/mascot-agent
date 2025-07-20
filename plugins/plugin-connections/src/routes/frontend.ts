import { logger } from "@elizaos/core";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";

/**
 * Frontend routes for serving the connections panel UI
 */
export const frontendRoutes = [
  {
    name: "connections-panel",
    path: "/plugins/connections/connections",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        // Serve the built frontend HTML with agent configuration
        const agentId = req.query.agentId;
        if (!agentId) {
          return res.status(400).json({ error: "Agent ID is required" });
        }

        // Path to the built frontend
        const frontendPath = resolve(process.cwd(), "dist", "plugin-connections", "frontend");
        const indexPath = join(frontendPath, "index.html");

        if (!existsSync(indexPath)) {
          return res.status(404).json({ 
            error: "Frontend not built. Run 'bun run build' first." 
          });
        }

        // Read and inject configuration
        let html = readFileSync(indexPath, "utf-8");
        
        // Inject ELIZA_CONFIG for the frontend
        const config = {
          agentId: agentId,
          apiBase: req.protocol + "://" + req.get("host"),
        };

        const configScript = `
          <script>
            window.ELIZA_CONFIG = ${JSON.stringify(config)};
          </script>
        `;

        // Inject before closing head tag
        html = html.replace("</head>", `${configScript}</head>`);

        res.setHeader("Content-Type", "text/html");
        res.send(html);
      } catch (error) {
        logger.error("Frontend serve error:", error);
        res.status(500).json({
          error: "Failed to serve frontend",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },

  {
    name: "connections-panel-assets",
    path: "/plugins/connections/assets/*",
    type: "GET" as const,
    handler: async (req: any, res: any) => {
      try {
        const assetPath = req.params[0]; // The * captured part
        const frontendPath = resolve(process.cwd(), "dist", "plugin-connections", "frontend");
        const fullPath = join(frontendPath, assetPath);

        // Security check - ensure path is within frontend directory
        if (!fullPath.startsWith(frontendPath)) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (!existsSync(fullPath)) {
          return res.status(404).json({ error: "Asset not found" });
        }

        // Set appropriate content type based on file extension
        const ext = assetPath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          'js': 'application/javascript',
          'css': 'text/css',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'ico': 'image/x-icon',
          'woff': 'font/woff',
          'woff2': 'font/woff2',
          'ttf': 'font/ttf',
          'eot': 'application/vnd.ms-fontobject',
        };

        if (ext && contentTypes[ext]) {
          res.setHeader("Content-Type", contentTypes[ext]);
        }

        // Set cache headers for assets
        res.setHeader("Cache-Control", "public, max-age=31536000");
        
        const content = readFileSync(fullPath);
        res.send(content);
      } catch (error) {
        logger.error("Asset serve error:", error);
        res.status(500).json({
          error: "Failed to serve asset",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
];