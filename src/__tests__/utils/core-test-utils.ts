// Test utilities for our MascotAgent project
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@elizaos/core";

// Create a mock runtime for testing
export function createMockRuntime(): IAgentRuntime {
  return {
    character: {
      name: "MascotAgent",
      system: "You are a helpful AI assistant specialized in community building and social media management.",
      plugins: ["@elizaos/plugin-sql", "@elizaos/plugin-openai", "plugin-connections"],
      settings: {},
    },
    getSetting: (key: string) => null,
    db: {
      get: async (key: string) => null,
      set: async (key: string, value: any) => true,
      delete: async (key: string) => true,
      getKeys: async (pattern: string) => [],
    },
    memory: {
      add: async (memory: any) => {},
      get: async (id: string) => null,
      getByEntityId: async (entityId: string) => [],
      getLatest: async (entityId: string) => null,
      getRecentMessages: async (options: any) => [],
      search: async (query: string) => [],
    },
    getService: (serviceType: string) => null,
  } as unknown as IAgentRuntime;
}

// Create a mock message for testing
export function createMockMessage(text: string = "Hello!"): Memory {
  return {
    id: uuidv4(),
    entityId: uuidv4(),
    roomId: uuidv4(),
    timestamp: Date.now(),
    content: {
      text,
      source: "test",
      actions: [],
    },
    metadata: {
      type: "custom",
      sessionId: uuidv4(),
      conversationId: uuidv4(),
    },
  } as Memory;
}

// Create a mock state for testing
export function createMockState(): State {
  return {
    values: { example: "test value" },
    data: { additionalContext: "some context" },
    text: "Current state context",
  } as State;
}

// Document test results for debugging
export function documentTestResult(
  testName: string,
  result: any,
  error: Error | null = null,
) {
  logger.info(`✓ Testing: ${testName}`);

  if (error) {
    logger.error(`✗ Error: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack: ${error.stack}`);
    }
    return;
  }

  if (result) {
    if (typeof result === "string") {
      if (result.trim() && result.length > 0) {
        const preview =
          result.length > 60 ? `${result.substring(0, 60)}...` : result;
        logger.info(`  → ${preview}`);
      }
    } else if (typeof result === "object") {
      try {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          const preview = keys.slice(0, 3).join(", ");
          const more = keys.length > 3 ? ` +${keys.length - 3} more` : "";
          logger.info(`  → {${preview}${more}}`);
        }
      } catch (e) {
        logger.info(`  → [Complex object]`);
      }
    }
  }
}

// Mock core action tests - simplified for our setup
export function runCoreActionTests(actions: any[]) {
  return {
    formattedNames: actions.map(a => a.name).join(", "),
    formattedActions: actions.length,
    composedExamples: actions.reduce((sum, a) => sum + (a.examples?.length || 0), 0)
  };
}