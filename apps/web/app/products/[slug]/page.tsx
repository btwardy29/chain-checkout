import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckoutStarter } from "@/components/checkout-starter";
import { getProduct } from "@/lib/api";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-black/10 bg-white shadow-panel">
        <Image src={product.thumbnail} alt="" fill className="object-cover" />
      </div>
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">Checkout ready</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">{product.name}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-black/70">{product.description}</p>
        <div className="mt-8 rounded-lg border border-black/10 bg-white p-5 shadow-panel">
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Metric label="Price" value={`${formatAmount(product.priceAmount, product.priceDecimals)} ${product.tokenSymbol}`} />
            <Metric label="Chain ID" value={String(product.chainId)} />
            <Metric label="Token" value={`${product.tokenAddress.slice(0, 6)}...${product.tokenAddress.slice(-4)}`} />
          </div>
          <div className="mt-5">
            <CheckoutStarter productId={product.id} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.04] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function formatAmount(amount: string, decimals: number) {
  const value = BigInt(amount);
  const divisor = 10n ** BigInt(decimals);
  return (value / divisor).toString();
}
