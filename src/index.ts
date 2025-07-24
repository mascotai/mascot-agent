import { type Project, type ProjectAgent } from "@elizaos/core";
import { character } from "./character.ts";

// Main MascotAgent with connections plugin loaded directly via ProjectAgent.plugins
export const mascotAgent: ProjectAgent = {
  character,
};

// Multi-agent project setup
const project: Project = {
  agents: [mascotAgent],
};

// Export test suites for the test runner

export { character } from "./character.ts";

export default project;
