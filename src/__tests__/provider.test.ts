import { describe, expect, it, spyOn, beforeAll, afterAll } from "bun:test";
import { mascotAgent } from "../index";
import { character } from "../character";
import type { IAgentRuntime, Memory, State, Provider } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  documentTestResult,
} from "./utils/core-test-utils";

// Setup environment variables
dotenv.config();

// Set up logging to capture issues
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
  spyOn(logger, "debug");
});

afterAll(() => {
  // No global restore needed in bun:test;
});


describe("Character Provider Configuration", () => {
  it("should have valid character definition", () => {
    expect(character).toBeDefined();
    expect(character.name).toBe("MascotAgent");
    expect(character.plugins).toBeDefined();
    expect(Array.isArray(character.plugins)).toBe(true);
    
    documentTestResult("Character definition", {
      name: character.name,
      pluginsCount: character.plugins.length
    });
  });

  it("should have mascot agent structure", () => {
    expect(mascotAgent).toBeDefined();
    expect(mascotAgent.character).toBeDefined();
    expect(mascotAgent.character.name).toBe("MascotAgent");
    
    documentTestResult("MascotAgent structure", {
      hasCharacter: !!mascotAgent.character,
      characterName: mascotAgent.character.name
    });
  });

  it("should have message examples for context provision", () => {
    expect(character.messageExamples).toBeDefined();
    expect(Array.isArray(character.messageExamples)).toBe(true);
    expect(character.messageExamples.length).toBeGreaterThan(0);
    
    // Check structure of first example
    if (character.messageExamples.length > 0) {
      const firstExample = character.messageExamples[0];
      expect(Array.isArray(firstExample)).toBe(true);
      expect(firstExample.length).toBeGreaterThan(1);
      
      documentTestResult("Message examples structure", {
        exampleCount: character.messageExamples.length,
        firstExampleMessages: firstExample.length
      });
    }
  });

  it("should have topics for content generation", () => {
    expect(character.topics).toBeDefined();
    expect(Array.isArray(character.topics)).toBe(true);
    expect(character.topics.length).toBeGreaterThan(0);
    
    documentTestResult("Character topics", {
      topicCount: character.topics.length,
      sampleTopics: character.topics.slice(0, 3)
    });
  });

  it("should validate mock runtime for provider testing", () => {
    const runtime = createMockRuntime();
    expect(runtime).toBeDefined();
    expect(runtime.character).toBeDefined();
    expect(runtime.character.name).toBe("MascotAgent");
    expect(runtime.getSetting).toBeDefined();
    
    documentTestResult("Mock runtime validation", {
      hasCharacter: !!runtime.character,
      characterName: runtime.character.name,
      hasGetSetting: typeof runtime.getSetting === 'function'
    });
  });

  it("should validate mock message and state creation", () => {
    const mockMessage = createMockMessage("Test provider message");
    const mockState = createMockState();
    
    expect(mockMessage).toBeDefined();
    expect(mockMessage.content.text).toBe("Test provider message");
    expect(mockState).toBeDefined();
    expect(mockState.values).toBeDefined();
    
    documentTestResult("Mock objects validation", {
      messageText: mockMessage.content.text,
      hasStateValues: !!mockState.values
    });
  });
});
