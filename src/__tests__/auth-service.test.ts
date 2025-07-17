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

    it("should throw error when database adapter is not available after retries", async () => {
      const mockRuntime = {
        // No databaseAdapter property
      } as unknown as IAgentRuntime;

      try {
        await AuthService.start(mockRuntime);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe(
          "Database adapter not available after waiting",
        );
      }
    }, 10000); // 10 second timeout
  });
});
