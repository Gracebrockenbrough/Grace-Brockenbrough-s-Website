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
  SavedProduct,
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
  saved: SavedProduct[];
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
  /** Make the next sample-inbox sync fail, to preview the error state. */
  failNextSync?: boolean;
}

export interface PersistedState {
  version: 2;
  /** Date the seeded demo data was last aligned to. */
  anchor: DateOnly;
  data: OrbitData;
  preview: PreviewFlags;
}

export const EMPTY_PREVIEW: PreviewFlags = { emptyAccount: false, outage: "none" };

/** A copy of `data` with no purchases or credits, for previewing first-run states. */
export function emptied(data: OrbitData): OrbitData {
  return { ...data, orders: [], returns: [], refunds: [], wallet: [], gifts: [], saved: [], evidence: [], dismissed: [] };
}
