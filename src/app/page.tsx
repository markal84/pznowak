import Image from "next/image";
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
 {/* Hero Section */}
<section className="relative min-h-screen flex flex-col justify-end text-center overflow-hidden">
  {/* Background Image: osobne warianty dla light/dark */}
  {/* Tymczasowo używamy jednego pliku dla obu motywów; po dostarczeniu finalnych grafik podmień na hero-light.jpg / hero-dark.jpg */}
  <Image
    src="/hero.png"
    alt="Tło pracowni złotniczej (jasny motyw)"
    fill
    style={{ objectFit: 'cover' }}
    priority
    className="z-0 block dark:hidden"
  />
  <Image
    src="/hero.png"
    alt="Tło pracowni złotniczej (ciemny motyw)"
    fill
    style={{ objectFit: 'cover' }}
    priority
    className="z-0 hidden dark:block"
  />

  {/* Overlay (mocniejszy w dark dla kontrastu) */}
  <div className="absolute inset-0 bg-black/30 dark:bg-black/50 z-10"></div>

  {/* Content: top ~60% wysokości, CTA bliżej dołu */}
  <div className="absolute inset-x-0 top-[60vh] z-20 px-6 text-white max-w-4xl mx-auto flex flex-col items-center">
    <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight drop-shadow-xl mb-2 md:mb-3">
      Tradycja, którą docenisz.
    </h1>
    <p className="text-2xl md:text-3xl font-serif font-normal text-white/90 drop-shadow mb-6 md:mb-30">
      Jakość, którą pokochasz.
    </p>
    <Button as="link" href="/katalog" variant="primary" className="py-4 px-8 text-lg">
      Zobacz kolekcję
    </Button>
  </div>
</section>


      {/* About Us Snippet */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] xl:py-[var(--space-section-lg)]">
        <Container className="text-center">
          <div className="max-w-3xl mx-auto">
            <SectionTitle title="Mistrzowskie Rzemiosło" center />
            <p className="text-lg md:text-xl leading-relaxed mb-8 text-gray-700 dark:text-gray-300">
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
            <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[340px] h-full">
              <h3 className="text-2xl font-serif font-normal leading-tight mb-3 text-gray-900 dark:text-white">Odkryj Pełną Ofertę</h3>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Zobacz wszystkie nasze unikalne projekty pierścionków zaręczynowych i obrączek.</p>
              <Button as="link" href="/katalog" variant="primary" className="py-2 px-6 text-base inline-block">
                Przejdź do katalogu
              </Button>
            </Card>
          </div>
        </Container>
      </section>

      {/* Contact CTA */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] xl:py-[var(--space-section-lg)] bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <Container className="text-center">
          <SectionTitle title="Masz Pomysł na Wyjątkowy Pierścionek?" center className="mb-6" />
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300 leading-relaxed">
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
