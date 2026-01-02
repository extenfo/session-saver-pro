import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

function ensureCleanDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function copyIntoDist(distDir, path) {
  const dest = join(distDir, path);
  cpSync(path, dest, { recursive: true });
}

const distDir = "dist";
ensureCleanDir(distDir);

copyIntoDist(distDir, "manifest.json");
copyIntoDist(distDir, "icons");
copyIntoDist(distDir, "src");
copyIntoDist(distDir, "site");

console.log("Prepared dist/ folder for packaging.");
