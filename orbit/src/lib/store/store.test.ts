import { beforeEach, describe, expect, it } from "vitest";
import { sampleMessages } from "../ingestion/samples";
import { orderView } from "./selectors";
import { actions, getState, today } from "./store";

// In Node there is no localStorage, so the store runs in memory on fresh demo data.
const data = () => getState().data;
const sample = (id: string) => sampleMessages(today()).find((m) => m.id === id)!;

describe("store workflow", () => {
  beforeEach(() => actions.resetDemo());

  it("prepares a return without ever marking it submitted", () => {
    const id = actions.prepareReturn({ orderId: "d-o-ref", itemIds: ["d-i-ref-1"], reason: null, refundPreference: "original_payment", dropOff: "ups" });
    expect(actions.getReturn(id)).toMatchObject({ status: "prepared", capability: "guided", submission: { by: null, confirmedByRetailer: false } });
  });

  it("reporting submission creates an expected, unconfirmed refund net of fees", () => {
    const id = actions.prepareReturn({ orderId: "d-o-ari", itemIds: ["d-i-ari-1"], reason: null, refundPreference: "original_payment", dropOff: "ups" });
    actions.reportSubmitted(id);
    expect(actions.getReturn(id)).toMatchObject({ status: "reported_submitted", submission: { confirmedByRetailer: false } });
    const refund = data().refunds.find((f) => f.returnId === id)!;
    expect(refund.confirmed).toBeNull();
    expect(refund.expected?.amount).toBe(145 - 7.5);
  });

  it("a retailer label email confirms the return and attaches the label", () => {
    const id = actions.prepareReturn({ orderId: "d-o-ari", itemIds: ["d-i-ari-1"], reason: null, refundPreference: "store_credit", dropOff: "ups" });
    actions.reportSubmitted(id);
    actions.importMessage({
      id: "t-label",
      channel: "email_upload",
      from: "Aritzia <hello@aritzia.example>",
      subject: "Your return label",
      receivedAt: new Date().toISOString(),
      body: "Order number: AR-2209174\nYour return label is attached. Drop it off at UPS.",
    });
    expect(actions.getReturn(id)).toMatchObject({ status: "label_ready", submission: { confirmedByRetailer: true } });
    expect(actions.getReturn(id)!.artifacts[0].kind).toBe("label_pdf");
  });

  it("dedupes the Everlane delivery email and makes the deadline estimable", () => {
    const everlane = sample("sample-everlane-delivered");
    const before = orderView(data(), data().orders.find((o) => o.id === "d-o-eve")!, today());
    expect(before.deadline?.kind).toBe("unknown");

    expect(actions.importMessage(everlane).status).toBe("merged");
    expect(actions.importMessage(everlane).status).toBe("duplicate_message");
    expect(data().orders.filter((o) => o.orderNumber === "EV-1180344")).toHaveLength(1);

    const after = orderView(data(), data().orders.find((o) => o.id === "d-o-eve")!, today());
    expect(after.deadline?.kind).toBe("estimated");
  });

  it("a retailer refund email confirms the tracked refund", () => {
    expect(actions.importMessage(sample("sample-sephora-refund"))).toMatchObject({ status: "merged", orderId: "d-o-sep" });
    expect(data().refunds.find((f) => f.id === "d-f-sep")!.confirmed).toMatchObject({ amount: 95, by: "retailer_email" });
    expect(data().returns.find((r) => r.id === "d-r-sep")!.status).toBe("completed");
  });

  it("adds an unknown retailer without assuming a policy", () => {
    const res = actions.importMessage(sample("sample-hollis-order"));
    expect(res.status).toBe("added");
    const view = orderView(data(), data().orders.find((o) => o.id === res.orderId)!, today());
    expect(view.policy).toBeNull();
    expect(view.deadline).toMatchObject({ kind: "unknown", missing: "policy" });
  });

  it("deleting an order removes its returns, refunds and evidence", () => {
    actions.deleteOrder("d-o-sep");
    expect(data().returns.some((r) => r.orderId === "d-o-sep")).toBe(false);
    expect(data().refunds.some((f) => f.orderId === "d-o-sep")).toBe(false);
    expect(data().evidence.some((e) => e.id.startsWith("d-ev-sep"))).toBe(false);
  });
});
