import Link from "next/link";
import { ShieldCheck, Radio, WalletCards } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-cobalt">Web3 payment lifecycle</p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-ink md:text-7xl">
            ChainCheckout
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
            A production-minded crypto checkout for digital products: wallet auth, smart-contract payment, worker verification, realtime order status, and entitlement unlock.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="focus-ring inline-flex min-h-12 items-center rounded-md bg-ink px-5 text-sm font-bold text-white" href="/products">
              Open products
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">
          <div className="grid gap-3">
            {[
              ["Order created", "Backend stores expected amount, token, chain, payer, and expiry."],
              ["Transaction submitted", "The tx hash is saved once and queued for async verification."],
              ["Payment verified", "Worker parses PaymentReceived and grants access server-side."]
            ].map(([title, body], index) => (
              <div key={title} className="flex gap-4 rounded-md border border-black/10 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mint/35 font-black">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-black/65">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm font-semibold">
            <div className="rounded-md bg-black/[0.04] p-3"><WalletCards className="mx-auto mb-2 h-5 w-5" />SIWE</div>
            <div className="rounded-md bg-black/[0.04] p-3"><ShieldCheck className="mx-auto mb-2 h-5 w-5" />Worker</div>
            <div className="rounded-md bg-black/[0.04] p-3"><Radio className="mx-auto mb-2 h-5 w-5" />SSE</div>
          </div>
        </div>
      </section>
    </main>
  );
}
