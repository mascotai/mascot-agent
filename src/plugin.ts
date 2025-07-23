// Stub plugin file for legacy tests
// This project uses the plugin-connections plugin instead of this starter plugin

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { Service } from "@elizaos/core";

export class StarterService extends Service {
  static serviceType = "starter";

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  async initialize(): Promise<void> {
    // No-op for stub
  }

  async start(): Promise<void> {
    // No-op for stub
  }

  async stop(): Promise<void> {
    // No-op for stub
  }

  get capabilityDescription(): string {
    return "This is a stub service for legacy tests.";
  }
}

const plugin: Plugin = {
  name: "starter-stub",
  description: "Stub plugin for legacy tests",
  actions: [],
  providers: [],
  services: [StarterService],
  evaluators: [],
};

export default plugin;
