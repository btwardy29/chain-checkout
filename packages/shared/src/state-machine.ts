export const orderStatuses = [
  "created",
  "awaiting_payment",
  "transaction_submitted",
  "confirming",
  "paid",
  "failed",
  "expired",
  "underpaid",
  "wrong_network",
  "wrong_token",
  "duplicate_transaction",
  "cancelled"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const terminalOrderStatuses = [
  "paid",
  "failed",
  "expired",
  "underpaid",
  "wrong_network",
  "wrong_token",
  "duplicate_transaction",
  "cancelled"
] as const satisfies readonly OrderStatus[];

const transitions = {
  created: ["awaiting_payment", "cancelled", "expired"],
  awaiting_payment: ["transaction_submitted", "expired", "cancelled"],
  transaction_submitted: [
    "confirming",
    "failed",
    "wrong_network",
    "wrong_token",
    "duplicate_transaction",
    "expired"
  ],
  confirming: ["paid", "failed", "underpaid", "wrong_token", "wrong_network"],
  paid: [],
  failed: [],
  expired: [],
  underpaid: [],
  wrong_network: [],
  wrong_token: [],
  duplicate_transaction: [],
  cancelled: []
} satisfies Record<OrderStatus, readonly OrderStatus[]>;

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return (transitions[from] as readonly OrderStatus[]).includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
  }
}

export function isTerminalOrderStatus(status: OrderStatus) {
  return (terminalOrderStatuses as readonly OrderStatus[]).includes(status);
}
