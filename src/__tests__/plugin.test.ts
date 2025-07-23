import {
  describe,
  expect,
  it,
  spyOn,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { mascotAgent } from "../index";
import { character } from "../character";
import { ModelType, logger } from "@elizaos/core";
import dotenv from "dotenv";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  documentTestResult,
} from "./utils/core-test-utils";

// Setup environment variables
dotenv.config();

// Need to spy on logger for documentation
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
  spyOn(logger, "debug");
});

afterAll(() => {
  // No global restore needed in bun:test;
});

describe("MascotAgent Plugin Configuration", () => {
  it("should have valid project structure", () => {
    expect(mascotAgent).toBeDefined();
    expect(mascotAgent.character).toBeDefined();
    expect(mascotAgent.character.name).toBe("MascotAgent");
    
    documentTestResult("Project structure validation", {
      hasAgent: !!mascotAgent,
      hasCharacter: !!mascotAgent.character,
      agentName: mascotAgent.character.name
    });
  });

  it("should have configured plugins", () => {
    expect(character.plugins).toBeDefined();
    expect(Array.isArray(character.plugins)).toBe(true);
    expect(character.plugins.length).toBeGreaterThan(0);
    
    // Check for expected plugins
    expect(character.plugins).toContain("@elizaos/plugin-sql");
    expect(character.plugins).toContain("@elizaos/plugin-openai");
    expect(character.plugins).toContain("plugin-connections");
    
    documentTestResult("Plugin configuration", {
      pluginCount: character.plugins.length,
      plugins: character.plugins
    });
  });

  it("should have proper character settings", () => {
    expect(character.settings).toBeDefined();
    expect(character.settings.model).toBeDefined();
    expect(character.settings.embeddingModel).toBeDefined();
    
    documentTestResult("Character settings", {
      model: character.settings.model,
      embeddingModel: character.settings.embeddingModel,
      hasSettings: !!character.settings
    });
  });

  it("should have comprehensive bio and system prompt", () => {
    expect(character.bio).toBeDefined();
    expect(Array.isArray(character.bio)).toBe(true);
    expect(character.bio.length).toBeGreaterThan(0);
    
    expect(character.system).toBeDefined();
    expect(typeof character.system).toBe("string");
    expect(character.system.length).toBeGreaterThan(0);
    
    documentTestResult("Character personality", {
      bioLines: character.bio.length,
      systemPromptLength: character.system.length,
      hasPersonality: character.bio.length > 0 && character.system.length > 0
    });
  });

  it("should have style configuration", () => {
    expect(character.style).toBeDefined();
    expect(character.style.all).toBeDefined();
    expect(character.style.chat).toBeDefined();
    expect(character.style.post).toBeDefined();
    
    expect(Array.isArray(character.style.all)).toBe(true);
    expect(Array.isArray(character.style.chat)).toBe(true);
    expect(Array.isArray(character.style.post)).toBe(true);
    
    documentTestResult("Style configuration", {
      allStyleCount: character.style.all.length,
      chatStyleCount: character.style.chat.length,
      postStyleCount: character.style.post.length
    });
  });

  it("should validate mock utilities work with character", () => {
    const runtime = createMockRuntime();
    const message = createMockMessage("Test message");
    const state = createMockState();
    
    expect(runtime.character.name).toBe("MascotAgent");
    expect(message.content.text).toBe("Test message");
    expect(state.values).toBeDefined();
    
    documentTestResult("Mock utilities validation", {
      runtimeCharacter: runtime.character.name,
      messageText: message.content.text,
      stateValid: !!state.values
    });
  });
});