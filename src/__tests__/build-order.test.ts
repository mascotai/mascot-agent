import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { getViteOutDir } from "./vite-config-utils";

describe("Build Order Integration Test", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const distDir = path.join(rootDir, "dist");
  let viteBuildDir: string | null = null;
  const tsupBuildMarker = path.join(distDir, "index.js"); // TSup creates this
  const viteConfigPath = path.join(rootDir, "vite.config.ts");
  const hasViteConfig = fs.existsSync(viteConfigPath);

  beforeAll(async () => {
    // Only try to get vite build directory if vite.config.ts exists
    if (hasViteConfig) {
      const viteOutDirRelative = await getViteOutDir(rootDir);
      viteBuildDir = path.join(rootDir, viteOutDirRelative);
    }

    // Clean dist directory before test
    if (fs.existsSync(distDir)) {
      await fs.promises.rm(distDir, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    // Clean up after test
    if (fs.existsSync(distDir)) {
      await fs.promises.rm(distDir, { recursive: true, force: true });
    }
  });

  it("should ensure build process works correctly", async () => {
    // Run the full build process
    await $`cd ${rootDir} && bun run build`;

    // Always check that tsup outputs exist
    expect(fs.existsSync(tsupBuildMarker)).toBe(true);

    // Verify tsup produced its expected outputs
    const distFiles = fs.readdirSync(distDir);
    expect(distFiles.some((file) => file === "index.js")).toBe(true);

    // Only check vite outputs if vite config exists
    if (hasViteConfig && viteBuildDir) {
      // Check that both vite and tsup outputs exist
      expect(fs.existsSync(viteBuildDir)).toBe(true);

      // Check vite built frontend files
      const frontendFiles = fs.readdirSync(viteBuildDir);
      expect(frontendFiles.length).toBeGreaterThan(0);

      // Should have HTML entry point
      expect(frontendFiles.some((file) => file.endsWith(".html"))).toBe(true);

      // Should have assets directory (CSS/JS files are in assets/)
      expect(frontendFiles.includes("assets")).toBe(true);

      // Should still have vite build directory
      const viteBuildDirName = path.basename(viteBuildDir);
      expect(distFiles.includes(viteBuildDirName)).toBe(true);
    }
  }, 30000); // 30 second timeout for build process
});
