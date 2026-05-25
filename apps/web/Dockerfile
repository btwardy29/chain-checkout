FROM node:22-alpine AS base

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_TOKEN_ADDRESS
ARG NEXT_PUBLIC_BLOCK_EXPLORER_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=$NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_TOKEN_ADDRESS=$NEXT_PUBLIC_TOKEN_ADDRESS
ENV NEXT_PUBLIC_BLOCK_EXPLORER_URL=$NEXT_PUBLIC_BLOCK_EXPLORER_URL

RUN pnpm --filter @chain-checkout/shared build
RUN pnpm --filter @chain-checkout/web build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "@chain-checkout/web", "start"]
