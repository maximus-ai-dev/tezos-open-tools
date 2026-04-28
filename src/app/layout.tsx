import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { TestBanner } from "@/components/layout/TestBanner";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { GITHUB_URL } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tezos Open Tools",
  description:
    "Open-source suite of tools for Tezos NFT collectors and artists. Free forever, MIT licensed, self-hostable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <WalletProvider>
          <TestBanner />
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer
            data-chrome="footer"
            className="border-t border-zinc-200 dark:border-zinc-800 py-4 text-center text-xs text-zinc-500"
          >
            <span>
              Independent, open-source tools for Tezos NFTs. Not affiliated with any marketplace.
            </span>{" "}
            <span className="inline-flex flex-wrap gap-x-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                Source
              </a>
              <a
                href="/why"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                Why
              </a>
              <a
                href="/faq"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                FAQ
              </a>
              <a
                href="/testers"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                Testers
              </a>
            </span>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
