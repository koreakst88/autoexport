import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TelegramProvider } from "@/components/providers/TelegramProvider";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AutoExport — Авто из Кореи",
  description: "Каталог и подбор автомобилей из Кореи под ключ в СНГ",
  other: {
    "telegram-web-app": "true",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={geistSans.variable}>
      <body className={`${geistMono.variable} antialiased`}>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
