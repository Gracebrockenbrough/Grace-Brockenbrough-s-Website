import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "../ui/cn";
import { OrbitWordmark } from "./logo";

/**
 * Tab header: an editorial card with a section kicker, a serif headline and a small
 * illustrated still life for each tab. Original vector drawings (objects, no people),
 * sized to sit beside the headline without competing with it.
 */
export type TabKey = "today" | "returns" | "wallet" | "circle" | "you";

const KICKER: Record<TabKey, { label: string; bar: string; text: string; wash: string }> = {
  today: { label: "Today", bar: "bg-navy", text: "text-navy", wash: "#E9E6F0" },
  returns: { label: "Returns", bar: "bg-returns", text: "text-returns", wash: "#F6E3DC" },
  wallet: { label: "Wallet", bar: "bg-wallet", text: "text-wallet", wash: "#DDEBDD" },
  circle: { label: "Circle", bar: "bg-circle", text: "text-circle", wash: "#F8E5CC" },
  you: { label: "You", bar: "bg-you", text: "text-you", wash: "#E9E0F5" },
};

const INK = "#1E1B2B";
const L = { fill: "none", stroke: INK, strokeWidth: 1.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const F = (fill: string) => ({ fill, stroke: INK, strokeWidth: 1.1, strokeLinejoin: "round" as const });

/** Leafy sprig, reused as the soft plant in several scenes. */
function Sprig({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0C2-14 4-26 10-38" {...L} />
      {[
        [3, -10, -10, -14],
        [5, -18, 14, -22],
        [7, -26, -6, -32],
        [9, -33, 16, -38],
      ].map(([a, b, c, d], i) => (
        <path key={i} d={`M${a} ${b}q${c / 2} ${(d - b) / 2 - 4} ${c} ${d - b}q${-c / 4} ${4} ${-c} ${-(d - b)}`} fill="#8FA88A" stroke={INK} strokeWidth={0.8} />
      ))}
    </g>
  );
}

function TodayScene() {
  return (
    <>
      {/* Desk */}
      <path d="M20 128h196" {...L} />
      {/* Boxes */}
      <path d="M26 128V102h34v26z" {...F("#E2C9A3")} />
      <path d="M32 102V82h28v20z" {...F("#EAD6B6")} />
      <path d="M38 92h10M30 112h12" {...L} strokeWidth={0.8} />
      {/* Laptop */}
      <path d="M78 128l6-30h46l-4 30z" {...F("#D9D7DE")} />
      <path d="M72 128h62" {...L} strokeWidth={1.6} />
      {/* Mug */}
      <path d="M134 108h16v18a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3z" {...F("#FFFFFF")} />
      <path d="M150 112a5 5 0 0 1 0 10" {...L} />
      <text x="137" y="121" fontSize="5" fontFamily="Georgia, serif" fill={INK}>
        tote
      </text>
      <path d="M139 102q2-4 0-7M144 102q2-4 0-7" {...L} strokeWidth={0.7} opacity={0.6} />
      {/* Calendar */}
      <g transform="rotate(6 182 62)">
        <path d="M162 40h40v42h-40z" {...F("#FFFFFF")} />
        <path d="M162 40h40v9h-40z" {...F("#F1EEF6")} />
        <text x="175" y="47" fontSize="5" fill={INK} fontFamily="ui-sans-serif">OCT</text>
        {[0, 1, 2, 3, 4].map((c) => [0, 1, 2].map((r) => <circle key={`${c}${r}`} cx={168 + c * 7} cy={56 + r * 8} r={0.9} fill={INK} opacity={0.6} />))}
        <circle cx={182} cy={64} r={2.6} fill="#C23A2B" />
      </g>
      {/* Tote bag */}
      <path d="M176 128l4-30h30l4 30z" {...F("#F2EADC")} />
      <path d="M186 98v-8a9 9 0 0 1 18 0v8" {...L} strokeWidth={1.6} />
      <text x="187" y="118" fontSize="7" fontFamily="Georgia, serif" fill={INK}>
        tote
      </text>
      <Sprig x={212} y={98} s={0.9} />
    </>
  );
}

function ReturnsScene() {
  return (
    <>
      <path d="M10 130h206" {...L} />
      {/* Label with barcode */}
      <g transform="rotate(-8 50 124)">
        <path d="M24 116h44v18H24z" {...F("#FFFFFF")} />
        {[0, 2, 3, 5, 7, 8, 10, 12, 13, 15].map((b) => (
          <path key={b} d={`M${46 + b} 120v10`} stroke={INK} strokeWidth={b % 3 ? 0.6 : 1.1} />
        ))}
        <path d="M28 121h12M28 125h10M28 129h14" {...L} strokeWidth={0.6} />
      </g>
      {/* Open box */}
      <path d="M84 96h76v34H84z" {...F("#DDBB8E")} />
      <path d="M84 96l-12-12h76l12 12" {...F("#E8CEA6")} />
      <path d="M160 96l14-14" {...L} />
      <path d="M160 96l16 8-2-22" {...F("#D2AE7F")} />
      <path d="M84 96l-18 10 6-22" {...F("#D2AE7F")} />
      {/* Striped sweater folded inside, tissue */}
      <path d="M92 92l8-16 18-4 22 6 10 14z" {...F("#FFFFFF")} />
      <path d="M100 90q20-14 44-2" {...F("#F7F4EF")} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${108 + i * 7} 84l6 -6`} stroke={INK} strokeWidth={1.6} />
      ))}
      {/* Tape roll */}
      <ellipse cx="190" cy="124" rx="12" ry="6" {...F("#D9B98F")} />
      <ellipse cx="190" cy="124" rx="4.5" ry="2.2" {...F("#FFFFFF")} />
      {/* Vase with red flowers */}
      <path d="M196 112q-6-12 2-22h10q8 10 2 22z" {...F("#EEF1F2")} />
      <path d="M201 92l-6-26M205 92l2-30M207 92l12-22" {...L} strokeWidth={0.8} />
      {[
        [195, 64],
        [207, 60],
        [219, 68],
        [199, 72],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="#C23A2B" stroke={INK} strokeWidth={0.7} />
      ))}
    </>
  );
}

function WalletScene() {
  return (
    <>
      <Sprig x={196} y={130} s={1.2} />
      <Sprig x={60} y={132} s={0.9} flip />
      {/* Green wallet */}
      <path d="M130 70h72a6 6 0 0 1 6 6v54h-84V76a6 6 0 0 1 6-6z" {...F("#2F5D46")} />
      <path d="M134 78h64" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.8} />
      <text x="158" y="112" fontSize="8" fontFamily="Georgia, serif" fill="#E9D9B4">
        tote
      </text>
      {/* Gift card with a red bow */}
      <g transform="rotate(-14 96 70)">
        <path d="M60 46h68a5 5 0 0 1 5 5v36a5 5 0 0 1-5 5H60a5 5 0 0 1-5-5V51a5 5 0 0 1 5-5z" {...F("#FFFFFF")} />
        <path d="M78 52q4 8 0 18M78 61q-10-8-14 0q4 6 14 0q10-8 14 0q-4 6-14 0" fill="none" stroke="#C23A2B" strokeWidth={1.4} />
      </g>
      {/* Store credit card */}
      <g transform="rotate(-8 120 88)">
        <path d="M92 68h66a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H92a5 5 0 0 1-5-5V73a5 5 0 0 1 5-5z" {...F("#2A4A3A")} />
        <text x="100" y="96" fontSize="7.5" fontFamily="Georgia, serif" fontStyle="italic" fill="#F2EADC">
          Store Credit
        </text>
      </g>
      <path d="M12 130h200" {...L} />
    </>
  );
}

function CircleScene() {
  const hang = (x: number) => <path d={`M${x} 36q0-6 4-6t4 6l-4 4-14 8h28l-14-8`} {...L} strokeWidth={0.8} />;
  return (
    <>
      {/* Rack */}
      <path d="M40 30h170M50 30v100M200 30v100M40 130h170" {...L} strokeWidth={1.4} />
      {hang(66)}
      {hang(104)}
      {hang(140)}
      {hang(176)}
      {/* Terracotta dress */}
      <path d="M60 48h20l-2 10 12 50H50l12-50z" {...F("#B64E3A")} />
      {/* Cream sweater */}
      <path d="M94 48h24l10 8-4 10-6-3v38H94V63l-6 3-4-10z" {...F("#F2EADC")} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${100 + i * 6} 70v28`} stroke={INK} strokeWidth={0.4} opacity={0.4} />
      ))}
      {/* Black jacket */}
      <path d="M132 48h24l8 10-2 52h-36l-2-52z" {...F("#26233D")} />
      <path d="M144 48v62M138 50l6 14 6-14" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.7} fill="none" />
      {/* Striped top */}
      <path d="M168 48h24l8 8-4 8-4-2v34h-24V62l-4 2-4-8z" {...F("#FFFFFF")} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M172 ${66 + i * 6}h16`} stroke={INK} strokeWidth={1.2} />
      ))}
      {/* Shopping bags */}
      <path d="M14 130l2-28h22l2 28z" {...F("#FFFFFF")} />
      <path d="M22 102v-4a5 5 0 0 1 10 0v4" {...L} />
      <path d="M30 130l3-22h18l3 22z" {...F("#C23A2B")} />
      <path d="M37 108v-3a4 4 0 0 1 8 0v3" {...L} />
    </>
  );
}

function YouScene() {
  return (
    <>
      <path d="M10 132h206" {...L} />
      {/* Arched mirror with reflection */}
      <path d="M86 132V56a32 32 0 0 1 64 0v76" {...F("#F4F1F7")} />
      <path d="M90 132V57a28 28 0 0 1 56 0v75" {...L} strokeWidth={0.6} />
      <path d="M98 70l30 40M108 64l26 36" stroke="#FFFFFF" strokeWidth={2} opacity={0.9} />
      {/* Lilac sweater on a hanger */}
      <path d="M170 40q0-6 4-6t4 6l-4 4-14 8h28l-14-8" {...L} strokeWidth={0.8} />
      <path d="M160 52h28l12 10-5 12-7-4v42h-30V70l-7 4-5-12z" {...F("#C9B8E6")} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${166 + i * 6} 76v34`} stroke={INK} strokeWidth={0.4} opacity={0.4} />
      ))}
      {/* Vase with lilac flowers */}
      <path d="M38 132q-8-14 2-26h12q10 12 2 26z" {...F("#FFFFFF")} />
      {[
        [36, 88],
        [46, 82],
        [56, 90],
        [42, 96],
        [52, 98],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill="#A991D4" stroke={INK} strokeWidth={0.6} />
      ))}
      <path d="M44 106l-4-12M48 106l0-20M50 106l6-12" {...L} strokeWidth={0.7} />
      {/* Note card */}
      <g transform="rotate(6 76 112)">
        <path d="M62 96h26v34H62z" {...F("#FFFFFF")} />
        <text x="65" y="106" fontSize="5.2" fontFamily="Georgia, serif" fontStyle="italic" fill={INK}>
          Good
        </text>
        <text x="65" y="113" fontSize="5.2" fontFamily="Georgia, serif" fontStyle="italic" fill={INK}>
          style,
        </text>
        <text x="65" y="120" fontSize="5.2" fontFamily="Georgia, serif" fontStyle="italic" fill={INK}>
          good mood
        </text>
        <path d="M80 125l2 2 3-4" stroke="#C23A2B" strokeWidth={0.8} fill="none" />
      </g>
    </>
  );
}

