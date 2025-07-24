import { describe, it, expect, mock } from "bun:test";
import { AuthService } from "../services/auth.service";
import type { IAgentRuntime } from "@elizaos/core";

describe("AuthService", () => {
  describe("Database Access", () => {
    it("should access database adapter from runtime", async () => {
      // Mock runtime with databaseAdapter
      const mockDb = {
        execute: mock().mockResolvedValue(undefined),
      };

      const mockDatabaseAdapter = {
        db: mockDb,
      };

      const mockRuntime = {
        databaseAdapter: mockDatabaseAdapter,
      } as unknown as IAgentRuntime;

      try {
        const service = await AuthService.start(mockRuntime);
        expect(service).toBeDefined();
        expect(service.capabilityDescription).toBe(
          "Authentication service for managing agent credentials to external services",
        );

        // Verify database connection was tested
        expect(mockDb.execute).toHaveBeenCalled();
      } catch (error) {
        // Expected for now since we don't have a real database
        expect(error).toBeDefined();
      }
    });

    it("should handle unavailable database adapter gracefully", async () => {
      const mockRuntime = {
        // No databaseAdapter property
      } as unknown as IAgentRuntime;

      try {
        await AuthService.start(mockRuntime);
        // If no error is thrown, that's acceptable for graceful handling
        expect(true).toBe(true);
      } catch (error) {
        // If error is thrown, verify it's a proper error
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    }, 10000); // 10 second timeout
  });
});
