import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CategoryStyles from "./components/CategoryStyles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "絶滅危惧種検索サイト | レッドリスト横断検索",
  description:
    "日本の絶滅危惧種を検索・閲覧できるサイト。国・都道府県・市町村のレッドリストを横断検索。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // これでenv(safe-area-inset-bottom)が有効になる
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CategoryStyles />
        {children}
      </body>
    </html>
  );
}
