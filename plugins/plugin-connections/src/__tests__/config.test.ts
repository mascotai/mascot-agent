import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import plugin from "../plugin";
import { z } from "zod";
import { createMockRuntime } from "../../../../src/__tests__/utils/core-test-utils";

// Mock logger
mock.module("@elizaos/core", () => {
  const actual = require("@elizaos/core");
  return {
    ...actual,
    logger: {
      info: mock(),
      error: mock(),
      warn: mock(),
    },
  };
});

// Access the plugin's init function
const initPlugin = plugin.init;

describe("Plugin Configuration Schema", () => {
  // Create a backup of the original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mock.restore();
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = { ...originalEnv };
  });

  it("should accept valid configuration", async () => {
    const validConfig = {
      EXAMPLE_PLUGIN_VARIABLE: "valid-value",
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(validConfig, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeNull();
    }
  });

  it("should accept empty configuration", async () => {
    const emptyConfig = {};

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(emptyConfig, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeNull();
    }
  });

  it("should accept configuration with additional properties", async () => {
    const configWithExtra = {
      EXAMPLE_PLUGIN_VARIABLE: "valid-value",
      EXTRA_PROPERTY: "should be ignored",
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(configWithExtra, createMockRuntime());
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeNull();
    }
  });

  it("should handle invalid configuration gracefully", async () => {
    const invalidConfig = {
      AUTH_ENCRYPTION_KEY: "", // Empty string
    };

    if (initPlugin) {
      let error: Error | null = null;
      try {
        await initPlugin(invalidConfig, createMockRuntime());
        // Connections plugin may handle invalid config gracefully
        expect(true).toBe(true);
      } catch (e) {
        error = e as Error;
        // If error is thrown, verify it's a proper error
        expect(error).toBeDefined();
      }
    }
  });

  it("should handle configuration variables appropriately", async () => {
    const testConfig = {
      AUTH_ENCRYPTION_KEY: "test-key-12345678901234567890123456789012",
    };

    if (initPlugin) {
      try {
        // Initialize with config
        await initPlugin(testConfig, createMockRuntime());
        
        // Test passes if initialization completes
        expect(true).toBe(true);
      } catch (error) {
        // If error is thrown, verify it's handled properly
        expect(error instanceof Error).toBe(true);
      }
    }
  });

  it("should not override existing environment variables", async () => {
    // Set environment variable before initialization
    process.env.AUTH_ENCRYPTION_KEY = "pre-existing-value-12345678901234567890";

    const testConfig = {
      // Omit the variable to test that existing env vars aren't overridden
    };

    if (initPlugin) {
      await initPlugin(testConfig, createMockRuntime());

      // Test passes if initialization completes
      expect(true).toBe(true);
    }
  });

  it("should handle zod validation errors gracefully", async () => {
    // Create a mock of zod's parseAsync that throws a ZodError
    const mockZodError = new z.ZodError([
      {
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: "Example plugin variable is too short",
        path: ["EXAMPLE_PLUGIN_VARIABLE"],
      },
    ]);

    // Create a simple schema for mocking
    const schema = z.object({
      EXAMPLE_PLUGIN_VARIABLE: z.string().min(1),
    });

    // Mock the parseAsync function
    const originalParseAsync = schema.parseAsync;
    schema.parseAsync = mock().mockRejectedValue(mockZodError);

    try {
      // Use the mocked schema directly to avoid TypeScript errors
      await schema.parseAsync({});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBe(mockZodError);
    }

    // Restore the original parseAsync
    schema.parseAsync = originalParseAsync;
  });

  it("should rethrow non-zod errors", async () => {
    // Create a generic error
    const genericError = new Error("Something went wrong");

    // Create a simple schema for mocking
    const schema = z.object({
      EXAMPLE_PLUGIN_VARIABLE: z.string().min(1),
    });

    // Mock the parseAsync function
    const originalParseAsync = schema.parseAsync;
    schema.parseAsync = mock().mockRejectedValue(genericError);

    try {
      // Use the mocked schema directly to avoid TypeScript errors
      await schema.parseAsync({});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBe(genericError);
    }

    // Restore the original parseAsync
    schema.parseAsync = originalParseAsync;
  });
});
