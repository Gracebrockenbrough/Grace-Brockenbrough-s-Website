import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import Today from "@/app/page";
import Account from "@/app/settings/account/page";
import History from "@/app/settings/history/page";
import Saved from "@/app/saved/page";
import Dev from "@/app/dev/page";
import Kit from "@/app/returns/kit/page";
import Add from "@/app/add/page";
import Ask from "@/app/ask/page";
import Attention from "@/app/attention/page";
import Calendar from "@/app/calendar/page";
import Claim from "@/app/gift/claim/page";
import Insights from "@/app/insights/page";
import Returns from "@/app/returns/page";
import Purchase from "@/app/returns/purchase/page";
import Refund from "@/app/returns/refund/page";
import Start from "@/app/returns/start/page";
import Settings from "@/app/settings/page";
import Wallet from "@/app/wallet/page";
import AddCard from "@/app/wallet/add/page";
import Card from "@/app/wallet/card/page";
import Gift from "@/app/wallet/gift/page";
import { usePathname } from "./shims/navigation";

const routes: Record<string, ComponentType> = {
  "/": Today,
  "/dev/": Dev,
  "/saved/": Saved,
  "/settings/account/": Account,
  "/settings/history/": History,
  "/returns/kit/": Kit,
  "/returns/label/": Kit,
  "/add/": Add,
  "/ask/": Ask,
  "/attention/": Attention,
  "/calendar/": Calendar,
  "/gift/claim/": Claim,
  "/insights/": Insights,
  "/returns/": Returns,
  "/returns/purchase/": Purchase,
  "/returns/refund/": Refund,
  "/returns/start/": Start,
  "/settings/": Settings,
  "/wallet/": Wallet,
  "/wallet/add/": AddCard,
  "/wallet/card/": Card,
  "/wallet/gift/": Gift,
};

function App() {
  const path = usePathname();
  const Page = routes[path] ?? Today;
  return <Page key={path} />;
}

createRoot(document.getElementById("root")!).render(<App />);
