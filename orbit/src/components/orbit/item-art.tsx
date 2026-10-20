import type { ItemKind } from "@/lib/intelligence/buckets";

/**
 * Small flat illustrations for each kind of purchase, colored like the thing
 * itself (pink dress, denim jeans, camel coat). Drawn on a 48×48 grid.
 */
export const KIND_COLOR: Record<ItemKind, { fill: string; tint: string; ink: string }> = {
  dresses: { fill: "#E58FAA", tint: "#FBE6EC", ink: "#8E3954" },
  jeans: { fill: "#4F77B3", tint: "#E3EAF5", ink: "#24426F" },
  pants: { fill: "#B8975F", tint: "#F4ECDD", ink: "#6B5530" },
  skirts: { fill: "#E0846A", tint: "#FBE7E0", ink: "#8C3E28" },
  tops: { fill: "#7FA8D1", tint: "#E7F0F9", ink: "#2F5A84" },
  knitwear: { fill: "#9C8BCB", tint: "#EEEAF7", ink: "#4E3F80" },
  outerwear: { fill: "#A6744A", tint: "#F3E8DE", ink: "#5E3B1E" },
  shoes: { fill: "#6E7A90", tint: "#E9ECF1", ink: "#323B4D" },
  bags: { fill: "#C9963B", tint: "#F8EEDB", ink: "#6E4F12" },
  accessories: { fill: "#7E9F78", tint: "#E7EFE5", ink: "#3A5636" },
  beauty: { fill: "#C94F68", tint: "#F8E1E6", ink: "#7A2236" },
  home: { fill: "#D9A441", tint: "#F9EEDA", ink: "#6F4E0F" },
  other: { fill: "#8A93A6", tint: "#ECEEF2", ink: "#3F4759" },
};

const S = { strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Art({ kind }: { kind: ItemKind }) {
  const { fill, ink } = KIND_COLOR[kind];
  const line = { ...S, stroke: ink, strokeWidth: 1.6, fill: "none" };
  switch (kind) {
    case "dresses":
      return (
        <>
          <path d="M19 6v6M29 6v6" {...line} />
          <path d="M18 12h12l-1.5 8 9 20H10.5l9-20z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M19.5 20h9" {...line} />
          <path d="M17 32c4 1.5 10 1.5 14 0" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.4} fill="none" {...S} />
        </>
      );
    case "jeans":
      return (
        <>
          <path d="M14 7h20l2 34h-8l-4-22-4 22h-8z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M14.3 12h19.4M24 12v7" {...line} />
          <path d="M17 13c0 3 2 4 4 4M31 13c0 3-2 4-4 4" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="1.6 1.6" fill="none" {...S} />
        </>
      );
    case "pants":
      return (
        <>
          <path d="M15 7h18l1.5 34h-7L24 18l-3.5 23h-7z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M15.2 11h17.6M20 11v28M28 11v28" stroke={ink} strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
        </>
      );
    case "skirts":
      return (
        <>
          <path d="M17 12h14l7 24c-9 3-19 3-28 0z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M17 12h14v4H17z" fill={ink} fillOpacity={0.25} stroke={ink} strokeWidth={1.4} {...S} />
          <path d="M21 17l-3 18M27 17l3 18M24 17v19" stroke={ink} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
        </>
      );
    case "tops":
      return (
        <>
          <path d="M18 8l-9 6 4 7 4-2v21h14V19l4 2 4-7-9-6c-1 3-3 4.5-6 4.5S19 11 18 8z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
        </>
      );
    case "knitwear":
      return (
        <>
          <path d="M18 8l-10 7 3 20h5V22v18h16V22v13h5l3-20-10-7c-1 3-3 4-6 4s-5-1-6-4z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M11 32h5M32 32h5M16 37h16" stroke={ink} strokeOpacity={0.45} strokeWidth={1.4} fill="none" />
          <path d="M20 18v16M24 18v16M28 18v16" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
        </>
      );
    case "outerwear":
      return (
        <>
          <path d="M18 7l-9 6 2 28h26l2-28-9-6-6 10z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M18 7l3 12 3-2 3 2 3-12M24 17v24" {...line} />
          <circle cx="26.5" cy="25" r="1.1" fill={ink} />
          <circle cx="26.5" cy="31" r="1.1" fill={ink} />
        </>
      );
    case "shoes":
      return (
        <>
          <path d="M7 30c0-6 2-12 4-14h8c1 4 4 6 9 7l11 3c2 .6 3 2 3 4v4H7z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M7 34h35" {...line} />
          <path d="M20 20l2.5 2M23 18.6l2.5 2" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.4} fill="none" {...S} />
        </>
      );
    case "bags":
      return (
        <>
          <path d="M18 17v-3a6 6 0 0 1 12 0v3" {...line} strokeWidth={2} />
          <path d="M11 17h26l-2 22H13z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M11.5 22h25" stroke={ink} strokeOpacity={0.3} strokeWidth={1.2} />
        </>
      );
    case "accessories":
      return (
        <>
          <path d="M10 15c5-4 23-4 28 0l-2 6c-6-3-18-3-24 0z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M14 21l-3 18h7l2-16M34 21l3 18h-7l-2-16" fill={fill} fillOpacity={0.75} {...S} stroke={ink} strokeWidth={1.6} />
        </>
      );
    case "beauty":
      return (
        <>
          <path d="M20 9l8-3v12h-8z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M18.5 18h11v6h-11z" fill="#E9D7A8" {...S} stroke={ink} strokeWidth={1.6} />
          <path d="M17 24h14v16a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z" fill={ink} fillOpacity={0.85} {...S} stroke={ink} strokeWidth={1.6} />
        </>
      );
    case "home":
      return (
        <>
          <path d="M24 6c3 4 3 7 0 9-3-2-3-5 0-9z" fill="#F4C46A" {...S} stroke={ink} strokeWidth={1.4} />
          <path d="M24 15v4" {...line} />
          <path d="M14 19h20v19a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
        </>
      );
    default:
      return (
        <>
          <path d="M18 16v-3a6 6 0 0 1 12 0v3" {...line} strokeWidth={2} />
          <path d="M12 16h24l-1.5 24h-21z" fill={fill} {...S} stroke={ink} strokeWidth={1.6} />
        </>
      );
  }
}

export function ItemArt({ kind, className = "size-12" }: { kind: ItemKind; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <Art kind={kind} />
    </svg>
  );
}
