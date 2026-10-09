"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useUI } from "@/store/UIProvider";
import { LoopDrawer } from "./LoopDrawer";
import { EventDrawer } from "./EventDrawer";
import { MessageDrawer } from "./MessageDrawer";
import { ChangeModal } from "./ChangeModal";
import { ConflictModal } from "./ConflictModal";
import { AttentionDrawer } from "./AttentionDrawer";
import { CaptureModal } from "@/components/capture/CaptureModal";
import { MorningBrief } from "@/components/today/MorningBrief";

/** One overlay at a time. Opening another replaces the current one. */
export function OverlayHost() {
  const { overlay, close } = useUI();
  const pathname = usePathname();

  // Navigating away closes details.
  useEffect(() => {
    if (overlay && overlay.type !== "brief") close();
  }, [pathname]);

  if (!overlay) return null;
  const key = "id" in overlay ? `${overlay.type}:${overlay.id}` : overlay.type;
  switch (overlay.type) {
    case "loop":
      return <LoopDrawer key={key} id={overlay.id} onClose={close} />;
    case "event":
      return <EventDrawer key={key} id={overlay.id} onClose={close} />;
    case "message":
      return <MessageDrawer key={key} id={overlay.id} onClose={close} />;
    case "change":
      return <ChangeModal key={key} id={overlay.id} onClose={close} />;
    case "conflict":
      return <ConflictModal key={key} id={overlay.id} onClose={close} />;
    case "attention":
      return <AttentionDrawer key={key} id={overlay.id} onClose={close} />;
    case "capture":
      return <CaptureModal key={key} onClose={close} initialMode={overlay.initialMode} />;
    case "brief":
      return <MorningBrief key={key} onClose={close} />;
  }
}
