import Image from "next/image";
import Link from "next/link";
import Button from '../components/Button'
import Card from '../components/ui/Card'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../lib/wordpress'
import Container from '../components/ui/Container'
import SectionTitle from '../components/ui/SectionTitle'

export default async function Home() {
  // Pobierz produkty z WordPressa
  const products = await getProducts()
  // Docelowo: produkty wybrane przez ACF (np. pole "Pokaż na stronie głównej" w WordPress)
  // Teraz: wyświetlamy dwa pierwsze z katalogu
  return (
    <>
 {/* Hero Section – tło pełnoekranowe (jak wcześniej) + layout tekstu z compare */}
 <section className="relative min-h-screen overflow-hidden">
   {/* Tło: obraz pełnoekranowy light/dark */}
   <Image
     src="/hero-light.png"
     alt="Tło pracowni złotniczej (jasny motyw)"
     fill
     priority
     className="absolute inset-0 z-0 object-cover block dark:hidden"
   />
   <Image
     src="/hero.png"
     alt="Tło pracowni złotniczej (ciemny motyw)"
     fill
     priority
     className="absolute inset-0 z-0 object-cover hidden dark:block"
   />
   {/* Overlay: przyciemnienie + subtelne radiale brand */}
   <div className="absolute inset-0 z-10 bg-black/20 dark:bg-black/40" />
   <div
     aria-hidden
     className="absolute inset-0 z-10 pointer-events-none opacity-70 dark:opacity-40"
     style={{
       background:
         'radial-gradient(circle at 20% 80%, rgba(184,134,11,0.10) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(191,161,129,0.12) 0%, transparent 55%)',
     }}
   />
   {/* Treść */}
   <Container max="7xl" className="relative z-20">
    <div className="min-h-screen flex items-center py-20">
       <div className="max-w-2xl text-center md:text-left text-white -translate-y-12 sm:-translate-y-16 md:-translate-y-20 lg:-translate-y-24">
         <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-light leading-tight">
           <span className="relative text-[var(--color-brand-gold)] font-normal after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-[3px] after:w-full after:bg-gradient-to-r after:from-[var(--color-brand-gold)] after:to-[var(--color-brand-gold-soft)] after:rounded-[2px]">Tradycja,</span> którą docenisz.
         </h1>
         <p className="mt-6 text-lg sm:text-xl md:text-2xl italic text-white/90">
           Jakość, którą pokochasz.
         </p>
         <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
           <Button as="link" href="/katalog" variant="primary" className="py-4 px-8 text-lg">
             Zobacz kolekcję
           </Button>
         </div>
       </div>
     </div>
   </Container>
 </section>


      {/* About Us Snippet */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] xl:py-[var(--space-section-lg)]">
        <Container className="text-center mb-2">
          <div className="max-w-3xl mx-auto">
            <SectionTitle title="Mistrzowskie Rzemiosło" center />
            <p className="text-lg italic leading-8 md:leading-9 mb-8 text-gray-700 dark:text-gray-300">
              W naszej pracowni każdy pierścionek to dzieło sztuki, tworzone z dbałością o najmniejszy detal. Łączymy tradycyjne techniki złotnicze z nowoczesnym wzornictwem, aby spełnić Twoje marzenia o idealnej biżuterii. Specjalizujemy się w projektach na indywidualne zamówienie, dopasowanych do Twoich potrzeb i oczekiwań.
            </p>
            <Button 
              as="link" 
              href="/o-nas" 
              variant="primary" 
              className="py-2 px-6 text-base"
            >
              Poznaj naszą historię
            </Button>
          </div>
        </Container>
      </section>

      {/* Featured Products Teaser */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] xl:py-[var(--space-section-lg)]">
        <Container>
          <SectionTitle title="Nasze Wyjątkowe Projekty" center className="mb-12" />
          {/*
            Docelowo produkty będą wybierane przez ACF w WordPressie (np. pole "Pokaż na stronie głównej").
            Na razie wyświetlamy dwa pierwsze z katalogu.
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Produkt 1 */}
            {products[0] && (
              <ProductCard product={products[0]} cardClassName="bg-white dark:bg-gray-900 h-full" />
            )}
            {/* Produkt 2 */}
            {products[1] && (
              <ProductCard product={products[1]} cardClassName="bg-white dark:bg-gray-900 h-full" />
            )}
            {/* Box CTA w trzeciej kolumnie */}
            <Card className="group relative p-6 flex flex-col items-center justify-center text-center min-h-[340px] h-full overflow-hidden">
              <Link
                href="/katalog"
                aria-label="Przejdź do katalogu"
                tabIndex={-1}
                aria-hidden
                className="absolute inset-0 z-10"
              />
              <h3 className="text-2xl font-serif font-normal leading-tight mb-3 text-gray-900 dark:text-white">Odkryj Pełną Ofertę</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Zobacz wszystkie nasze unikalne projekty pierścionków zaręczynowych i obrączek.</p>
              <Button as="link" href="/katalog" variant="primary" className="py-2 px-6 text-base inline-block relative z-20 group-hover:bg-neutral-800 group-hover:text-brand-gold-soft dark:group-hover:bg-gray-200 dark:group-hover:text-neutral-900">
                Przejdź do katalogu
              </Button>
            </Card>
          </div>
        </Container>
      </section>

      {/* Contact CTA */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] xl:py-[var(--space-section-lg)] bg-gradient-to-r from-[var(--color-brand-light)] to-[var(--color-brand-beige)] dark:from-gray-700 dark:to-gray-900 text-gray-900 dark:text-white">
        <Container className="text-center">
          <SectionTitle title="Masz Pomysł na Wyjątkowy Pierścionek?" center className="mb-6" />
          <p className="text-lg mb-8 max-w-2xl mx-auto text-gray-700 dark:text-gray-300 leading-relaxed">
            Skontaktuj się z nami, aby omówić swój projekt. Z przyjemnością stworzymy dla Ciebie biżuterię marzeń.
          </p>
          <Button
            as="link"
            href="/kontakt"
            variant="primary"
            className="py-4 px-8 text-lg"
          >
            Napisz do nas
          </Button>
        </Container>
      </section>
    </>
  );
}
