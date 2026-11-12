import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function findCachedChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const cacheRoot = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cacheRoot)) return undefined;
  const dirs = fs
    .readdirSync(cacheRoot)
    .filter((d) => d.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const candidate = path.join(
      cacheRoot,
      dir,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing"
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

const executablePath = findCachedChromium();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4104",
    trace: "off",
    video: {
      mode: "on",
      size: { width: 1280, height: 800 },
    },
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
