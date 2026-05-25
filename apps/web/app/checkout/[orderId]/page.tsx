import { notFound } from "next/navigation";
import { PaymentFlow } from "@/components/payment-flow";
import { getServerOrder } from "@/lib/server-api";

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getServerOrder(orderId).catch(() => null);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-cobalt">Realtime checkout</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Verify and unlock</h1>
        </div>
      </div>
      <PaymentFlow initialOrder={order} />
    </main>
  );
}
