import { describe, expect, it } from 'bun:test';
import project, { mascotAgent, character, testSuites } from '../index';

describe('Project Index', () => {
  it('should export the main project', () => {
    expect(project).toBeDefined();
    expect(project).toHaveProperty('agents');
    expect(Array.isArray(project.agents)).toBe(true);
    expect(project.agents.length).toBe(1);
  });

  it('should export the mascotAgent', () => {
    expect(mascotAgent).toBeDefined();
    expect(mascotAgent).toHaveProperty('character');
    expect(mascotAgent.character).toBe(character);
  });

  it('should export the character', () => {
    expect(character).toBeDefined();
    expect(character.name).toBe('MascotAgent');
  });

  it('should export testSuites', () => {
    expect(testSuites).toBeDefined();
    expect(Array.isArray(testSuites)).toBe(true);
    expect(testSuites.length).toBeGreaterThan(0);
  });

  it('should have the mascotAgent in the project agents array', () => {
    expect(project.agents[0]).toBe(mascotAgent);
  });
});