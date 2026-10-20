"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Bottom sheet on mobile, centered dialog on larger screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade fixed inset-0 z-40 bg-navy/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "animate-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-[520px] flex-col rounded-t-[24px] bg-ivory shadow-[var(--shadow-lift)] outline-none",
            "sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:animate-fade",
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5">
            <div>
              <Dialog.Title className="text-[20px] font-semibold tracking-[-0.01em]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[15px] text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-ivory-deep" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-5 pb-4 pt-3">{children}</div>
          {footer && <div className="border-t border-line px-5 pb-safe pt-3 [&>*]:mb-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
