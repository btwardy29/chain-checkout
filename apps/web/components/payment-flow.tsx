"use client";

import { erc20Abi, paymentProcessorAbi } from "@chain-checkout/shared";
import { Check, Clock, ExternalLink, GitBranch, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { OrderDetails } from "@/lib/api";
import { API_URL, submitTransaction } from "@/lib/api";
import { explorerTxUrl, shortAddress } from "@/lib/format";
import { Button } from "./button";

type StatusEvent = {
  type: string;
  status?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  message?: string;
};

export function PaymentFlow({ initialOrder }: { initialOrder: OrderDetails }) {
  const { address, chain, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [order, setOrder] = useState(initialOrder);
  const [message, setMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(initialOrder.txHash as `0x${string}` | undefined);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: order.chainId });

  const allowanceQuery = useReadContract({
    abi: erc20Abi,
    address: order.tokenAddress,
    functionName: "allowance",
    args: address ? [address, order.paymentContractAddress] : undefined,
    query: { enabled: Boolean(address) && chainId === order.chainId && isPaymentConfigured(order) }
  });

  const balanceQuery = useReadContract({
    abi: erc20Abi,
    address: order.tokenAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && chainId === order.chainId && isPaymentConfigured(order) }
  });

  const amount = BigInt(order.amount);
  const allowance = allowanceQuery.data ?? 0n;
  const balance = balanceQuery.data ?? 0n;
  const needsApproval = allowance < amount;
  const hasEnoughBalance = balance >= amount;
  const wrongNetwork = isConnected && chainId !== order.chainId;
  const requiredNetwork = networkLabel(order.chainId);
  const currentNetwork = chain?.name ?? (chainId ? `chain ${chainId}` : "unknown network");
  const paymentConfigured = isPaymentConfigured(order);
  const placeholderMessage = paymentPlaceholderMessage(order);
  const hasSubmittedPayment =
    Boolean(txHash || order.txHash) ||
    order.status === "transaction_submitted" ||
    order.status === "confirming" ||
    order.status === "paid";

  useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) }
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/api/orders/${order.orderId}/events`, { withCredentials: true });
    const update = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as StatusEvent;
      setOrder((current) => ({ ...current, status: payload.status ?? current.status }));
      if (payload.message) setMessage(payload.message);
    };
    ["transaction_submitted", "confirmation_updated", "payment_confirmed", "payment_failed", "order_expired"].forEach((type) =>
      source.addEventListener(type, update)
    );
    return () => source.close();
  }, [order.orderId]);

  const steps = useMemo(
    () => [
      step("Order created", true),
      step("Wallet connected", isConnected),
      step("Correct network", isConnected && !wrongNetwork),
      step("Token balance ready", hasSubmittedPayment || (paymentConfigured && !wrongNetwork && hasEnoughBalance)),
      step("Token approved", hasSubmittedPayment || (paymentConfigured && !wrongNetwork && !needsApproval)),
      step("Transaction submitted", hasSubmittedPayment),
      step("Waiting for confirmations", order.status === "confirming" || order.status === "paid"),
      step("Product unlocked", order.status === "paid")
    ],
    [hasEnoughBalance, hasSubmittedPayment, isConnected, needsApproval, order.status, paymentConfigured, wrongNetwork]
  );

  async function switchToRequiredNetwork() {
    setMessage(null);
    try {
      await switchChainAsync({ chainId: order.chainId });
      setMessage(`Switched to ${requiredNetwork}. You can continue payment now.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not switch to ${requiredNetwork}.`);
    }
  }

  async function pay() {
    if (!address) {
      setMessage("Connect wallet first.");
      return;
    }
    setMessage(null);
    if (wrongNetwork) {
      await switchToRequiredNetwork();
      return;
    }
    if (!paymentConfigured) {
      setMessage("Payment contract and token addresses are still placeholders. Deploy contracts and update .env before paying.");
      return;
    }
    if (!hasEnoughBalance) {
      setMessage(`Your wallet does not have enough ${order.tokenSymbol}. Mint test tokens to ${address} and refresh the page.`);
      return;
    }
    if (needsApproval) {
      setMessage("Waiting for token approval...");
      const approvalHash = await writeContractAsync({
        abi: erc20Abi,
        address: order.tokenAddress,
        functionName: "approve",
        args: [order.paymentContractAddress, amount],
        gas: 80_000n
      });
      setMessage("Waiting for approval confirmation...");
      await publicClient?.waitForTransactionReceipt({ hash: approvalHash });
      await allowanceQuery.refetch();
    }
    setMessage("Waiting for wallet payment confirmation...");
    const hash = await writeContractAsync({
      abi: paymentProcessorAbi,
      address: order.paymentContractAddress,
      functionName: "payOrder",
      args: [order.onChainOrderId, order.tokenAddress, amount],
      gas: 160_000n
    });
    setTxHash(hash);
    await submitTransaction(order.orderId, hash);
    setMessage("Transaction submitted. Backend worker is verifying the on-chain event.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">
        <h1 className="text-3xl font-black tracking-tight">Checkout</h1>
        <p className="mt-2 text-sm text-black/60">Order {shortAddress(order.orderId)}</p>
        <div className="mt-6 space-y-3">
          <Summary label="Product" value={order.product.name ?? order.productId} />
          <Summary label="Amount" value={`${order.displayAmount} ${order.tokenSymbol}`} />
          <Summary label="Network" value={requiredNetwork} />
          <Summary label="Token" value={shortAddress(order.tokenAddress)} />
          <Summary label="Wallet token balance" value={`${formatTokenAmount(balance, order.product.priceDecimals)} ${order.tokenSymbol}`} />
          <Summary label="Contract" value={shortAddress(order.paymentContractAddress)} />
          <Summary label="Expires" value={new Date(order.expiresAt).toLocaleString()} />
        </div>
        {wrongNetwork ? (
          <div className="mt-5 rounded-md bg-coral/15 p-3 text-sm font-semibold text-red-800">
            Wrong network. Your wallet is on {currentNetwork}; payment requires {requiredNetwork}.
          </div>
        ) : null}
        {!paymentConfigured ? (
          <div className="mt-5 rounded-md bg-black/[0.04] p-3 text-sm font-semibold text-black/70">
            {placeholderMessage}
          </div>
        ) : null}
        {paymentConfigured && !wrongNetwork && !hasEnoughBalance ? (
          <div className="mt-5 rounded-md bg-coral/15 p-3 text-sm font-semibold text-red-800">
            Your wallet needs at least {order.displayAmount} {order.tokenSymbol}. Mint test tokens to continue.
          </div>
        ) : null}
        <Button
          onClick={wrongNetwork ? switchToRequiredNetwork : pay}
          disabled={!isConnected || isPending || order.status === "paid"}
          className="mt-6 w-full"
        >
          {wrongNetwork ? <GitBranch className="h-4 w-4" /> : null}
          {buttonLabel({ wrongNetwork, isPending, needsApproval, requiredNetwork })}
        </Button>
        {message ? <p className="mt-4 text-sm font-medium text-black/65">{message}</p> : null}
        {txHash ? (
          <a className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cobalt" href={explorerTxUrl(txHash)} target="_blank">
            View transaction <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">
        <h2 className="text-xl font-black tracking-tight">Payment status</h2>
        <div className="mt-5 space-y-3">
          {steps.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-md border border-black/10 p-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${item.done ? "bg-mint/40" : "bg-black/[0.04]"}`}>
                {item.done ? <Check className="h-4 w-4" /> : order.status.includes("wrong") || order.status === "failed" ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </span>
              <span className="font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm font-bold">Current status: {order.status}</p>
      </section>
    </div>
  );
}

