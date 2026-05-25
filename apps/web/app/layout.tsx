import type { Metadata } from "next";
import Link from "next/link";
import "@rainbow-me/rainbowkit/styles.css";
import { WalletAuth } from "@/components/wallet-auth";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainCheckout",
  description: "A Web3 checkout system for digital products"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="border-b border-black/10 bg-paper/85 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
              <Link href="/" className="text-lg font-bold tracking-tight">
                ChainCheckout
              </Link>
              <div className="flex flex-wrap items-center gap-4">
                <nav className="flex items-center gap-4 text-sm font-medium">
                  <Link href="/products">Products</Link>
                  <Link href="/dashboard/purchases">Purchases</Link>
                  <Link href="/admin/orders">Admin</Link>
                </nav>
                <WalletAuth />
              </div>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
