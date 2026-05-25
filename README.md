# ChainCheckout

ChainCheckout is a portfolio-grade Web3 checkout for digital products. It models a real payment lifecycle where the backend is the source of truth: users authenticate with a wallet, create an order, pay through a smart contract, and a worker verifies the on-chain event before granting access.

## Architecture

```txt
apps/web      Next.js checkout UI, wallet auth, SSE listener
apps/api      Express REST API, SIWE auth, Prisma persistence, SSE gateway
apps/worker   BullMQ payment verifier, viem chain reads, Redis event publish
packages/shared     shared schemas, ABIs, order state machine
packages/contracts  PaymentProcessor + TestToken Solidity contracts
```

Infrastructure is local-first with PostgreSQL and Redis in `docker-compose.yml`.

## Core Flow

1. Open `/products`.
2. Connect a wallet and sign in with Ethereum.
3. Choose a product and create a checkout order.
4. Approve TEST-USDC if allowance is insufficient.
5. Call `PaymentProcessor.payOrder(bytes32,address,uint256)`.
6. Submit the transaction hash to the backend.
7. Worker verifies receipt, contract address, event, order id, payer, token, amount, and confirmations.
8. Backend marks the order paid and creates an entitlement.
9. Checkout page receives realtime SSE status updates.
10. Purchased product appears under `/dashboard/purchases`.

## Local Setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm --filter @chain-checkout/api dev
pnpm --filter @chain-checkout/worker dev
pnpm --filter @chain-checkout/web dev
```

Default local URLs:

```txt
Web: http://localhost:3000
API: http://localhost:4000
PostgreSQL: localhost:55432
Redis: localhost:6379
```

## Verification Commands

```bash
pnpm --filter @chain-checkout/shared build
pnpm --filter @chain-checkout/api lint
pnpm --filter @chain-checkout/worker lint
pnpm --filter @chain-checkout/web build
pnpm --filter @chain-checkout/contracts test
```

## Technical Decisions

- REST is used for command-heavy checkout operations.
- SSE is used instead of WebSockets because payment updates are server-to-client only.
- BullMQ keeps blockchain verification out of HTTP request latency.
- Redis pub/sub bridges worker updates to connected SSE clients.
- Order statuses are guarded by a shared state machine.
- Entitlements and payments use unique constraints for idempotency.
- `PaymentProcessor` emits `PaymentReceived(orderId, payer, token, amount)` so the backend can verify against expected order data.

## MVP Notes

The app is wired for a testnet deployment through environment variables:

```txt
RPC_URL
CHAIN_ID
PAYMENT_CONTRACT_ADDRESS
ACCEPTED_TOKEN_ADDRESS
MERCHANT_ADDRESS
REQUIRED_CONFIRMATIONS
```

Deploy `packages/contracts/contracts/TestToken.sol` and `PaymentProcessor.sol`, set the accepted token, then copy addresses into `.env`.
