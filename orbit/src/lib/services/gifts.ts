/**
 * Gift Service: provider interface for issuing new digital gift cards.
 *
 * Real issuance needs an authorized gift card distribution partner and a payment
 * processor. Until then only the demo provider exists: it charges nothing and issues
 * a fictional card that can only be claimed inside Tote's demo.
 */
import type { GiftTransfer } from "../domain/types";

export interface GiftOrder {
  retailerId: string;
  amount: number;
  senderName: string;
  recipientName: string;
  recipientContact: string;
  message: string | null;
}

export interface GiftProvider {
  readonly id: string;
  readonly live: boolean;
  /** Allowed denominations per retailer, from the partner's catalog. */
  amounts(retailerId: string): number[];
  purchase(order: GiftOrder, approvedAt: string): Promise<GiftTransfer>;
}

export const demoGiftProvider: GiftProvider = {
  id: "demo",
  live: false,
  amounts: () => [25, 50, 100, 150],
  async purchase(order, approvedAt) {
    return {
      id: `g-${Math.random().toString(36).slice(2, 10)}`,
      ...order,
      currency: "USD",
      status: "demo_created",
      createdAt: approvedAt,
      claimedAt: null,
      provider: "demo",
    };
  },
};

export const GIFT_LIMITS = { min: 10, max: 500 };
