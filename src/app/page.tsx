import Image from "next/image";
import Button from '../components/Button'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../lib/wordpress'

export default async function Home() {
  // Pobierz produkty z WordPressa
  const products = await getProducts()
  // Docelowo: produkty wybrane przez ACF (np. pole "Pokaż na stronie głównej" w WordPress)
  // Teraz: wyświetlamy dwa pierwsze z katalogu
  return (
    <>
 {/* Hero Section */}
<section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden">
  {/* Background Image */}
  <Image 
    src="/hero.png" 
    alt="Tło pracowni złotniczej" 
    fill 
    style={{ objectFit: 'cover' }} 
    priority 
    className="z-0"
  />

  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-black/30 z-10"></div>

  {/* Content */}
  <div className="relative z-20 px-6 py-12 text-white max-w-4xl flex flex-col items-center" style={{ transform: 'translateY(-20%)' }}>
    {/* TODO: Zbadać dlaczego klasa leading-h1 z tailwind.config.ts nie działa poprawnie (nadpisywana?). Tymczasowo użyto leading-[4.1rem]. */}
    <h1 className="text-4xl md:text-5xl font-serif font-bold leading-[4.1rem] drop-shadow-xl mb-10">
      Tradycja, którą docenisz.<br />
      Jakość, którą pokochasz.
    </h1>
    <Button as="link" href="/katalog" variant="secondary" className="py-4 px-8 text-lg">
      Zobacz kolekcję
    </Button>
  </div>
</section>


      {/* About Us Snippet */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-serif font-normal leading-h2 mb-6">Mistrzowskie Rzemiosło</h2>
          <p className="text-base leading-base mb-8">
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
      </section>

      {/* Featured Products Teaser */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif font-normal leading-h2 mb-12 text-center">Nasze Wyjątkowe Projekty</h2>
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
            <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded-lg shadow-inner flex flex-col items-center justify-center text-center min-h-[340px] h-full">
              <h3 className="text-xl font-serif font-normal leading-relaxed mb-4 dark:text-white">Odkryj Pełną Ofertę</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-base mb-6">Zobacz wszystkie nasze unikalne projekty pierścionków zaręczynowych i obrączek.</p>
              <Button as="link" href="/katalog" variant="primary" className="py-2 px-6 text-base inline-block">
                Przejdź do katalogu
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-normal leading-h2 mb-6">Masz Pomysł na Wyjątkowy Pierścionek?</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300 leading-relaxed">
            Skontaktuj się z nami, aby omówić swój projekt. Z przyjemnością stworzymy dla Ciebie biżuterię marzeń.
          </p>
          <Button
            as="link"
            href="/kontakt"
            variant="secondary"
            className="py-4 px-8 text-lg"
          >
            Napisz do nas
          </Button>
        </div>
      </section>
    </>
  );
}