function step(label: string, done: boolean) {
  return { label, done };
}

function buttonLabel(input: {
  wrongNetwork: boolean;
  isPending: boolean;
  needsApproval: boolean;
  requiredNetwork: string;
}) {
  if (input.isPending) return "Wallet pending...";
  if (input.wrongNetwork) return `Switch to ${input.requiredNetwork}`;
  if (input.needsApproval) return "Approve and pay";
  return "Pay with crypto";
}

function networkLabel(chainId: number) {
  if (chainId === 84532) return "Base Sepolia";
  if (chainId === 11155111) return "Sepolia";
  return `chain ${chainId}`;
}

function isPaymentConfigured(order: OrderDetails) {
  return paymentPlaceholderMessage(order) === null;
}

function paymentPlaceholderMessage(order: OrderDetails) {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const missing = [
    order.tokenAddress.toLowerCase() === zeroAddress ? "token" : null,
    order.paymentContractAddress.toLowerCase() === zeroAddress ? "payment contract" : null
  ].filter(Boolean);

  if (missing.length === 0) return null;
  return `Payment ${missing.join(" and ")} address is still a placeholder. Update .env and sync products/orders.`;
}

function formatTokenAmount(amount: bigint, decimals: number) {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3 text-sm">
      <span className="text-black/55">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
