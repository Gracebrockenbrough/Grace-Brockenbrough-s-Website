// Builds the whole app as one self-contained HTML file (for sharing a clickable preview).
// Usage: node prototype/build.mjs <out.html>
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? path.join(root, "prototype", "orbit.html");

const js = await build({
  entryPoints: [path.join(root, "prototype/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@": path.join(root, "src"),
    "next/link": path.join(root, "prototype/shims/link.tsx"),
    "next/navigation": path.join(root, "prototype/shims/navigation.ts"),
  },
  logLevel: "error",
});

// Fonts come from Google Fonts here instead of the bundled packages.
const source = (await readFile(path.join(root, "src/app/globals.css"), "utf8")).replace(/@import "@fontsource-variable\/[a-z-]+";\n/g, "");
const css = await postcss([tailwind({ base: root, optimize: true })]).process(source, { from: path.join(root, "src/app/globals.css") });

const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>Penny</title>
<meta name="description" content="Penny: returns, refunds and gift cards in one place. Interactive prototype with fictional demo data.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400..800&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..800,0..100,0..1&display=swap">
<style>${css.css}
html, body { background: #e9f1e4; color: #1f3b2d; }
</style>
<div id="root"></div>
<script>${script}</script>
`;
await writeFile(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
