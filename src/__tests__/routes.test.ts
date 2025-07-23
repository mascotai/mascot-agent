import { describe, expect, it, mock } from "bun:test";
import plugin from "../../plugins/plugin-connections/src/plugin";

describe("Plugin Routes", () => {
  it("should have routes defined", () => {
    expect(plugin.routes).toBeDefined();
    if (plugin.routes) {
      expect(Array.isArray(plugin.routes)).toBe(true);
      expect(plugin.routes.length).toBeGreaterThan(0);
    }
  });

  it("should have authentication routes", () => {
    if (plugin.routes) {
      // Look for Twitter auth routes in our connections plugin
      const authRoutes = plugin.routes.filter(
        (route) => route.path.includes("/auth") || route.path.includes("/connections"),
      );
      expect(authRoutes.length).toBeGreaterThan(0);

      // Check that routes have proper structure
      authRoutes.forEach(route => {
        expect(route.path).toBeDefined();
        expect(["GET", "POST", "PUT", "DELETE"]).toContain(route.type);
        expect(typeof route.handler).toBe("function");
      });
    }
  });

  it("should handle route requests correctly", async () => {
    if (plugin.routes && plugin.routes.length > 0) {
      const firstRoute = plugin.routes[0];

      if (firstRoute && firstRoute.handler) {
        // Create mock request and response objects
        const mockReq = {};
        const mockRes = {
          json: mock(),
          status: mock(() => mockRes),
          send: mock(),
        };

        // Mock runtime object as third parameter
        const mockRuntime = {} as any;

        // Call the route handler
        await helloWorldRoute.handler(mockReq, mockRes, mockRuntime);

        // Verify response
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Hello World!",
        });
      }
    }
  });

  it("should validate route structure", () => {
    if (plugin.routes) {
      // Validate each route
      plugin.routes.forEach((route) => {
        expect(route).toHaveProperty("path");
        expect(route).toHaveProperty("type");
        expect(route).toHaveProperty("handler");

        // Path should be a string starting with /
        expect(typeof route.path).toBe("string");
        expect(route.path.startsWith("/")).toBe(true);

        // Type should be a valid HTTP method
        expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(route.type);

        // Handler should be a function
        expect(typeof route.handler).toBe("function");
      });
    }
  });

  it("should have unique route paths", () => {
    if (plugin.routes) {
      const paths = plugin.routes.map((route) => route.path);
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });
});
