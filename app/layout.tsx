import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { RouteFocus } from "@/components/app-shell/route-focus";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="glasshouse-theme"
        >
          {children}
          <Toaster />
          <RouteFocus />
        </ThemeProvider>
      </body>
    </html>
  );
}
