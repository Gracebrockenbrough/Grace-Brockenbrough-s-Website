import type {
  ConnectedAccount,
  DateOnly,
  Evidence,
  GiftTransfer,
  NotificationPrefs,
  Order,
  Refund,
  Retailer,
  ReturnPolicy,
  ReturnRequest,
  WalletItem,
} from "../domain/types";

/** Everything Orbit knows for one user. Mirrors the relational schema in supabase/migrations. */
export interface OrbitData {
  retailers: Retailer[];
  policies: ReturnPolicy[];
  orders: Order[];
  returns: ReturnRequest[];
  refunds: Refund[];
  wallet: WalletItem[];
  gifts: GiftTransfer[];
  evidence: Evidence[];
  connections: ConnectedAccount[];
  prefs: NotificationPrefs;
  /** Priority keys the user dismissed. Prevents identical repeat reminders. */
  dismissed: string[];
}

/** Prototype-only switches for previewing states that are otherwise hard to reach. */
export interface PreviewFlags {
  emptyAccount: boolean;
  outage: "none" | "wallet" | "returns";
}

export interface PersistedState {
  version: 1;
  /** Date the seeded demo data was last aligned to. */
  anchor: DateOnly;
  data: OrbitData;
  preview: PreviewFlags;
}

export const EMPTY_PREVIEW: PreviewFlags = { emptyAccount: false, outage: "none" };

/** A copy of `data` with no purchases or credits, for previewing first-run states. */
export function emptied(data: OrbitData): OrbitData {
  return { ...data, orders: [], returns: [], refunds: [], wallet: [], gifts: [], evidence: [], dismissed: [] };
}
