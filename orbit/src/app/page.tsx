"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrbit } from "@/store/OrbitProvider";
import { OrbitMark } from "@/components/shell/Logo";

export default function Home() {
  const { state, hydrated } = useOrbit();
  const router = useRouter();
  useEffect(() => {
    if (hydrated) router.replace(state.onboarded ? "/today" : "/onboarding");
  }, [hydrated, state.onboarded, router]);
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true">
      <OrbitMark size={36} spinning />
      <span className="sr-only">Loading ORBIT</span>
    </div>
  );
}
