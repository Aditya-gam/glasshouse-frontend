import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { RouteFocus } from "@/components/app-shell/route-focus";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glasshouse",
  description:
    "Glasshouse — privacy self-audit. See your exposure the way an adversary would: attack, measure, defend.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Strict-CSP nonce (set per-request by Clerk in proxy.ts) — forwarded to next-themes so its
  // pre-paint anti-flash inline script carries the nonce instead of being blocked. Next nonces
  // its own scripts automatically; this is the one inline script we inject ourselves.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // `dynamic` lets ClerkProvider read the per-request CSP nonce (strict CSP, set in proxy.ts);
    // it forces dynamic rendering app-wide — required for nonce-based CSP.
    <ClerkProvider dynamic>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <ThemeProvider
            nonce={nonce}
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="glasshouse-theme"
          >
            <QueryProvider>
              {children}
              <Toaster />
              <RouteFocus />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
