"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { OrbitMark } from "@/components/layout/logo";
import { BrandPicker, CategoryPicker, DiscountPicker } from "@/components/orbit/prefs-editor";
import { Button } from "@/components/ui/button";
import { Steps } from "@/components/ui/steps";
import { BRAND } from "@/lib/brand";
import { actions, useOrbit } from "@/lib/store/store";

const STEPS = ["Welcome", "Brands", "Categories", "Sales"];

export default function WelcomePage() {
  const o = useOrbit();
  const router = useRouter();
  const [step, setStep] = useState(0);
  if (!o) return <Shell loading nav={false} />;

  const finish = () => {
    actions.setShopping({ onboarded: true });
    router.replace("/");
  };

  return (
    <Shell nav={false}>
      <div className="flex h-16 items-center justify-between">
        <span className="flex items-center gap-2 text-navy">
          <OrbitMark />
          <span className="text-[21px] font-semibold tracking-[-0.03em]">{BRAND.wordmark}</span>
        </span>
        <button type="button" onClick={finish} className="min-h-11 rounded-full px-3 text-[15px] font-semibold text-muted hover:text-navy">
          Skip
        </button>
      </div>
      {step > 0 && (
        <div className="pb-4">
          <Steps steps={STEPS} current={step} />
        </div>
      )}

      {step === 0 && (
        <section className="animate-in pt-10">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">{BRAND.tagline}</h1>
          <ul className="mt-6 space-y-3 text-[17px]">
            <li>Sales from brands you actually like, without the inbox clutter.</li>
            <li>Every purchase, return deadline and refund in one list.</li>
            <li>Gift cards and store credit, ready when you shop.</li>
            <li>A clear picture of what you spend, with no judgment.</li>
          </ul>
          <p className="mt-6 text-[15px] text-muted">Orbit only reads your shopping emails. It never sends, buys or acts for you.</p>
          <Button className="mt-8" onClick={() => setStep(1)}>
            Get Started
          </Button>
        </section>
      )}
      {step === 1 && (
        <section className="animate-in">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Which brands do you love?</h1>
          <p className="mb-4 mt-1 text-[16px] text-muted">Star your favorites. You can change these later.</p>
          <BrandPicker data={o.data} />
          <Button className="mt-6" onClick={() => setStep(2)}>
            Continue
          </Button>
        </section>
      )}
      {step === 2 && (
        <section className="animate-in">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">What do you shop for?</h1>
          <p className="mb-4 mt-1 text-[16px] text-muted">Pick as many as you like.</p>
          <CategoryPicker prefs={o.data.shopping} />
          <Button className="mt-8" onClick={() => setStep(3)}>
            Continue
          </Button>
        </section>
      )}
      {step === 3 && (
        <section className="animate-in">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Which sales are worth your time?</h1>
          <p className="mb-4 mt-1 text-[16px] text-muted">We&apos;ll hide smaller ones.</p>
          <DiscountPicker prefs={o.data.shopping} />
          <Button className="mt-8" onClick={finish}>
            Show My Feed
          </Button>
        </section>
      )}
    </Shell>
  );
}
