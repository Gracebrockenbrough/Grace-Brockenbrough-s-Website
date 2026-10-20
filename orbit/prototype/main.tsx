import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import Discover from "@/app/page";
import Add from "@/app/add/page";
import Ask from "@/app/ask/page";
import Attention from "@/app/attention/page";
import Calendar from "@/app/calendar/page";
import Claim from "@/app/gift/claim/page";
import Insights from "@/app/insights/page";
import Preferences from "@/app/preferences/page";
import Promo from "@/app/promo/page";
import Purchases from "@/app/returns/page";
import Sales from "@/app/sales/page";
import Label from "@/app/returns/label/page";
import Purchase from "@/app/returns/purchase/page";
import Refund from "@/app/returns/refund/page";
import Start from "@/app/returns/start/page";
import Settings from "@/app/settings/page";
import Wallet from "@/app/wallet/page";
import AddCard from "@/app/wallet/add/page";
import Card from "@/app/wallet/card/page";
import Gift from "@/app/wallet/gift/page";
import Welcome from "@/app/welcome/page";
import Wishlist from "@/app/wishlist/page";
import { usePathname } from "./shims/navigation";

const routes: Record<string, ComponentType> = {
  "/": Discover,
  "/add/": Add,
  "/ask/": Ask,
  "/attention/": Attention,
  "/calendar/": Calendar,
  "/gift/claim/": Claim,
  "/insights/": Insights,
  "/preferences/": Preferences,
  "/promo/": Promo,
  "/returns/": Purchases,
  "/sales/": Sales,
  "/returns/label/": Label,
  "/returns/purchase/": Purchase,
  "/returns/refund/": Refund,
  "/returns/start/": Start,
  "/settings/": Settings,
  "/wallet/": Wallet,
  "/wallet/add/": AddCard,
  "/wallet/card/": Card,
  "/wallet/gift/": Gift,
  "/welcome/": Welcome,
  "/wishlist/": Wishlist,
};

function App() {
  const path = usePathname();
  const Page = routes[path] ?? Discover;
  return <Page key={path} />;
}

createRoot(document.getElementById("root")!).render(<App />);
