"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CheckCircle2, LogOut } from "lucide-react";
import { SiweMessage } from "siwe";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { API_URL } from "@/lib/api";
import { Button } from "./button";

type AuthMeResponse = {
  user: {
    id: string;
    walletAddress: string;
  } | null;
};

export function WalletAuth() {
  const { address, chainId } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isAuthenticated =
    Boolean(address) && authenticatedAddress?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!address) {
        setAuthenticatedAddress(null);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include"
      });
      const data = (await response.json()) as AuthMeResponse;
      if (!cancelled) setAuthenticatedAddress(data.user?.walletAddress ?? null);
    }

    loadSession().catch(() => {
      if (!cancelled) setAuthenticatedAddress(null);
    });

    return () => {
      cancelled = true;
    };
  }, [address]);

  async function signIn() {
    if (!address) return;
    const nonceResponse = await fetch(`${API_URL}/api/auth/nonce?address=${address}`, {
      credentials: "include"
    });
    const { nonce } = await nonceResponse.json();
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to ChainCheckout.",
      uri: window.location.origin,
      version: "1",
      chainId: chainId ?? Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532),
      nonce
    }).prepareMessage();
    const signature = await signMessageAsync({ message });
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, message, signature })
    });
    const data = (await response.json()) as AuthMeResponse;
    setAuthenticatedAddress(data.user?.walletAddress ?? address);
  }

  async function signOut() {
    setIsSigningOut(true);
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setAuthenticatedAddress(null);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ConnectButton />
      {isAuthenticated ? (
        <>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold text-ink">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Signed in
          </span>
          <Button variant="ghost" onClick={signOut} disabled={isSigningOut} title="Sign out">
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </>
      ) : address ? (
        <Button variant="secondary" onClick={signIn} disabled={isPending}>
          {isPending ? "Signing..." : "Sign in"}
        </Button>
      ) : null}
    </div>
  );
}
