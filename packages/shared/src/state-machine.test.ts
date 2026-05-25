import { describe, expect, it } from "vitest";
import { canTransitionOrder, isTerminalOrderStatus } from "./state-machine.js";

describe("order state machine", () => {
  it("allows the main success path", () => {
    expect(canTransitionOrder("created", "awaiting_payment")).toBe(true);
    expect(canTransitionOrder("awaiting_payment", "transaction_submitted")).toBe(true);
    expect(canTransitionOrder("transaction_submitted", "confirming")).toBe(true);
    expect(canTransitionOrder("confirming", "paid")).toBe(true);
  });

  it("blocks transitions from terminal states", () => {
    expect(isTerminalOrderStatus("paid")).toBe(true);
    expect(canTransitionOrder("paid", "awaiting_payment")).toBe(false);
    expect(canTransitionOrder("expired", "paid")).toBe(false);
    expect(canTransitionOrder("failed", "confirming")).toBe(false);
  });

  it("allows important payment failure paths", () => {
    expect(canTransitionOrder("transaction_submitted", "wrong_network")).toBe(true);
    expect(canTransitionOrder("transaction_submitted", "duplicate_transaction")).toBe(true);
    expect(canTransitionOrder("confirming", "underpaid")).toBe(true);
  });
});
