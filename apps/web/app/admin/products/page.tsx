import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/api";

export default async function AdminProductsPage() {
  const products = await getProducts();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black tracking-tight">Admin products</h1>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </main>
  );
}
