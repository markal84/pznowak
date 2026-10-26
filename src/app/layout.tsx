import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Michał Nowak — Pracownia Złotnicza | Pierścionki na zamówienie",
    template: "%s — Michał Nowak Pracownia Złotnicza",
  },
  description:
    "Pracownia złotnicza w Busku-Zdroju. Pierścionki zaręczynowe i biżuteria projektowana i wykonywana ręcznie, na indywidualne zamówienie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" data-scroll-behavior="smooth" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-screen font-sans">
        <a href="#main" className="skip-link">Przejdź do treści</a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
