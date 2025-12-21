#!/usr/bin/env bun

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { arch, platform } from "os";

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: Asset[];
}

const GITHUB_API_URL =
  "https://api.github.com/repos/pytgcalls/ntgcalls/releases/latest";

function getPlatformName(): string | null {
  const p = platform();
  if (p === "linux") return "linux";
  if (p === "darwin") return "macos";
  if (p === "win32") return "windows";
  console.error(`Unsupported platform: ${p}`);
  return null;
}

function getArchName(): string | null {
  const a = arch();
  if (a === "x64") return "x86_64";
  if (a === "arm64") return "arm64";
  console.error(`Unsupported architecture: ${a}`);
  return null;
}

function getLibraryType(): "shared_libs" | "static_libs" {
  const libTypeArg = process.argv.find((arg) => arg.startsWith("--lib-type="));
  if (libTypeArg) {
    const libType = libTypeArg.split("=")[1];
    if (libType === "shared" || libType === "shared_libs") return "shared_libs";
  }
  return "static_libs";
}

async function getLatestRelease(): Promise<Release> {
  const response = await fetch(GITHUB_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ntgcalls-downloader",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch release: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as Release;
}

function findMatchingAsset(
  assets: Asset[],
  platformName: string,
  archName: string,
  libType: string
): Asset | null {
  const expectedFileName = `ntgcalls.${platformName}-${archName}-${libType}.zip`;
  return assets.find((asset) => asset.name === expectedFileName) || null;
}

async function downloadAsset(asset: Asset, outputDir: string): Promise<string> {
  const outputPath = join(outputDir, asset.name);

  console.log(
    `Downloading ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)...`
  );

  const response = await fetch(asset.browser_download_url);
  if (!response.ok) {
    throw new Error(
      `Failed to download: ${response.status} ${response.statusText}`
    );
  }

  await Bun.write(outputPath, await response.arrayBuffer());
  return outputPath;
}

async function unzipAsset(zipPath: string, outputDir: string): Promise<void> {
  const isWindows = platform() === "win32";

  const proc = isWindows
    ? Bun.spawn(
        [
          "powershell",
          "-Command",
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${outputDir}' -Force`,
        ],
        { stdout: "pipe", stderr: "pipe" }
      )
    : Bun.spawn(["unzip", "-o", zipPath, "-d", outputDir], {
        stdout: "pipe",
        stderr: "pipe",
      });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to unzip: ${stderr}`);
  }
}

async function getCurrentVersion(outputDir: string): Promise<string | null> {
  const versionFile = join(outputDir, ".version");
  if (!existsSync(versionFile)) return null;
  try {
    return (await Bun.file(versionFile).text()).trim();
  } catch {
    return null;
  }
}

async function saveVersion(outputDir: string, version: string): Promise<void> {
  const versionFile = join(outputDir, ".version");
  await Bun.write(versionFile, version);
}

async function main() {
  try {
    const platformName = getPlatformName();
    const archName = getArchName();

    if (!platformName || !archName) {
      console.error("No matching binary found for your system");
      process.exit(1);
    }

    const libType = getLibraryType();
    console.log(`Platform: ${platformName}-${archName} (${libType})`);

    const release = await getLatestRelease();
    console.log(`Latest release: ${release.tag_name}`);

    const asset = findMatchingAsset(
      release.assets,
      platformName,
      archName,
      libType
    );

    if (!asset) {
      console.error(
        `No matching binary found for ${platformName}-${archName}-${libType}`
      );
      console.error("\nAvailable assets:");
      release.assets.forEach((a) => console.error(`  - ${a.name}`));
      process.exit(1);
    }

    const outputDir = join(process.cwd(), "libntgcalls");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const currentVersion = await getCurrentVersion(outputDir);
    if (currentVersion === release.tag_name) {
      console.log(`Already up to date (${currentVersion})`);
      return;
    }

    console.log(
      currentVersion
        ? `Updating from ${currentVersion} to ${release.tag_name}`
        : "Installing for the first time"
    );

    const zipPath = await downloadAsset(asset, outputDir);
    await unzipAsset(zipPath, outputDir);
    await saveVersion(outputDir, release.tag_name);

    console.log("Setup completed successfully!");
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
