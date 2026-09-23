import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteContent } from "@/lib/collection";

export const metadata: Metadata = {
  title: {default: "Michał Nowak — biżuteria na indywidualne zamówienie", template: "%s — Michał Nowak"}, robots: {index: false, follow: false},
  description: "Unikalna biżuteria tworzona z pasją. Pierścionki zaręczynowe, obrączki, biżuteria na zamówienie.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteContent = await getSiteContent();
  return (
    <html lang="pl">
      <body className="min-h-screen font-sans">
        <a href="#main" className="skip-link">Przejdź do treści</a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer siteContent={siteContent} />
        </div>
      </body>
    </html>
  );
}
