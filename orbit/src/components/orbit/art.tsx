import type { ItemKind } from "@/lib/intelligence/buckets";
import { cn } from "../ui/cn";
import { ItemArt } from "./item-art";

/**
 * Fashion-sketch art: loose ink lines on warm paper, grey washes, one red accent.
 * Scenes are drawn, not photographed, so Tote never needs rights to someone else's
 * images, and every scene is deterministic for its seed.
 */
export type Palette = "apricot" | "orchid" | "rose" | "sage" | "ink" | "sky";

const INK = "#1E1B2B";
const RED = "#C23A2B";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Garment positions for 1, 2 or 3 items, in percent of the frame. */
const SPOTS = [
  [{ x: 50, y: 58, s: 56 }],
  [
    { x: 35, y: 60, s: 44 },
    { x: 67, y: 62, s: 40 },
  ],
  [
    { x: 25, y: 62, s: 34 },
    { x: 52, y: 58, s: 38 },
    { x: 78, y: 64, s: 30 },
  ],
];

/** A loosely sketched shopfront: arched doorway, window panes, awning, pavement. */
function Shopfront({ seed, dark }: { seed: number; dark: boolean }) {
  const line = dark ? "#FFFFFF" : INK;
  const flip = seed % 2 === 0;
  const ax = flip ? 58 : 14;
  const wx = flip ? 8 : 70;
  return (
    <g fill="none" stroke={line} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 12h100M0 13.2h100" strokeWidth={0.25} opacity={0.25} />
      {/* Arched doorway, drawn twice slightly off like a pen sketch */}
      <path d={`M${ax} 86V44a14 14 0 0 1 28 0v42`} strokeWidth={0.5} opacity={0.3} />
      <path d={`M${ax + 0.8} 86V44.6a13.4 13.4 0 0 1 26.6 0V86`} strokeWidth={0.3} opacity={0.2} />
      {/* Window with panes and an awning */}
      <rect x={wx} y={24} width={22} height={30} strokeWidth={0.45} opacity={0.25} />
      <path d={`M${wx + 11} 24v30M${wx} 39h22`} strokeWidth={0.3} opacity={0.2} />
      <path d={`M${wx - 2} 22l3-5h20l3 5`} strokeWidth={0.4} opacity={0.25} />
      {/* Hatching in the doorway */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${ax + 4 + i * 4} 84l6-12`} strokeWidth={0.25} opacity={0.15} />
      ))}
      {/* Pavement */}
      <path d="M0 86.5h100" strokeWidth={0.5} opacity={0.35} />
      <path d="M6 91h34M58 93h30" strokeWidth={0.3} opacity={0.2} />
    </g>
  );
}

export function Collage({ seed, kinds, palette = "apricot", className, label, children, scale = 1 }: { seed: string; kinds: ItemKind[]; palette?: Palette; className?: string; label?: string; children?: React.ReactNode; /** Shrinks garments for wide frames like banners. */ scale?: number }) {
  const h = hash(seed);
  const dark = palette === "ink";
  const items = kinds.slice(0, 3);
  const spots = SPOTS[Math.max(0, items.length - 1)];
  return (
    <div role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn("relative overflow-hidden", className)} style={{ background: dark ? "#25212F" : "#FAF8F4" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        {/* A soft grey wash behind the sketch, like watercolor */}
        <ellipse cx={h % 2 ? 62 : 38} cy={64} rx={40} ry={24} fill={dark ? "#3A3546" : "#ECE9E4"} opacity={0.8} />
        <Shopfront seed={h} dark={dark} />
        {/* The one red accent: a small shopping bag by the doorway */}
        <g transform={`translate(${h % 2 ? 86 : 6} 74)`}>
          <path d="M1 3h7l-.6 9H1.6z" fill={RED} opacity={0.9} />
          <path d="M3 3V1.6a1.5 1.5 0 0 1 3 0V3" fill="none" stroke={dark ? "#fff" : INK} strokeWidth={0.35} />
        </g>
      </svg>
      {items.map((k, i) => {
        const s = spots[i];
        return (
          <span key={i} className="absolute aspect-square" style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s * scale}%`, transform: "translate(-50%,-50%)" }}>
            <ItemArt kind={k} className="size-full" />
          </span>
        );
      })}
      {children}
    </div>
  );
}

/** Tote's signature illustration: shopping bags sketched in ink, one of them red. */
export function BagsSketch({ className }: { className?: string }) {
  const bag = (x: number, y: number, w: number, h: number, fill: string, tilt: number, key: string) => (
    <g key={key} transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}>
      <path d={`M${x + w * 0.3} ${y}v-${h * 0.18}a${w * 0.2} ${w * 0.2} 0 0 1 ${w * 0.4} 0v${h * 0.18}`} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
      <path d={`M${x} ${y}h${w}l-${w * 0.04} ${h}h-${w * 0.92}z`} fill={fill} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={`M${x + 1.2} ${y + 0.8}h${w}l-${w * 0.04} ${h}h-${w * 0.92}z`} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.35} />
      <path d={`M${x + w * 0.12} ${y + h * 0.18}v${h * 0.7}`} stroke={fill === "#FFFFFF" ? "#C9C5CF" : "#FFFFFF"} strokeWidth={0.8} opacity={0.5} />
    </g>
  );
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <ellipse cx="60" cy="84" rx="48" ry="3.2" fill={INK} opacity="0.08" />
      <path d="M8 84h104" stroke={INK} strokeWidth="0.5" opacity="0.3" />
      {bag(14, 34, 30, 50, "#2B2833", -6, "a")}
      {bag(38, 26, 36, 58, "#FFFFFF", 2, "b")}
      {bag(68, 38, 30, 46, RED, 7, "c")}
      {bag(90, 52, 20, 32, "#E4E1E6", -4, "d")}
    </svg>
  );
}

/** A real photo the customer added, cropped consistently. */
export function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={cn("object-cover", className)} />;
}
