// import Image from "next/image"; // Remove unused import
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center bg-gradient-to-r from-gray-100 to-gray-300 text-gray-800 overflow-hidden">
        {/* Placeholder for a beautiful background image later */}
        {/* <Image src="/path/to/hero-background.jpg" layout="fill" objectFit="cover" alt="Pracownia złotnicza tło" className="opacity-30"/> */}
        <div className="relative z-10 p-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light mb-4 leading-tight">
            Biżuteria tworzona z pasją,
            <br /> specjalnie dla Ciebie.
          </h1>
          <p className="text-lg md:text-xl font-sans mb-8 max-w-2xl mx-auto">
            Odkryj świat unikalnych pierścionków zaręczynowych i obrączek, wykonanych ręcznie z najwyższej jakości materiałów.
          </p>
          <Link
            href="/katalog"
            className="bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-3 px-8 rounded-full text-lg font-medium inline-block"
          >
            Zobacz kolekcję
          </Link>
        </div>
      </section>

      {/* About Us Snippet */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-6">Mistrzowskie Rzemiosło</h2>
          <p className="leading-relaxed mb-8">
            W naszej pracowni każdy pierścionek to dzieło sztuki, tworzone z dbałością o najmniejszy detal. Łączymy tradycyjne techniki złotnicze z nowoczesnym wzornictwem, aby spełnić Twoje marzenia o idealnej biżuterii. Specjalizujemy się w projektach na indywidualne zamówienie, dopasowanych do Twoich potrzeb i oczekiwań.
          </p>
          <Link href="/o-nas" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Poznaj naszą historię &rarr;
          </Link>
        </div>
      </section>

      {/* Featured Products Teaser */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-12">Nasze Wyjątkowe Projekty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Placeholder Product 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
               {/* Placeholder for Image */}
               <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-500">Placeholder Obrazka</div>
               <h3 className="text-xl font-serif font-light mb-2">Pierścionek &quot;Klasyczna Elegancja&quot;</h3>
               <p className="text-gray-600 text-sm mb-4">Złoty pierścionek z centralnie osadzonym brylantem.</p>
               <Link href="/katalog/produkt-1" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Zobacz szczegóły
               </Link>
            </div>
             {/* Placeholder Product 2 */}
             <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                {/* Placeholder for Image */}
               <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-500">Placeholder Obrazka</div>
               <h3 className="text-xl font-serif font-light mb-2">Pierścionek &quot;Subtelny Blask&quot;</h3>
               <p className="text-gray-600 text-sm mb-4">Delikatny złoty pierścionek z szafirem otoczonym małymi diamentami.</p>
               <Link href="/katalog/produkt-2" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Zobacz szczegóły
               </Link>
            </div>
             {/* Call to Catalog */}
             <div className="bg-gray-200 p-6 rounded-lg shadow-inner flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-serif font-light mb-4">Odkryj Pełną Ofertę</h3>
                <p className="text-gray-700 text-sm mb-6">Zobacz wszystkie nasze unikalne projekty pierścionków zaręczynowych i obrączek.</p>
                <Link href="/katalog" className="bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-2 px-6 rounded-full text-base font-medium inline-block">
                  Przejdź do katalogu
                </Link>
             </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-6">Masz Pomysł na Wyjątkowy Pierścionek?</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            Skontaktuj się z nami, aby omówić swój projekt. Z przyjemnością stworzymy dla Ciebie biżuterię marzeń.
          </p>
          <Link
            href="/kontakt"
            className="bg-white text-gray-900 hover:bg-gray-200 transition-colors duration-300 py-3 px-8 rounded-full text-lg font-medium inline-block"
          >
            Napisz do nas
          </Link>
        </div>
      </section>
    </>
  );
}
