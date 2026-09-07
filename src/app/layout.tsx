import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileActionBar from "@/components/MobileActionBar";
import RevealObserver from "@/components/RevealObserver";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pracownia Złotnicza Michał Nowak | Busko-Zdrój",
    template: "%s | Pracownia Złotnicza Michał Nowak",
  },
  description:
    "Rodzinna pracownia złotnicza od 1890 roku. Pierścionki zaręczynowe, obrączki i biżuteria na indywidualne zamówienie, wykonywana ręcznie w Busku-Zdroju.",
};

export const viewport: Viewport = {
  themeColor: "#faf7f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans">
        <a href="#main" className="skip-link">Przejdź do treści</a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1 pb-[var(--action-bar-height)] md:pb-0">{children}</main>
          <Footer />
        </div>
        <MobileActionBar />
        <RevealObserver />
      </body>
    </html>
  );
}
