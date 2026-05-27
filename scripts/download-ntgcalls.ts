/**
 * Downloads the prebuilt libntgcalls shared library for the current platform
 * from the ntgcalls GitHub releases and extracts it to ./ntgcalls-rust/lib/.
 *
 * Runs automatically as a postinstall hook (bun install).
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

// ── Platform detection ────────────────────────────────────────────────────────

type SupportedPlatform =
  | "linux-x86_64"
  | "linux-arm64"
  | "macos-arm64"
  | "windows-x86_64";

function detectPlatform(): SupportedPlatform {
  const os = process.platform;
  const arch = process.arch;

  if (os === "linux" && arch === "x64") return "linux-x86_64";
  if (os === "linux" && arch === "arm64") return "linux-arm64";
  if (os === "darwin" && arch === "arm64") return "macos-arm64";
  if (os === "win32" && arch === "x64") return "windows-x86_64";

  throw new Error(
    `Unsupported platform: ${os} ${arch}\n` +
      "Supported: linux-x86_64, linux-arm64, macos-arm64, windows-x86_64",
  );
}

function libFilename(platform: SupportedPlatform): string {
  if (platform.startsWith("windows")) return "ntgcalls.dll";
  if (platform.startsWith("macos")) return "libntgcalls.dylib";
  return "libntgcalls.so";
}

// ── GitHub release resolution ─────────────────────────────────────────────────

const REPO = "pytgcalls/ntgcalls";

interface GithubRelease {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

async function fetchLatestRelease(): Promise<GithubRelease> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<GithubRelease>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const platform = detectPlatform();
const libFile = libFilename(platform);
const outDir = join(import.meta.dir, "../ntgcalls-rust/lib");
const outPath = join(outDir, libFile);

// ── Addon build ────────────────────────────────────────────────────────────────

async function buildRustAddon(): Promise<void> {
  console.log("[ntgcalls] Building Rust N-API addon...");
  const manifestPath = join(import.meta.dir, "../ntgcalls-rust/Cargo.toml");
  const proc = Bun.spawn(
    ["cargo", "build", "--release", "--manifest-path", manifestPath],
    { stdout: "inherit", stderr: "inherit" },
  );
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error("Failed to build ntgcalls Rust N-API addon");

  const targetDir = join(import.meta.dir, "../ntgcalls-rust/target/release");
  const nativeLib =
    process.platform === "win32"
      ? "ntgcalls.dll"
      : process.platform === "darwin"
        ? "libntgcalls.dylib"
        : "libntgcalls.so";

  const srcPath = join(targetDir, nativeLib);
  const destPath = join(import.meta.dir, "../ntgcalls-rust/ntgcalls.node");

  console.log(`[ntgcalls] Copying ${srcPath} -> ${destPath}`);
  const copyProc = Bun.spawn(["cp", srcPath, destPath]);
  await copyProc.exited;
  if (copyProc.exitCode !== 0) throw new Error("Failed to copy compiled addon to package root");

  // Also copy to node_modules/ntgcalls-napi/ if it exists (for local file: installation resolution)
  const nodeModulesPath = join(import.meta.dir, "../node_modules/ntgcalls-napi/ntgcalls.node");
  const nodeModulesLibDir = join(import.meta.dir, "../node_modules/ntgcalls-napi/lib");
  if (existsSync(dirname(nodeModulesPath))) {
    console.log("[ntgcalls] Copying compiled addon and libraries to node_modules/ntgcalls-napi/");
    await Bun.spawn(["cp", destPath, nodeModulesPath]).exited;
    await mkdir(nodeModulesLibDir, { recursive: true });
    await Bun.spawn(["cp", join(outDir, libFile), join(nodeModulesLibDir, libFile)]).exited;
  }
  console.log("[ntgcalls] Rust N-API addon built and installed successfully!");
}

if (existsSync(outPath)) {
  console.log(`[ntgcalls] Already downloaded: ${outPath}`);
  await buildRustAddon();
  process.exit(0);
}

console.log(`[ntgcalls] Fetching latest release for ${platform}...`);
const release = await fetchLatestRelease();
const version = release.tag_name;

const assetName = `ntgcalls.${platform}-shared_libs.zip`;
const asset = release.assets.find((a) => a.name === assetName);
if (!asset) {
  throw new Error(
    `No asset found for "${assetName}" in release ${version}.\n` +
      `Available: ${release.assets.map((a) => a.name).join(", ")}`,
  );
}

console.log(`[ntgcalls] Downloading ${version} (${assetName})...`);
const zipRes = await fetch(asset.browser_download_url);
if (!zipRes.ok) throw new Error(`Download failed: ${zipRes.status}`);

const zipBytes = await zipRes.arrayBuffer();
const zipPath = join(outDir, assetName);

await mkdir(outDir, { recursive: true });
await Bun.write(zipPath, zipBytes);

console.log(`[ntgcalls] Extracting ${libFile}...`);
const unzipProc = Bun.spawn(["unzip", "-jo", zipPath, `lib/${libFile}`, "-d", outDir], {
  stdout: "pipe",
  stderr: "pipe",
});
await unzipProc.exited;
if (unzipProc.exitCode !== 0) {
  const err = await new Response(unzipProc.stderr).text();
  throw new Error(`unzip failed: ${err}`);
}

// Clean up zip
if (await Bun.file(zipPath).exists()) {
  const rmProc = Bun.spawn(["rm", zipPath]);
  await rmProc.exited;
}

console.log(`[ntgcalls] Installed: ${outPath}`);
await buildRustAddon();
