import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { ToastContainer } from "react-toastify";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title:
    "O‘zbekiston Respublikasi Prezidenti huzuridagi Davlat siyosati va boshqaruvi akademiyasi",
  description:
    "O‘zbekiston Respublikasi Prezidenti huzuridagi Davlat siyosati va boshqaruvi akademiyasi qabul jarayonlarini yagona avtomatlashtirilgan axborot tizimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={`${inter.variable} antialiased font-sans`}>
        <NextIntlClientProvider>
          {children}
          <ToastContainer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
