import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = [
  "af",
  "ar",
  "bg",
  "bn",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "en_GB",
  "es",
  "es_419",
  "et",
  "fa",
  "fi",
  "fil",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "is",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt_BR",
  "pt_PT",
  "ro",
  "ru",
  "sk",
  "sl",
  "sq",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh_CN",
  "zh_TW",
];

if (LOCALES.length !== 52) {
  throw new Error(`Expected 52 locales, got ${LOCALES.length}`);
}

function loadEnMessages() {
  const enPath = join("_locales", "en", "messages.json");
  if (!existsSync(enPath)) {
    throw new Error("Missing _locales/en/messages.json. Create EN locale first.");
  }
  const raw = readFileSync(enPath, "utf8");
  return JSON.parse(raw);
}

const messages = loadEnMessages();

for (const locale of LOCALES) {
  const dir = join("_locales", locale);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "messages.json"), `${JSON.stringify(messages, null, 2)}\n`);
}

console.log(`Generated _locales for ${LOCALES.length} locales.`);
