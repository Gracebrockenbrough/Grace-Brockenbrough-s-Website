import Link from "next/link";
import { OrbitMark } from "@/components/shell/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <OrbitMark size={40} />
      <h1 className="mt-5 text-[26px] font-semibold">This page drifted out of orbit.</h1>
      <p className="mt-2 text-[16px] text-ink-2">Everything you care about is still on Today.</p>
      <Link href="/today" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 font-medium text-white hover:bg-accent-strong">
        Go to Today
      </Link>
    </div>
  );
}
