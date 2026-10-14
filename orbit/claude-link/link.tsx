import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "./navigation";

export default function Link({ href, onClick, scroll, prefetch, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean; prefetch?: boolean }) {
  void prefetch;
  return (
    <a
      {...rest}
      href={href}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(href, { scroll });
      }}
    />
  );
}
