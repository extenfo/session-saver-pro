import { cpSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

function ensureCleanDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function copyIntoDist(distDir, path) {
  const dest = join(distDir, path);
  cpSync(path, dest, { recursive: true });
}

function ensureIcons() {
  try {
    const entries = existsSync("icons") ? readdirSync("icons") : [];
    if (entries.length > 0) return;
  } catch {
    // ignore
  }

  execFileSync(process.execPath, ["./scripts/gen-icons.mjs"], { stdio: "inherit" });
}

function assertIconsPresent() {
  const required = [
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
  ];

  const missing = required.filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(`Missing required icons: ${missing.join(", ")}`);
  }
}

const distDir = "dist";
ensureCleanDir(distDir);

ensureIcons();
assertIconsPresent();

copyIntoDist(distDir, "manifest.json");
copyIntoDist(distDir, "icons");
copyIntoDist(distDir, "src");
copyIntoDist(distDir, "site");

console.log("Prepared dist/ folder for packaging.");
