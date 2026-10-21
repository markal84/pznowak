import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {default: "Michał Nowak — biżuteria na indywidualne zamówienie", template: "%s — Michał Nowak"}, robots: {index: false, follow: false},
  description: "Unikalna biżuteria tworzona z pasją. Pierścionki zaręczynowe, obrączki, biżuteria na zamówienie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
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
