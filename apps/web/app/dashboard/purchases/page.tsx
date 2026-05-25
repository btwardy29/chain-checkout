import { Download } from "lucide-react";
import { getServerPurchases } from "@/lib/server-api";

export default async function PurchasesPage() {
  const purchases = await getServerPurchases().catch(() => []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-black tracking-tight">Purchased products</h1>
      <div className="grid gap-4">
        {purchases.map((purchase) => (
          <article key={purchase.orderId} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-panel">
            <div>
              <h2 className="text-xl font-bold">{purchase.productName}</h2>
              <p className="mt-1 text-sm text-black/60">Purchased {new Date(purchase.purchasedAt).toLocaleString()}</p>
            </div>
            <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white" href={purchase.accessUrl} target="_blank">
              <Download className="h-4 w-4" /> Open
            </a>
          </article>
        ))}
        {purchases.length === 0 ? <p className="rounded-lg border border-black/10 bg-white p-5 text-black/65">No purchases yet.</p> : null}
      </div>
    </main>
  );
}
