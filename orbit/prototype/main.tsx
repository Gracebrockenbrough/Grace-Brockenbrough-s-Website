import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import Today from "@/app/page";
import Attention from "@/app/attention/page";
import Returns from "@/app/returns/page";
import Purchase from "@/app/returns/purchase/page";
import Start from "@/app/returns/start/page";
import Label from "@/app/returns/label/page";
import Refund from "@/app/returns/refund/page";
import Wallet from "@/app/wallet/page";
import Card from "@/app/wallet/card/page";
import AddCard from "@/app/wallet/add/page";
import Gift from "@/app/wallet/gift/page";
import Claim from "@/app/gift/claim/page";
import Add from "@/app/add/page";
import Settings from "@/app/settings/page";
import { usePathname } from "./shims/navigation";

const routes: Record<string, ComponentType> = {
  "/": Today,
  "/attention/": Attention,
  "/returns/": Returns,
  "/returns/purchase/": Purchase,
  "/returns/start/": Start,
  "/returns/label/": Label,
  "/returns/refund/": Refund,
  "/wallet/": Wallet,
  "/wallet/card/": Card,
  "/wallet/add/": AddCard,
  "/wallet/gift/": Gift,
  "/gift/claim/": Claim,
  "/add/": Add,
  "/settings/": Settings,
};

function App() {
  const path = usePathname();
  const Page = routes[path] ?? Today;
  return <Page key={path} />;
}

createRoot(document.getElementById("root")!).render(<App />);
