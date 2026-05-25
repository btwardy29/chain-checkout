import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const displayAmount = formatAmount(product.priceAmount, product.priceDecimals);

  return (
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-panel">
      <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-md bg-black/[0.03]">
        <Image src={product.thumbnail} alt="" fill className="object-cover" />
      </div>
      <div className="flex min-h-40 flex-col">
        <h2 className="text-xl font-bold tracking-tight">{product.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-6 text-black/65">{product.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-bold">
            {displayAmount} {product.tokenSymbol}
          </span>
          <Link
            href={`/products/${product.slug}`}
            className="focus-ring inline-flex min-h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            Buy with crypto
          </Link>
        </div>
      </div>
    </article>
  );
}

function formatAmount(amount: string, decimals: number) {
  const value = BigInt(amount);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  return fraction === 0n ? whole.toString() : `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}
