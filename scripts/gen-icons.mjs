import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function ensureIcons() {
  const dir = "icons";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const svgPath = join("site", "icons.svg");
  const hasSvg = existsSync(svgPath);
  if (!hasSvg) {
    throw new Error("Missing required icon source: site/icons.svg");
  }

  const sizes = [16, 32, 48, 128];

  let ResvgCtor = null;
  try {
    const mod = require("@resvg/resvg-js");
    ResvgCtor = mod && mod.Resvg;
  } catch {
    ResvgCtor = null;
  }

  if (ResvgCtor) {
    const svg = readFileSync(svgPath);
    for (const size of sizes) {
      const file = join(dir, `icon${size}.png`);
      const resvg = new ResvgCtor(svg, {
        fitTo: { mode: "width", value: size },
      });
      const pngBuffer = resvg.render().asPng();
      writeFileSync(file, pngBuffer);
    }
    console.log("Generated icons from site/icons.svg into ./icons (icon16.png, icon32.png, icon48.png, icon128.png)");
    return;
  }

  throw new Error("@resvg/resvg-js is required to generate icons from site/icons.svg");
}

ensureIcons();
