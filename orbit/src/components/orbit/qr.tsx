"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Renders a QR code for a stored return artifact. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#19243B", light: "#FFFFFF" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div role="img" aria-label={label} className="mx-auto aspect-square w-full max-w-[240px] [&_svg]:h-full [&_svg]:w-full">
      {svg ? <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="skeleton h-full w-full" />}
    </div>
  );
}
