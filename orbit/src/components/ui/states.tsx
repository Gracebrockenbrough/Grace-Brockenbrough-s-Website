import type { ReactNode } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** Page-level loading placeholder shaped like the content it replaces. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4 pt-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-64" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-[148px] w-full rounded-[18px]" />
        <Skeleton className="h-[148px] w-full rounded-[18px]" />
        <Skeleton className="h-[110px] w-full rounded-[18px]" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action, className }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-card text-navy shadow-[var(--shadow-card)] [&_svg]:size-6">{icon}</div>
      <h3 className="text-[18px] font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-[300px] text-[15px] text-muted">{children}</p>}
      {action && <div className="mt-5 w-full max-w-[280px]">{action}</div>}
    </div>
  );
}

/** A section that couldn't load. The rest of the app keeps working. */
export function ErrorState({ title, children, onRetry }: { title: string; children?: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[18px] border border-line bg-card px-5 py-6 text-center">
      <CloudOff aria-hidden className="mx-auto mb-3 size-6 text-muted" />
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-[300px] text-[15px] text-muted">{children}</p>}
      {onRetry && (
        <Button variant="secondary" size="md" className="mt-4" onClick={onRetry} icon={<RefreshCw aria-hidden className="size-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
