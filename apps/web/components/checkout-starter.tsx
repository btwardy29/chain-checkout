"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { createOrder } from "@/lib/api";
import { Button } from "./button";

export function CheckoutStarter({ productId }: { productId: string }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
    inFlightRef.current = false;
    setPending(false);
  }, [address, productId]);

  async function startCheckout() {
    if (inFlightRef.current) return;
    if (!address || !isConnected) {
      setError("Connect and sign in with your wallet first.");
      return;
    }
    inFlightRef.current = true;
    setPending(true);
    setError(null);
    try {
      const order = await createOrder(productId, address, idempotencyKeyRef.current);
      router.push(`/checkout/${order.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
      inFlightRef.current = false;
      idempotencyKeyRef.current = crypto.randomUUID();
      setPending(false);
    }
  }

  return (
    <div>
      <Button onClick={startCheckout} disabled={pending} className="w-full sm:w-auto">
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Creating order..." : "Create checkout order"}
      </Button>
      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
