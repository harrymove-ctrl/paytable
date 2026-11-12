import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayTable · Linked PayPal Wallets for AI Agents",
  description:
    "Minimalist collaborative AI tabletop built on Sodium and PayPal Sandbox with human approval on every agent purchase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="sodium min-h-dvh bg-page text-text-1 antialiased">
        {children}
      </body>
    </html>
  );
}
