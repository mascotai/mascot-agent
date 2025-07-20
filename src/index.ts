import {
  logger,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
} from "@elizaos/core";
import connectionsPlugin from "../plugins/plugin-connections/src/index.ts";
import { character } from "./character.ts";

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info("Initializing character");
  logger.info("Name: ", character.name);

  // Log available services for debugging
  const availableServices = Object.keys(runtime.services || {});
  logger.info("Available services at character init:", availableServices);
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [
    connectionsPlugin, // Re-enabled - SQL service is working
  ],
};
const project: Project = {
  agents: [projectAgent],
};

// Export test suites for the test runner
export { testSuites } from "./__tests__/e2e";
export { character } from "./character.ts";

export default project;
