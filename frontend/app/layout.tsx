import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "Brief | Onchain Research",
  description: "Analyze any BNB Chain address or contract and generate a concise brief instantly.",
  icons: {
    icon: [
      { url: "/brief-logo-vc.svg?v=20260216", type: "image/svg+xml" },
      { url: "/brief-favicon.png?v=20260216", type: "image/png", sizes: "128x128" },
    ],
    apple: [{ url: "/brief-favicon.png?v=20260216", sizes: "128x128", type: "image/png" }],
    shortcut: ["/favicon.ico?v=20260216"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
