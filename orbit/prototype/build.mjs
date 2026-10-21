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

// Inter comes from Google Fonts here instead of the bundled package.
const source = (await readFile(path.join(root, "src/app/globals.css"), "utf8")).replace('@import "@fontsource-variable/inter";', "");
const css = await postcss([tailwind({ base: root, optimize: true })]).process(source, { from: path.join(root, "src/app/globals.css") });

const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>Tote</title>
<meta name="description" content="Tote: returns, refunds and gift cards in one place. Interactive prototype with fictional demo data.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap">
<style>${css.css}
html, body { background: #F8F7F4; color: #19243B; }
</style>
<div id="root"></div>
<script>${script}</script>
`;
await writeFile(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
