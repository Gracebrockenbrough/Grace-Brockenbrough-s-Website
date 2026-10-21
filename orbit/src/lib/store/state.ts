import type {
  ConnectedAccount,
  FavoriteStore,
  PublicProfile,
  SocialPost,
  CircleAuthor,
  Collection,
  DateOnly,
  Evidence,
  GiftTransfer,
  NotificationPrefs,
  Order,
  Refund,
  Retailer,
  ReturnPolicy,
  WishItem,
  ReturnRequest,
  WalletItem,
} from "../domain/types";
import type { ItemKind } from "../intelligence/buckets";
import type { AiUsageEntry, ProcessingJob } from "../ingestion/types";

/** Everything Tote knows for one user. Mirrors the relational schema in supabase/migrations. */
export interface OrbitData {
  retailers: Retailer[];
  policies: ReturnPolicy[];
  orders: Order[];
  returns: ReturnRequest[];
  refunds: Refund[];
  wallet: WalletItem[];
  gifts: GiftTransfer[];
  wishlist: WishItem[];
  evidence: Evidence[];
  connections: ConnectedAccount[];
  /** Ingestion audit trail: one entry per processed message. No email bodies. */
  jobs: ProcessingJob[];
  /** Every AI model call and its cost. */
  aiUsage: AiUsageEntry[];
  prefs: NotificationPrefs;
  /** Stores the customer saved, each with its own visibility. */
  favoriteStores?: FavoriteStore[];
  /** Circle: posts (own and clearly labeled demo), people, who you follow, collections. */
  posts?: SocialPost[];
  authors?: CircleAuthor[];
  following?: string[];
  collections?: Collection[];
  /** The optional public side of the profile. */
  publicProfile?: PublicProfile;
  /** Priority keys the user dismissed. Prevents identical repeat reminders. */
  dismissed: string[];
  /** Optional monthly spending goals per bucket. Off unless the customer turns them on. */
  goals?: { enabled: boolean; monthly: Partial<Record<ItemKind, number>> };
}

/** Prototype-only switches for previewing states that are otherwise hard to reach. */
export interface PreviewFlags {
  emptyAccount: boolean;
  outage: "none" | "wallet" | "returns";
  /** Make the next sample-inbox sync fail, to preview the error state. */
  failNextSync?: boolean;
}

export interface PersistedState {
  version: 5;
  /** Date the seeded demo data was last aligned to. */
  anchor: DateOnly;
  data: OrbitData;
  preview: PreviewFlags;
}

export const EMPTY_PREVIEW: PreviewFlags = { emptyAccount: false, outage: "none" };

/** A copy of `data` with no purchases or credits, for previewing first-run states. */
export function emptied(data: OrbitData): OrbitData {
  return { ...data, orders: [], returns: [], refunds: [], wallet: [], gifts: [], wishlist: [], evidence: [], dismissed: [], jobs: [], aiUsage: [] };
}
