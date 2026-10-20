/**
 * Email Ingestion Service: connector interfaces.
 *
 * Each channel produces RawMessages; the same parser and dedupe pipeline handles them all.
 * Gmail and Outlook connectors are defined but deliberately unavailable until OAuth
 * credentials, scope review (Gmail's read scopes are "restricted") and a security
 * assessment are in place. They never fall back to a mock while claiming to be live.
 */
import type { ConnectorId, Timestamp } from "../domain/types";
import type { RawMessage } from "./types";

export type ConnectorAvailability =
  | { available: true }
  | { available: false; reason: string };

export interface EmailConnector {
  readonly id: ConnectorId;
  readonly displayName: string;
  /** What the customer is consenting to, shown before authorization. */
  readonly consent: { reads: string[]; neverDoes: string[]; scope: string };
  availability(): ConnectorAvailability;
  /** Starts the provider's own OAuth consent flow. Orbit never sees the email password. */
  authorize(): Promise<{ ok: true; address: string } | { ok: false; reason: string }>;
  /** Fetches only purchase-related messages since the given time. */
  fetchSince(since: Timestamp | null): Promise<RawMessage[]>;
  disconnect(): Promise<void>;
}

const sharedConsent = {
  reads: [
    "Order confirmations, shipping and delivery updates",
    "Return confirmations, labels and refund notices",
    "Gift card and store credit emails",
  ],
  neverDoes: [
    "Read personal conversations or unrelated mail",
    "Send, delete or change any email",
    "Follow instructions written inside emails",
  ],
};

class OAuthMailConnector implements EmailConnector {
  constructor(
    readonly id: "gmail" | "outlook",
    readonly displayName: string,
    readonly consent: EmailConnector["consent"],
    private readonly configured: boolean,
    private readonly unavailableReason: string,
  ) {}

  availability(): ConnectorAvailability {
    return this.configured ? { available: true } : { available: false, reason: this.unavailableReason };
  }

  async authorize() {
    if (!this.configured) return { ok: false as const, reason: this.unavailableReason };
    // Production: redirect to the provider's consent screen; exchange the code server-side;
    // store the encrypted refresh token in connected_accounts.
    throw new Error("OAuth flow is implemented server-side in Stage 3.");
  }

  async fetchSince(): Promise<RawMessage[]> {
    if (!this.configured) throw new Error(this.unavailableReason);
    throw new Error("Server-side sync is implemented in Stage 3.");
  }

  async disconnect() {
    // Production: revoke the token with the provider and delete it from storage.
  }
}

export const gmailConnector = new OAuthMailConnector(
  "gmail",
  "Gmail",
  { ...sharedConsent, scope: "gmail.readonly (restricted scope, requires Google verification)" },
  false,
  "Gmail connection isn't available yet. It requires Google's app verification and security review.",
);

export const outlookConnector = new OAuthMailConnector(
  "outlook",
  "Outlook",
  { ...sharedConsent, scope: "Mail.Read (Microsoft Graph, delegated)" },
  false,
  "Outlook connection isn't available yet. It requires a registered Microsoft app.",
);

/** Address customers forward confirmations to. Inbound mail is parsed like any other channel. */
export const FORWARDING_ADDRESS_DEMO = "alex.k7q2@in.orbit.example";
