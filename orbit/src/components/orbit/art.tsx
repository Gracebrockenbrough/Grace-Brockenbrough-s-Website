import type { ItemKind } from "@/lib/intelligence/buckets";
import { cn } from "../ui/cn";
import { ItemArt } from "./item-art";

/**
 * Editorial collage art: a few geometric shapes (arch, disc, tilted tile) in a section
 * palette, with the garments themselves on top. It stands in for photography that Tote
 * doesn't have rights to, and it's deterministic, so the same post always looks the same.
 */
export type Palette = "apricot" | "orchid" | "rose" | "sage" | "ink" | "sky";

const PALETTES: Record<Palette, { bg: string; a: string; b: string; c: string }> = {
  apricot: { bg: "#FFE7C5", a: "#B64E3A", b: "#25213C", c: "#F5BE73" },
  orchid: { bg: "#ECE1FA", a: "#7948AF", b: "#FCE3DC", c: "#25213C" },
  rose: { bg: "#FCE3DC", a: "#E58FAA", b: "#B64E3A", c: "#FFE7C5" },
  sage: { bg: "#DDF0D8", a: "#28794E", b: "#FFE7C5", c: "#25213C" },
  ink: { bg: "#25213C", a: "#B64E3A", b: "#FFE7C5", c: "#7948AF" },
  sky: { bg: "#E3EAF5", a: "#2E5C9E", b: "#FFE7C5", c: "#B64E3A" },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Garment positions for 1, 2 or 3 items, in percent of the frame. */
const SPOTS = [
  [{ x: 50, y: 52, s: 62, r: -4 }],
  [
    { x: 34, y: 50, s: 54, r: -8 },
    { x: 68, y: 56, s: 48, r: 7 },
  ],
  [
    { x: 30, y: 44, s: 46, r: -9 },
    { x: 70, y: 40, s: 40, r: 8 },
    { x: 52, y: 72, s: 38, r: -3 },
  ],
];

export function Collage({ seed, kinds, palette = "apricot", className, label, children, scale = 1 }: { seed: string; kinds: ItemKind[]; palette?: Palette; className?: string; label?: string; children?: React.ReactNode; /** Shrinks garments for wide frames like banners. */ scale?: number }) {
  const p = PALETTES[palette];
  const h = hash(seed);
  const flip = h % 2 === 0;
  const items = kinds.slice(0, 3);
  const spots = SPOTS[Math.max(0, items.length - 1)];
  return (
    <div role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn("relative overflow-hidden", className)} style={{ background: p.bg }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        {/* Arch */}
        <path d={flip ? "M8 104V44a22 22 0 0 1 44 0v60z" : "M48 104V40a22 22 0 0 1 44 0v64z"} fill={p.a} opacity={0.92} />
        {/* Disc */}
        <circle cx={flip ? 82 : 16} cy={14 + (h % 18)} r={14 + (h % 7)} fill={p.c} opacity={0.9} />
        {/* Tilted tile */}
        <rect x={flip ? 60 : 6} y={64} width={30} height={30} rx={8} fill={p.b} opacity={0.9} transform={`rotate(${(h % 30) - 15} ${flip ? 75 : 21} 79)`} />
      </svg>
      {items.map((k, i) => {
        const s = spots[i];
        return (
          <span key={i} className="absolute aspect-square drop-shadow-[0_6px_10px_rgb(37_33_60/0.25)]" style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s * scale}%`, transform: `translate(-50%,-50%) rotate(${s.r}deg)` }}>
            <ItemArt kind={k} className="size-full" />
          </span>
        );
      })}
      {children}
    </div>
  );
}

/** A real photo the customer added, cropped consistently. */
export function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={cn("object-cover", className)} />;
}
