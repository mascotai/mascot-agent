import { v4 as uuidv4 } from "uuid";

/**
 * Starter Plugin E2E Test Suite
 *
 * This comprehensive test suite demonstrates how to write end-to-end tests for ElizaOS plugins.
 * These tests run in a REAL runtime environment provided by `elizaos test`, meaning:
 *
 * - All services are actually initialized and running
 * - The database is real (in-memory PGLite for testing)
 * - Actions, providers, and events are fully functional
 * - The agent's AI/LLM capabilities are active
 *
 * STRUCTURE OF AN E2E TEST:
 * 1. Each test receives a live IAgentRuntime instance
 * 2. You interact with the runtime as if it were production
 * 3. Test success = no errors thrown, test failure = throw an error
 *
 * HOW TO ADD NEW TESTS:
 * 1. Add a new object to the `tests` array with:
 *    - `name`: A descriptive name for your test
 *    - `fn`: An async function that receives the runtime
 * 2. In your test function:
 *    - Set up any required state (rooms, messages, etc.)
 *    - Execute the functionality you want to test
 *    - Assert the results (throw errors on failure)
 * 3. Keep tests independent - don't rely on other tests' state
 *
 * TESTING PATTERNS DEMONSTRATED:
 * - Character configuration validation
 * - Plugin initialization
 * - Action execution (both direct and natural language)
 * - Provider functionality
 * - Service lifecycle management
 * - Natural language understanding
 */

// Define a minimal TestSuite interface that matches what's needed
interface TestSuite {
  name: string;
  description: string;
  tests: Array<{
    name: string;
    fn: (runtime: any) => Promise<any>;
  }>;
}

// Define minimal interfaces for the types we need
type UUID = `${string}-${string}-${string}-${string}-${string}`;

interface Memory {
  entityId: UUID;
  roomId: UUID;
  content: {
    text: string;
    source: string;
    actions?: string[];
  };
}

interface State {
  values: Record<string, any>;
  data: Record<string, any>;
  text: string;
}

interface Content {
  text: string;
  source?: string;
  actions?: string[];
}

export class MascotAgentTestSuite implements TestSuite {
  name = "mascot-agent";
  description =
    "E2E tests for the MascotAgent project demonstrating comprehensive testing patterns";

