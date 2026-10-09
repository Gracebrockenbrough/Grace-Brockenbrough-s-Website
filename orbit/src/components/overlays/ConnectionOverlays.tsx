"use client";

import { useState } from "react";
import { Check, Lock, Pause, Play } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badges";
import { ConnectFlow } from "@/components/connections/ConnectFlow";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

export function ConnectModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useOrbit();
  const source = state.sources.find((s) => s.id === id);
  if (!source) return null;
  return (
    <Modal title={`Connect ${source.name}`} hideTitle onClose={onClose}>
      <ConnectFlow
        source={source}
        email={state.user.email}
        onConnected={() => dispatch({ type: "SET_SOURCE_STATUS", id: source.id, status: "connected" })}
        onClose={onClose}
      />
    </Modal>
  );
}

/** What a connection does, in plain language, with simple controls. */
export function ConnectionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const [confirming, setConfirming] = useState(false);
  const source = state.sources.find((s) => s.id === id);
  if (!source) return null;

  const status = source.status;
  const set = (next: typeof status, message: string) => {
    dispatch({ type: "SET_SOURCE_STATUS", id: source.id, status: next });
    notify(message, { undoable: true });
  };

  return (
    <Drawer
      title={source.name}
      onClose={onClose}
      eyebrow={
        status === "connected" ? (
          <Pill tone="success"><Check size={13} aria-hidden /> Connected</Pill>
        ) : status === "paused" ? (
          <Pill>Paused</Pill>
        ) : (
          <Pill>Not connected</Pill>
        )
      }
      footer={
        status === "available" ? (
          <Button variant="primary" onClick={() => open({ type: "connect", id: source.id })}>
            Connect
          </Button>
        ) : confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="w-full text-[14.5px] text-ink-2">Disconnect {source.name}? ORBIT will stop using everything it learned from it.</p>
            <Button variant="danger" onClick={() => { set("available", `${source.name} disconnected.`); setConfirming(false); }}>
              Disconnect
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {status === "connected" ? (
              <Button variant="secondary" onClick={() => set("paused", `${source.name} paused. ORBIT stopped reading it for now.`)}>
                <Pause size={16} aria-hidden /> Pause
              </Button>
            ) : (
              <Button variant="primary" onClick={() => set("connected", `${source.name} resumed.`)}>
                <Play size={16} aria-hidden /> Resume
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Disconnect
            </Button>
          </div>
        )
      }
    >
      <div className="flex items-center gap-3">
        <ConnectionIcon source={source} size={44} />
        <p className="text-[15.5px] text-ink-2">{source.blurb}</p>
      </div>

      <p className="mt-6 text-[15px] font-semibold">ORBIT uses {source.name} to notice:</p>
      <ul className="mt-2 space-y-1.5">
        {source.notices.map((n) => (
          <li key={n} className="flex items-center gap-2 text-[15.5px]">
            <Check size={15} className="text-success" aria-hidden /> {n}
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-3 text-[15px] text-ink">
        <Lock size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {source.promise}
      </p>

      {source.ignores && (
        <>
          <p className="mt-6 text-[15px] font-semibold">What ORBIT usually ignores</p>
          <p className="mt-1 text-[15px] text-ink-2">{source.ignores.join(" · ")}</p>
        </>
      )}
    </Drawer>
  );
}