const SCENES: Record<TabKey, () => ReactNode> = { today: TodayScene, returns: ReturnsScene, wallet: WalletScene, circle: CircleScene, you: YouScene };

export function TabBanner({ tab, title, subtitle, right, children }: { tab: TabKey; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  const k = KICKER[tab];
  const Scene = SCENES[tab];
  return (
    <header className="relative -mx-2 mt-3 overflow-hidden rounded-[28px] border border-line/70 bg-[#FBFAF7] px-5 pb-4 pt-3.5 shadow-[var(--shadow-card)]">
      {/* Soft section-colored wash behind the illustration */}
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute right-0 top-0 h-full w-[62%]">
        <path d="M30 0C10 30 18 70 0 100h100V0z" fill={k.wash} opacity={0.7} />
      </svg>
      <svg aria-hidden viewBox="0 0 220 140" preserveAspectRatio="xMaxYMax meet" className="pointer-events-none absolute bottom-0 right-0 h-[72%] w-[48%]">
        <Scene />
      </svg>
      <div className="relative flex items-center justify-between">
        <Link href="/" aria-label="Tote home" className="-ml-1 rounded-lg px-1">
          <OrbitWordmark />
        </Link>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
      <div className="relative mt-3 max-w-[54%]">
        <span aria-hidden className={cn("block h-[3px] w-7 rounded-full", k.bar)} />
        <p className={cn("mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em]", k.text)}>{k.label}</p>
        <h1 className="font-display mt-1 text-[26px] leading-[1.04] text-navy">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13px] leading-snug text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
