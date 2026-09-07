import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/Button'
import ProductCard from '@/components/ProductCard'
import SectionTitle from '@/components/ui/SectionTitle'
import SketchReveal from '@/components/SketchReveal'
import ProcessSteps from '@/components/ProcessSteps'
import { getProducts } from '@/lib/wordpress'
import { PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, OPENING_HOURS } from '@/lib/socials'
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'

export const revalidate = 60

const offer = [
  {
    title: 'Pierścionki zaręczynowe',
    text: 'Projektowane dla jednej osoby. Kamień, oprawa i proporcje dobrane do dłoni, nie do katalogu.',
    href: '/katalog',
    cta: 'Zobacz przykłady',
  },
  {
    title: 'Obrączki',
    text: 'Klasyczne lub z własnym profilem, grawerem i fakturą. Kute ręcznie, więc trwałe na dziesięciolecia.',
    href: '/kontakt',
    cta: 'Zapytaj o obrączki',
  },
  {
    title: 'Renowacja i przeróbki',
    text: 'Pierścionek po babci, kamień z rodzinnej biżuterii. Odnawiamy i przeprawiamy tak, by służył dalej.',
    href: '/kontakt',
    cta: 'Umów rozmowę',
  },
]

export default async function Home() {
  const products = await getProducts()
  const featured = products.slice(0, 3)
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[calc(100svh-var(--action-bar-height))] md:min-h-[92vh] flex flex-col overflow-hidden section-dark">
        <div className="absolute inset-0 hero-zoom">
          <Image
            src="/hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_center] md:object-center"
          />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-graphite/90 via-graphite/55 to-graphite/15" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-graphite/90 to-transparent" />

        <div className="container-x relative flex-1 flex items-center pt-[calc(var(--header-height)+2rem)] pb-16 md:pb-24">
          <div className="max-w-2xl">
            <p className="eyebrow reveal is-visible">Pracownia złotnicza · Busko-Zdrój · od 1890</p>
            <h1 className="mt-4 text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-[4.75rem] text-[#f6f2ea] reveal is-visible" data-delay="1">
              Pierścionek, który powstaje <em className="italic text-gold-2">dla jednej osoby.</em>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#f6f2ea]/85 max-w-xl leading-relaxed reveal is-visible" data-delay="2">
              Cztery pokolenia złotników, jedna pracownia. Projektujemy i wykonujemy ręcznie pierścionki zaręczynowe,
              obrączki i biżuterię na indywidualne zamówienie.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 reveal is-visible" data-delay="3">
              <Button as="link" href="/katalog" variant="light" size="lg">Zobacz katalog</Button>
              <Button as="link" href="/kontakt" variant="outline" size="lg" className="border-white/40 text-white hover:border-gold-2 hover:text-gold-2">
                Umów rozmowę o projekcie
              </Button>
            </div>
          </div>
        </div>

        {/* Pasek faktów: stała wysokość, czytelne informacje */}
        <div className="container-x relative pb-8 md:pb-10">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3 border-t hairline pt-6 text-sm md:text-[15px] text-[#f6f2ea]/85">
            <li className="flex items-start gap-3"><span className="text-gold-2 font-display text-2xl leading-none">IV</span><span>pokolenie złotników w rodzinie Nowaków</span></li>
            <li className="flex items-start gap-3"><span className="text-gold-2 font-display text-2xl leading-none">100%</span><span>wykonania ręcznie w naszej pracowni</span></li>
            <li className="flex items-start gap-3"><span className="text-gold-2 font-display text-2xl leading-none">1:1</span><span>projekt tworzony razem z Tobą, na rozmowie</span></li>
          </ul>
        </div>
      </section>

      {/* OFERTA – szybkie dotarcie do informacji */}
      <section className="section">
        <div className="container-x">
          <SectionTitle eyebrow="Czym się zajmujemy" title="Trzy rzeczy, które robimy naprawdę dobrze" lead="Nie jesteśmy sklepem z gotową biżuterią. Każda rzecz, która wychodzi z pracowni, powstaje od początku dla konkretnej osoby." />
          <ul className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {offer.map((o, i) => (
              <li key={o.title} className="reveal" data-delay={String(i)}>
                <Link href={o.href} className="group lift block h-full rounded-lg bg-paper border border-line p-6 md:p-8">
                  <span className="block h-[2px] w-10 bg-gold mb-6" aria-hidden />
                  <h3 className="text-[1.75rem] leading-tight">{o.title}</h3>
                  <p className="mt-3 muted leading-relaxed">{o.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-gold">
                    {o.cta} <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SZKIC → PIERŚCIONEK (interaktywne) */}
      <section id="warsztat" className="section section-dark">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5 reveal">
            <p className="eyebrow">Warsztat</p>
            <h2 className="mt-3 text-[2.3rem] md:text-[3rem]">Ta sama dokładność. Inne czasy.</h2>
            <p className="mt-5 text-lg muted leading-relaxed">
              Każdy projekt zaczyna się od rysunku warsztatowego, tak jak sto lat temu. Potem są ręce, ogień, pilnik
              i lupa. Zmieniło się tylko to, że dziś możesz zobaczyć szkic i porozmawiać o nim, zanim dotkniemy złota.
            </p>
            <p className="mt-4 text-sm muted">Przesuń suwak, aby porównać szkic z gotowym pierścionkiem.</p>
            <div className="mt-8">
              <Button as="link" href="/o-nas" variant="light">Poznaj pracownię</Button>
            </div>
          </div>
          <div className="lg:col-span-7">
            <SketchReveal />
          </div>
        </div>
      </section>

      {/* WYBRANE PROJEKTY */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container-x">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <SectionTitle eyebrow="Katalog" title="Wybrane realizacje" lead="Każdy z tych pierścionków powstał na zamówienie. Traktuj je jako punkt wyjścia do rozmowy, nie gotowy produkt." />
              <Button as="link" href="/katalog" variant="outline" className="md:mb-1 shrink-0">Cały katalog</Button>
            </div>
            <ul className="mt-10 md:mt-14 grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </ul>
          </div>
        </section>
      )}

      {/* PROCES */}
      <section id="proces" className="section bg-ivory-2">
        <div className="container-x">
          <SectionTitle eyebrow="Jak wygląda współpraca" title="Cztery etapy, zero niespodzianek" lead="Wiesz, co dzieje się na każdym etapie, ile trwa i ile kosztuje. Wybierz etap, aby przeczytać więcej." />
          <div className="mt-10 md:mt-14 reveal">
            <ProcessSteps />
          </div>
        </div>
      </section>

      {/* DZIEDZICTWO */}
      <section className="section">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 reveal">
            <div className="img-zoom relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-lg overflow-hidden shadow-lg">
              <Image src="/about-us-son.png" alt="Michał Nowak przy stole złotniczym w pracowni" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-top" />
            </div>
          </div>
          <div className="lg:col-span-6 reveal" data-delay="1">
            <p className="eyebrow">Od 1890 roku</p>
            <h2 className="mt-3 text-[2.3rem] md:text-[3rem]">Cztery pokolenia przy jednym stole</h2>
            <p className="mt-5 text-lg muted leading-relaxed">
              Zaczęło się od Wiktora Nowaka, kowala z Szańca, który przywoził narzędzia z Francji. Dziś pracownię prowadzi
              Michał Nowak. Te same techniki, te same wymagania wobec siebie. Wiele pierścionków, które wykonał dziadek
              i ojciec, wraca do nas po latach na renowację. To najlepsza rekomendacja, jaką znamy.
            </p>
            <div className="mt-8">
              <Button as="link" href="/o-nas" variant="primary">Historia pracowni</Button>
            </div>
          </div>
        </div>
      </section>

      {/* KONTAKT */}
      <section className="section section-dark relative overflow-hidden">
        <Image src="/about-us-workshop.png" alt="" fill sizes="100vw" className="object-cover opacity-20" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-graphite/70 to-graphite" />
        <div className="container-x relative grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 reveal">
            <p className="eyebrow">Porozmawiajmy</p>
            <h2 className="mt-3 text-[2.3rem] md:text-[3rem]">Masz pomysł albo tylko pytanie? Zadzwoń.</h2>
            <p className="mt-5 text-lg muted leading-relaxed max-w-xl">
              Najprościej jest po prostu porozmawiać. Odbieramy w godzinach pracy, a jeśli wolisz pisać, odpowiadamy na
              e-maile w ciągu jednego dnia roboczego.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href={telHref} className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded bg-ivory text-ink font-semibold text-lg shadow-md hover:bg-white transition-colors">
                <FaPhone className="h-5 w-5 text-gold" aria-hidden /> {PHONE_NUMBER}
              </a>
              <Button as="link" href="/kontakt" variant="outline" size="lg" className="border-white/40 text-white hover:border-gold-2 hover:text-gold-2">
                Napisz wiadomość
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5 reveal" data-delay="1">
            <div className="rounded-lg border hairline bg-graphite-2/70 backdrop-blur p-6 md:p-8">
              <ul className="space-y-4 text-[15px]">
                <li className="flex gap-3"><FaMapMarkerAlt className="h-5 w-5 text-gold-2 shrink-0 mt-0.5" aria-hidden /><span>{ADDRESS}</span></li>
                <li className="flex gap-3"><FaEnvelope className="h-5 w-5 text-gold-2 shrink-0 mt-0.5" aria-hidden /><a href={`mailto:${EMAIL_ADDRESS}`} className="hover:text-gold-2">{EMAIL_ADDRESS}</a></li>
              </ul>
              <dl className="mt-6 pt-6 border-t hairline space-y-2 text-[15px]">
                {OPENING_HOURS.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4"><dt className="muted">{h.days}</dt><dd className="font-medium">{h.hours}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
