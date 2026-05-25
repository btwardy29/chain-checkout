import { explorerTxUrl, shortAddress } from "@/lib/format";
import { getServerAdminOrders } from "@/lib/server-api";

export default async function AdminOrdersPage() {
  const orders = await getServerAdminOrders().catch(() => []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black tracking-tight">Admin orders</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-black/10 bg-white shadow-panel">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-black/[0.04] text-xs uppercase tracking-[0.12em] text-black/55">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Product</th>
              <th className="p-4">Wallet</th>
              <th className="p-4">Status</th>
              <th className="p-4">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-black/10">
                <td className="p-4 font-semibold">{shortAddress(order.id)}</td>
                <td className="p-4">{order.product.name}</td>
                <td className="p-4">{shortAddress(order.user.walletAddress)}</td>
                <td className="p-4"><span className="rounded-md bg-black/[0.06] px-2 py-1 font-bold">{order.status}</span></td>
                <td className="p-4">
                  {order.txHash ? <a className="font-bold text-cobalt" href={explorerTxUrl(order.txHash)} target="_blank">{shortAddress(order.txHash)}</a> : "none"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="p-5 text-black/65">No orders visible. Sign in first, then create an order.</p> : null}
      </div>
    </main>
  );
}
