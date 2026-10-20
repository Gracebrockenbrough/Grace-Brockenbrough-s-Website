import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "./navigation";

/** Stand-in for next/link: internal routes change in-page, everything else behaves like a normal link. */
export default function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || !href.startsWith("/")) return;
    e.preventDefault();
    const [route, hash] = href.split("#");
    navigate(route);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 50);
  };
  return <a href={href} onClick={handle} {...rest} />;
}
