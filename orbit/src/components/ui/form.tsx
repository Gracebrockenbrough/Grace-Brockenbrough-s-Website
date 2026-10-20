"use client";

import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[15px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-[14px] text-muted">{hint}</p>}
    </div>
  );
}

const control =
  "w-full rounded-2xl border border-line bg-card px-4 text-[16px] text-navy placeholder:text-muted/70 outline-none transition-shadow focus:border-navy/40 focus:shadow-[0_0_0_3px_rgb(25_36_59/0.08)]";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-40 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%236C7078%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[right_16px_center] bg-no-repeat pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 py-2">
      <span className="flex-1">
        <span className="block text-[16px] font-medium">{label}</span>
        {description && <span className="block text-[14px] text-muted">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-[30px] w-[50px] shrink-0 rounded-full bg-line transition-colors peer-checked:bg-navy peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy after:absolute after:left-[3px] after:top-[3px] after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

/** Large tappable radio options. */
export function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | null;
  options: { value: T; label: string; detail?: ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors",
              selected ? "border-navy shadow-[0_0_0_1px_var(--color-navy)]" : "border-line hover:border-navy/30",
              o.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={selected} disabled={o.disabled} onChange={() => onChange(o.value)} />
            <span className="flex-1">
              <span className="block text-[16px] font-medium">{o.label}</span>
              {o.detail && <span className="block text-[14px] text-muted">{o.detail}</span>}
            </span>
            <span aria-hidden className={cn("flex size-6 items-center justify-center rounded-full border", selected ? "border-navy bg-navy text-white" : "border-line")}>
              {selected && <Check className="size-4" />}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function CheckRow({ checked, onChange, children, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex min-h-14 cursor-pointer items-center gap-3", disabled && "cursor-not-allowed opacity-50")}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-white transition-colors peer-checked:border-navy peer-checked:bg-navy peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy"
      >
        <Check className="size-4" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
