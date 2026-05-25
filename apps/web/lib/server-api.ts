import { cookies } from "next/headers";
import { API_URL, type OrderDetails } from "./api";

async function serverRequest<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieStore.toString()
    }
  });
  if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function getServerOrder(orderId: string) {
  return serverRequest<OrderDetails>(`/api/orders/${orderId}`);
}

export function getServerPurchases() {
  return serverRequest<Array<{ productId: string; productName: string; accessUrl: string; purchasedAt: string; orderId: string }>>(
    "/api/me/purchases"
  );
}

export type AdminOrder = {
  id: string;
  status: string;
  txHash?: string | null;
  createdAt: string;
  product: { name: string; tokenSymbol: string };
  user: { walletAddress: string };
  expectedAmount: string;
};

export function getServerAdminOrders() {
  return serverRequest<AdminOrder[]>("/api/admin/orders");
}
