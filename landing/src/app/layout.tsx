import type { Metadata } from "next";
import Metrica from "./metrica";
import "./globals.css";
import "./mobile-products.css";
import "./refinements.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://koredigital.co.kr"),
  title: "Koredigital — цифровые платформы для автобизнеса",
  description: "Веб-платформы, Telegram Mini App и цифровые инструменты для автодилеров от Koredigital.",
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg" },
  robots: { index: true, follow: true },
};
export default function Layout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="ru"><body>{children}<Metrica /></body></html>; }
