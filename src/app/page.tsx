import Image from "next/image";
import Link from "next/link";
import Button from '../components/Button'

export default function Home() {
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
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-normal leading-h2 mb-12">Nasze Wyjątkowe Projekty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Placeholder Product 1 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
               {/* Image Container */}
               <div className="relative w-full h-48 rounded mb-4 overflow-hidden">
                 <Image 
                    src="/featured-1.png"
                    alt="Pierścionek Klasyczna Elegancja"
                    fill 
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                 />
               </div>
               <h3 className="text-xl font-serif font-normal leading-relaxed mb-2">Pierścionek &quot;Klasyczna Elegancja&quot;</h3>
               <p className="text-sm text-gray-600 dark:text-gray-300 leading-base mb-4">Złoty pierścionek z centralnie osadzonym brylantem.</p>
               <Link href="/katalog/produkt-1" className="link-subtle-hover text-sm font-bold mt-auto">
                  Zobacz szczegóły
               </Link>
            </div>
             {/* Placeholder Product 2 */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
                {/* Image Container */}
               <div className="relative w-full h-48 rounded mb-4 overflow-hidden">
                 <Image 
                    src="/featured-2.png"
                    alt="Pierścionek Subtelny Blask"
                    fill 
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                 />
               </div>
               <h3 className="text-xl font-serif font-normal leading-relaxed mb-2">Pierścionek &quot;Subtelny Blask&quot;</h3>
               <p className="text-sm text-gray-600 dark:text-gray-300 leading-base mb-4">Delikatny złoty pierścionek z szafirem otoczonym małymi diamentami.</p>
               <Link href="/katalog/produkt-2" className="link-subtle-hover text-sm font-bold mt-auto">
                  Zobacz szczegóły
               </Link>
            </div>
             {/* Call to Catalog */}
             <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded-lg shadow-inner flex flex-col items-center justify-center text-center">
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
