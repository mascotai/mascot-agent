import { type Project, type ProjectAgent } from "@elizaos/core";
import { character } from "./character.ts";

export const projectAgent: ProjectAgent = {
  character,
};
const project: Project = {
  agents: [projectAgent],
};

// Export test suites for the test runner
export { testSuites } from "./__tests__/e2e";
export { character } from "./character.ts";

export default project;
