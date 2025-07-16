import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';

/**
 * Define the configuration schema for the plugin with the following properties:
 *
 * @param {string} EXAMPLE_PLUGIN_VARIABLE - The name of the plugin (min length of 1, optional)
 * @returns {object} - The configured schema object
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: Example plugin variable is not provided');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Represents an action that responds with a simple hello world message.
 *
 * @typedef {Object} Action
 * @property {string} name - The name of the action
 * @property {string[]} similes - The related similes of the action
 * @property {string} description - Description of the action
 * @property {Function} validate - Validation function for the action
 * @property {Function} handler - The function that handles the action
 * @property {Object[]} examples - Array of examples for the action
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling HELLO_WORLD action');

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      return {
        text: 'Sent hello world greeting',
        values: {
          success: true,
          greeted: true,
        },
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
          timestamp: Date.now(),
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error in HELLO_WORLD action:', error);

      return {
        text: 'Failed to send hello world greeting',
        values: {
          success: false,
          error: 'GREETING_FAILED',
        },
        data: {
          actionName: 'HELLO_WORLD',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting starter service ***');
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping starter service ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping starter service instance ***');
  }
}




import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Define the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the frontend distribution directory, assuming it's in 'dist'
// relative to the package root (which is two levels up from src/plugin-todo)
const frontendDist = path.resolve(__dirname, '../dist/frontend');

const frontPagePath = path.resolve(frontendDist, 'index.html');
const assetsPath = path.resolve(frontendDist, 'assets');
console.log('*** frontPagePath', frontPagePath);
console.log('*** assetsPath', assetsPath);
/**
 * Definition of routes with type, path, and handler for each route.
 * Routes include fetching trending tokens, wallet information, tweets, sentiment analysis, and signals.
 */



const plugin: Plugin = {
  name: 'starter',
  description: 'A starter plugin for Eliza',
  // Set lowest priority so real models take precedence
  priority: -1000,
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing starter plugin ***');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  routes: [

  {
    type: 'GET',
    path: '/goals',
    name: "TEST",
    public: true,

    handler: async (_req: any, res: any, _runtime: IAgentRuntime) => {
      const goalsHtmlPath = path.resolve(frontendDist, 'index.html');
      if (fs.existsSync(goalsHtmlPath)) {
        const htmlContent = fs.readFileSync(goalsHtmlPath, 'utf-8');
        // Set Content-Type header to text/html
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(404).send('Goals HTML file not found');
      }
    },
  },
  // Route to serve JS files from frontendDist/assets
  {
    type: 'GET',
    path: '/assets/*',
    public: true,
    handler: async (req: any, res: any, _runtime: IAgentRuntime) => {
      // Extract the relative path after '/assets/'
      // const assetRelativePath = req.params[0]; // This captures everything after '/assets/'
        const fullPath = req.path; // "/assets/main-BGv8Llvv.css"
      const assetRelativePath = fullPath.replace(/^\/assets\//, '')
      console.log('assetRelativePath:', assetRelativePath);
      if (!assetRelativePath) {
        return res.status(400).send('Invalid asset path');
      }
      // Construct the full path to the asset within the frontendDist/assets directory
      const filePath = path.resolve(assetsPath, assetRelativePath); // Corrected base path

      // Basic security check to prevent path traversal
      if (!filePath.startsWith(assetsPath)) {
        return res.status(403).send('Forbidden');
      }

      // Check if the file exists and serve it
      if (fs.existsSync(filePath)) {
        // Let express handle MIME types based on file extension
        res.sendFile(filePath);
      } else {
        res.status(404).send('Asset not found');
      }
    },
  },



  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('MESSAGE_RECEIVED event received');
        // print the keys
        logger.info(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.info(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.info('WORLD_CONNECTED event received');
        // print the keys
        logger.info(Object.keys(params));
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.info('WORLD_JOINED event received');
        // print the keys
        logger.info(Object.keys(params));
      },
    ],
  },
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider],
};

export default plugin;
