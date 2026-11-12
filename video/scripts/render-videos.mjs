import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

function findCachedChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const cacheRoot = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cacheRoot)) return null;
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
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browserExecutable = findCachedChromium();
  console.log("[render] Bundling Remotion project...");

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    publicDir: path.join(ROOT, "public"),
  });

  const targets = [
    { id: "PayTableMaster", file: "paytable-hackathon-master.mp4" },
    { id: "PayTableLaunch", file: "paytable-x-launch.mp4" },
  ];

  for (const t of targets) {
    const outPath = path.join(OUT_DIR, t.file);
    console.log(`[render] Selecting composition ${t.id}...`);
    const composition = await selectComposition({
      serveUrl,
      id: t.id,
      browserExecutable,
      chromiumOptions: { gl: "swangle" },
      port: 4592,
    });
    console.log(
      `[render] Rendering ${t.id} (${composition.durationInFrames} frames @ ${composition.fps}fps) -> ${t.file}`
    );
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      audioCodec: "aac",
      outputLocation: outPath,
      browserExecutable,
      chromiumOptions: { gl: "swangle" },
      concurrency: 2,
      port: 4592,
    });
    const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
    console.log(`[render] Completed ${t.file} (${sizeMb} MB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
