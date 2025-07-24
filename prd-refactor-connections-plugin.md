# PRD: Refactor `plugin-connections`

**Author:** Gemini Agent
**Date:** 2025-07-24

## 1. Problem Statement

The existing `plugin-connections` has a broken and outdated structure. Its test suite is failing due to a combination of incorrect file paths, missing dependencies, and tests written for a generic starter template rather than the plugin's actual functionality. Attempts to patch the tests one by one have proven inefficient and error-prone.

## 2. Goal

To create a new, correctly structured version of the `plugin-connections` that preserves all existing functionality while having a clean, modern file structure and a passing test suite. This will improve maintainability and ensure the plugin adheres to project standards.

## 3. Proposed Solution

We will create a new plugin named `plugin-connections-v2` by merging the logic from the original `plugin-connections` into the clean structure provided by the `worktrees/fresh-plugin-starter` template.

### 3.1. High-Level Plan

1.  **Create New Directory:** A new directory will be created at `plugins/plugin-connections-v2`.
2.  **Establish Clean Structure:** The file and directory structure from `worktrees/fresh-plugin-starter` will be copied into the new directory to serve as a foundational template.
3.  **Merge Existing Logic:** The `src` directory and key configuration files (e.g., `package.json`, `vite.config.ts`) from the original `plugin-connections` will be copied into `plugin-connections-v2`, overwriting the template files.
4.  **Configure and Verify:** The new plugin will be configured (e.g., `package.json` name updated), its dependencies will be installed, and its test suite will be run to ensure a successful migration.

## 4. Requirements

| ID | Requirement | Verification |
|---|---|---|
| 1 | Create a new directory named `plugins/plugin-connections-v2`. | The directory exists at the specified path. |
| 2 | Copy the file structure from `worktrees/fresh-plugin-starter` into the new directory. | The new directory contains the same file and folder layout as the starter template. |
| 3 | Copy the `src` directory from `plugin-connections` to `plugin-connections-v2`. | The `src` directory in the new plugin is identical to the original. |
| 4 | Copy and overwrite configuration files (`package.json`, `vite.config.ts`, `tsup.config.ts`) from the original plugin to the new one. | The configuration files in the new plugin match the original's content. |
| 5 | Update the `name` in `plugins/plugin-connections-v2/package.json` to `plugin-connections-v2`. | The `package.json` reflects the new name. |
| 6 | Install all dependencies for the new plugin. | `bun install` completes successfully inside the new plugin directory. |

## 5. Success Criteria

- The `plugin-connections-v2` directory is created and fully populated.
- All source code and functionality from the original `plugin-connections` are present in the new plugin.
- The test suite for `plugin-connections-v2` runs without any build or test failures.
