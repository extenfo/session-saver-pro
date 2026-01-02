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

const distDir = "dist";
ensureCleanDir(distDir);

ensureIcons();

copyIntoDist(distDir, "manifest.json");
copyIntoDist(distDir, "icons");
copyIntoDist(distDir, "src");
copyIntoDist(distDir, "site");

console.log("Prepared dist/ folder for packaging.");
