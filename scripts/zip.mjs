import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
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

function readManifest() {
  let raw;
  try {
    raw = readFileSync("manifest.json", "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") {
      throw new Error(
        "manifest.json not found. Ensure manifest.json exists in the project root before running this script."
      );
    }
    const message = err && err.message ? err.message : String(err);
    throw new Error(`Failed to read manifest.json: ${message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    throw new Error(`Failed to parse manifest.json as valid JSON: ${message}`);
  }
}

function assertLocalesPresent(manifest) {
  const defaultLocale = manifest && manifest.default_locale;
  if (!defaultLocale) return;

  if (!existsSync("_locales")) {
    throw new Error("default_locale is set in manifest.json, but _locales/ folder is missing");
  }

  const messagesPath = join("_locales", defaultLocale, "messages.json");
  if (!existsSync(messagesPath)) {
    throw new Error(`default_locale is set to '${defaultLocale}', but missing ${messagesPath}`);
  }
}

const distDir = "dist";
ensureCleanDir(distDir);

const manifest = readManifest();

ensureIcons();
assertIconsPresent();
assertLocalesPresent(manifest);

copyIntoDist(distDir, "manifest.json");
copyIntoDist(distDir, "icons");
if (manifest.default_locale) copyIntoDist(distDir, "_locales");
copyIntoDist(distDir, "src");
copyIntoDist(distDir, "site");

console.log("Prepared dist/ folder for packaging.");
