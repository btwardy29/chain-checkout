import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/api";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Digital products</h1>
          <p className="mt-3 max-w-2xl text-black/65">
            Pick a product, authenticate with your wallet, and complete checkout through the payment processor contract.
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
