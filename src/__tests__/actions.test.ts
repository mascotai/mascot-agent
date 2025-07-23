import { describe, expect, it, spyOn, beforeAll, afterAll } from "bun:test";
import { mascotAgent } from "../index";
import { character } from "../character";
import { logger } from "@elizaos/core";
import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import {
  runCoreActionTests,
  documentTestResult,
  createMockRuntime,
  createMockMessage,
  createMockState,
} from "./utils/core-test-utils";

// Setup environment variables
dotenv.config();

// Spy on logger to capture logs for documentation
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
});

afterAll(() => {
  // No global restore needed in bun:test;
});

describe("Actions", () => {
  // Test the character and project structure
  it("should have valid character definition", () => {
    expect(character).toBeDefined();
    expect(character.name).toBe("MascotAgent");
    expect(character.plugins).toBeDefined();
    expect(Array.isArray(character.plugins)).toBe(true);
    expect(character.plugins.length).toBeGreaterThan(0);
    
    documentTestResult("Character validation", {
      name: character.name,
      pluginCount: character.plugins.length,
      plugins: character.plugins
    });
  });

  it("should have valid mascot agent structure", () => {
    expect(mascotAgent).toBeDefined();
    expect(mascotAgent.character).toBeDefined();
    expect(mascotAgent.character.name).toBe("MascotAgent");
    
    documentTestResult("MascotAgent validation", {
      hasCharacter: !!mascotAgent.character,
      characterName: mascotAgent.character.name
    });
  });

  describe("Character Message Examples", () => {
    it("should have message examples defined", () => {
      expect(character.messageExamples).toBeDefined();
      expect(Array.isArray(character.messageExamples)).toBe(true);
      expect(character.messageExamples.length).toBeGreaterThan(0);
      
      documentTestResult("Message examples", {
        count: character.messageExamples.length,
        hasExamples: character.messageExamples.length > 0
      });
    });

    it("should have properly structured message examples", () => {
      if (character.messageExamples && character.messageExamples.length > 0) {
        const firstExample = character.messageExamples[0];
        expect(Array.isArray(firstExample)).toBe(true);
        expect(firstExample.length).toBeGreaterThan(1);
        
        // Check first message structure
        expect(firstExample[0]).toHaveProperty("name");
        expect(firstExample[0]).toHaveProperty("content");
        expect(firstExample[0].content).toHaveProperty("text");
        
        // Check response message structure
        expect(firstExample[1]).toHaveProperty("name", "MascotAgent");
        expect(firstExample[1]).toHaveProperty("content");
        expect(firstExample[1].content).toHaveProperty("text");
        
        documentTestResult("Message example structure", {
          messageCount: firstExample.length,
          hasProperStructure: true
        });
      }
    });

    it("should validate mock runtime functionality", async () => {
      const runtime = createMockRuntime();
      const mockMessage = createMockMessage("Hello!");
      const mockState = createMockState();

      expect(runtime).toBeDefined();
      expect(runtime.character).toBeDefined();
      expect(runtime.character.name).toBe("MascotAgent");
      expect(mockMessage).toBeDefined();
      expect(mockMessage.content.text).toBe("Hello!");
      expect(mockState).toBeDefined();
      
      documentTestResult("Mock runtime validation", {
        runtimeValid: !!runtime,
        characterName: runtime.character.name,
        messageText: mockMessage.content.text
      });
    });

    it("should have topics for content generation", () => {
      expect(character.topics).toBeDefined();
      expect(Array.isArray(character.topics)).toBe(true);
      expect(character.topics.length).toBeGreaterThan(0);
      
      // Check for expected topics
      expect(character.topics).toContain("community building and management");
      expect(character.topics).toContain("social media engagement strategies");
      
      documentTestResult("Character topics", {
        topicCount: character.topics.length,
        sampleTopics: character.topics.slice(0, 3)
      });
    });
  });
});
