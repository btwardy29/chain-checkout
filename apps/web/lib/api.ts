export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? error.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  priceAmount: string;
  priceDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
};

export type OrderDetails = {
  orderId: string;
  onChainOrderId: `0x${string}`;
  productId: string;
  status: string;
  amount: string;
  displayAmount: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  chainId: number;
  paymentContractAddress: `0x${string}`;
  expiresAt: string;
  txHash?: string | null;
  product: Product;
};

export function getProducts() {
  return request<Product[]>("/api/products", { cache: "no-store" });
}

export function getProduct(slug: string) {
  return request<Product>(`/api/products/${slug}`, { cache: "no-store" });
}

export function createOrder(productId: string, walletAddress: string, idempotencyKey: string) {
  return request<OrderDetails>("/api/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ productId, walletAddress })
  });
}

export function getOrder(orderId: string) {
  return request<OrderDetails>(`/api/orders/${orderId}`, { cache: "no-store" });
}

export function submitTransaction(orderId: string, txHash: string) {
  return request<{ orderId: string; status: string }>(`/api/orders/${orderId}/submit-transaction`, {
    method: "POST",
    body: JSON.stringify({ txHash })
  });
}

export function getPurchases() {
  return request<Array<{ productId: string; productName: string; accessUrl: string; purchasedAt: string; orderId: string }>>(
    "/api/me/purchases",
    { cache: "no-store" }
  );
}