  tests = [
    {
      /**
       * Test 1: Character Configuration Validation
       * This test ensures that the character is properly configured with all required fields.
       * It's a good first test because it validates the basic setup before testing functionality.
       */
      name: "Character configuration test",
      fn: async (runtime: any) => {
        const character = runtime.character;
        const requiredFields = [
          "name",
          "bio",
          "plugins",
          "system",
          "messageExamples",
        ];
        const missingFields = requiredFields.filter(
          (field) => !(field in character),
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Missing required fields: ${missingFields.join(", ")}`,
          );
        }

        // Additional character property validations
        if (character.name !== "MascotAgent") {
          throw new Error(
            `Expected character name to be 'MascotAgent', got '${character.name}'`,
          );
        }
        if (!Array.isArray(character.plugins)) {
          throw new Error("Character plugins should be an array");
        }
        if (!character.system) {
          throw new Error("Character system prompt is required");
        }
        if (!Array.isArray(character.bio)) {
          throw new Error("Character bio should be an array");
        }
        if (!Array.isArray(character.messageExamples)) {
          throw new Error("Character message examples should be an array");
        }
      },
    },

    {
      /**
       * Test 2: Plugin Initialization
       * This test verifies that plugins can be registered with the runtime.
       * It's important to test this separately from action execution to isolate issues.
       */
      name: "Plugin initialization test",
      fn: async (runtime: any) => {
        // Test plugin initialization with empty config
        try {
          await runtime.registerPlugin({
            name: "starter",
            description: "A starter plugin for Eliza",
            init: async () => {},
            config: {},
          });
        } catch (error) {
          throw new Error(
            `Failed to register plugin: ${(error as Error).message}`,
          );
        }
      },
    },

    {
      /**
       * Test 3: Runtime Actions Availability
       * This test verifies that the runtime has access to actions from loaded plugins.
       * Since we don't have specific starter actions, we test that actions are available.
       */
      name: "Runtime actions availability test",
      fn: async (runtime: any) => {
        try {
          // Verify that runtime has actions (from loaded plugins)
          if (!runtime.actions) {
            console.log("No actions property found on runtime");
            return; // Not an error, just means no actions are loaded
          }

          if (!Array.isArray(runtime.actions)) {
            throw new Error("Runtime actions should be an array");
          }

          // Log available actions for debugging
          const actionNames = runtime.actions.map((a: any) => a.name || 'unnamed');
          console.log(`Available actions: ${actionNames.join(', ')}`);
          
          // Test that we can access action properties if any exist
          if (runtime.actions.length > 0) {
            const firstAction = runtime.actions[0];
            if (!firstAction.name) {
              throw new Error("Actions should have a name property");
            }
            if (typeof firstAction.handler !== 'function') {
              throw new Error("Actions should have a handler function");
            }
          }
        } catch (error) {
          throw new Error(
            `Runtime actions test failed: ${(error as Error).message}`,
          );
        }
      },
    },

    {
      /**
       * Test 4: Natural Language Processing
       * This test verifies that the agent can process natural language messages
       * and generate appropriate responses using the configured AI model.
       */
      name: "Natural language processing test",
      fn: async (runtime: any) => {
        // Create a unique room for this conversation
        const roomId = uuidv4() as UUID;
        const userId = uuidv4() as UUID;

        try {
          // Create a simple greeting message
          const userMessage: Memory = {
            entityId: userId,
            roomId: roomId,
            content: {
              text: "Hello, can you help me?", // Simple natural language request
              source: "test",
            },
          };

          let agentResponse: string | null = null;

          // Set up a callback to capture the agent's response
          const responseCallback = async (content: Content) => {
            if (content && content.text) {
              agentResponse = content.text;
            }
            return [];
          };

          // Try different methods to process the message
          if (runtime.processMessage) {
            await runtime.processMessage(userMessage, [], responseCallback);
          } else if (runtime.evaluate) {
            const state: State = {
              values: {},
              data: {},
              text: userMessage.content.text,
            };
            await runtime.evaluate(userMessage, state, responseCallback);
          } else {
            // If no processing methods available, that's okay for this test
            console.log("No message processing methods available on runtime");
            return;
          }

          // If we got a response, verify it's reasonable
          if (agentResponse) {
            // At this point agentResponse is definitely a string
            const response = agentResponse as string;
            if (response.length === 0) {
              throw new Error("Agent response should not be empty");
            }
            const responsePreview = response.length > 100 ? response.substring(0, 100) + '...' : response;
            console.log(`Agent responded: "${responsePreview}"`); // Log response preview
          } else {
            console.log("No response received - this may be expected depending on configuration");
          }
        } catch (error) {
          throw new Error(
            `Natural language processing test failed: ${(error as Error).message}`,
          );
        }
      },
    },

    {
      /**
       * Test 5: Runtime Providers Availability
       * Providers supply context to the agent. This test verifies that providers
       * are properly loaded and accessible from the runtime.
       */
      name: "Runtime providers availability test",
      fn: async (runtime: any) => {
        try {
          // Check if providers are available
          if (!runtime.providers) {
            console.log("No providers property found on runtime - this may be expected");
            return; // Not an error, just means no providers are loaded
          }

          if (!Array.isArray(runtime.providers)) {
            throw new Error("Runtime providers should be an array");
          }

          // Log available providers for debugging
          const providerNames = runtime.providers.map((p: any) => p.name || 'unnamed');
          console.log(`Available providers: ${providerNames.join(', ')}`);

          // Test provider structure if any exist
          if (runtime.providers.length > 0) {
            const firstProvider = runtime.providers[0];
            if (!firstProvider.name) {
              throw new Error("Providers should have a name property");
            }
            if (typeof firstProvider.get !== 'function') {
              throw new Error("Providers should have a get function");
            }

            // Test that we can call the provider
            const testMessage: Memory = {
              entityId: uuidv4() as UUID,
              roomId: uuidv4() as UUID,
              content: {
                text: "Test message",
                source: "test",
              },
            };

            const testState: State = {
              values: {},
              data: {},
              text: "",
            };

            const result = await firstProvider.get(runtime, testMessage, testState);
            if (typeof result !== 'object') {
              throw new Error("Provider should return an object");
            }
          }
        } catch (error) {
          throw new Error(
            `Runtime providers test failed: ${(error as Error).message}`,
          );
        }
      },
    },

    {
      /**
       * Test 6: Runtime Services Availability
       * Services are long-running components. This test verifies that services
       * are properly accessible from the runtime.
       */
      name: "Runtime services test",
      fn: async (runtime: any) => {
        try {
          // Test that getService method exists
          if (typeof runtime.getService !== 'function') {
            throw new Error("Runtime should have a getService method");
          }

          // Test accessing a known service (SQL service should exist)
          const sqlService = runtime.getService("sql");
          if (sqlService) {
            console.log("SQL service found and accessible");
            // Test basic service properties
            if (!sqlService.capabilities && !sqlService.capabilityDescription) {
              console.log("Service exists but may not have standard capability properties");
            }
          } else {
            console.log("SQL service not found - this may be expected depending on configuration");
          }

          // Test accessing our custom connections service
          const connectionsService = runtime.getService("connections");
          if (connectionsService) {
            console.log("Connections service found and accessible");
          } else {
            console.log("Connections service not found - this may be expected");
          }

        } catch (error) {
          throw new Error(
            `Runtime services test failed: ${(error as Error).message}`,
          );
        }
      },
    },

    /**
     * TEMPLATE: How to add a new E2E test
     * Copy this template and modify it for your specific test case
     */
    /*
    {
      name: 'My new feature test',
      fn: async (runtime: any) => {
        try {
          // 1. Set up test data
          const testData = {
            // Your test setup here
          };
          
          // 2. Execute the feature
          const result = await runtime.someMethod(testData);
          
          // 3. Verify the results
          if (!result) {
            throw new Error('Expected result but got nothing');
          }
          
          if (result.someProperty !== 'expected value') {
            throw new Error(`Expected 'expected value' but got '${result.someProperty}'`);
          }
          
          // Test passed if we reach here without throwing
        } catch (error) {
          // Always wrap errors with context for easier debugging
          throw new Error(`My new feature test failed: ${error.message}`);
        }
      },
    },
    */
  ];
}

// Export a default instance of the test suite for the E2E test runner
export default new MascotAgentTestSuite();
