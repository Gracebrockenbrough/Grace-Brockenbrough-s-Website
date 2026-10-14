// Builds Orbit as one self-contained HTML page for publishing as a Claude link.
// Usage: npm run build:claude-link  →  claude-link/dist/orbit.html
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const D = path.dirname(fileURLToPath(import.meta.url));
const ORBIT = path.resolve(D, "..");

const js = await esbuild.build({
  entryPoints: [path.join(D, "main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  tsconfig: path.join(ORBIT, "tsconfig.json"),
  alias: { "next/link": path.join(D, "link.tsx"), "next/navigation": path.join(D, "navigation.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

process.chdir(ORBIT);
const cssIn = fs.readFileSync(path.join(ORBIT, "src/app/globals.css"), "utf8") + `\n@source "${D}";\n`;
const css = await postcss([tailwind({ base: ORBIT, optimize: { minify: true } })]).process(cssIn, { from: path.join(ORBIT, "src/app/globals.css") });
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const favicon = "data:image/svg+xml," + encodeURIComponent(fs.readFileSync(path.join(ORBIT, "public/favicon.svg"), "utf8"));

const html = `<title>Orbit</title>
<meta name="theme-color" content="#f7f4ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b122b" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap" rel="stylesheet">
<style>${css.css.replace(/<\/style/gi, "<\\/style")}
html,body{background:var(--color-canvas);color:var(--color-ink)}</style>
<div id="orbit-root"></div>
<script>${code}</script>
`;
fs.mkdirSync(path.join(D, "dist"), { recursive: true });
fs.writeFileSync(path.join(D, "dist/orbit.html"), html);
console.log(`claude-link/dist/orbit.html · ${(html.length / 1024).toFixed(0)} KB`);
