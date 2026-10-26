import Image from "next/image";
import Link from "next/link";
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import { getProducts } from '../lib/wordpress'
import { PHONE_NUMBER } from '../lib/socials'

const processSteps = [
  {
    no: '01',
    title: 'Rozmowa',
    text: 'Zaczynamy od spotkania lub telefonu. Słuchamy: o okazji, o osobie, o tym, co ma opowiadać ten pierścionek.',
  },
  {
    no: '02',
    title: 'Projekt',
    text: 'Dobieramy kamień, metal i proporcje. Projekt powstaje dla jednej, konkretnej dłoni — nie dla witryny.',
  },
  {
    no: '03',
    title: 'Wykonanie',
    text: 'Pierścionek powstaje w naszej pracowni, ręcznie, tradycyjnymi technikami złotniczymi. Od odlewu po ostatnie polerowanie.',
  },
]

export default async function Home() {
  const products = await getProducts()
  const featured = products.slice(0, 3)

  return (
    <>
      {/* ── HERO — noir, edytorialny ─────────────────────── */}
      <section className="on-noir relative min-h-[100svh] flex flex-col overflow-hidden">
        {/* Tło */}
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-45"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(20,17,12,0.92) 0%, rgba(20,17,12,0.55) 55%, rgba(20,17,12,0.25) 100%), linear-gradient(to top, rgba(20,17,12,0.95) 0%, transparent 40%)',
          }}
        />

        {/* Treść */}
        <div className="relative flex-1 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10 pt-[calc(var(--header-height)+2rem)] pb-16">
            <div className="max-w-3xl">
              <div className="eyebrow eyebrow--rule mb-8 hero-rise !text-[var(--gold-soft)]" style={{ ['--rise-delay' as string]: '100ms' }}>
                Pracownia złotnicza · Busko-Zdrój
              </div>
              <h1
                className="display-title text-[2.75rem] leading-[1.04] sm:text-6xl md:text-7xl lg:text-[5.25rem] hero-rise"
                style={{ ['--rise-delay' as string]: '250ms' }}
              >
                Pierścionek,<br />
                który istnieje <em>w jednym egzemplarzu.</em>
              </h1>
              <p
                className="mt-8 max-w-lg text-base md:text-lg font-light leading-relaxed text-[var(--cream-dim)] hero-rise"
                style={{ ['--rise-delay' as string]: '420ms' }}
              >
                Projektujemy i wykonujemy biżuterię ręcznie, na indywidualne
                zamówienie — od pierwszej rozmowy o pomyśle po gotowe dzieło.
              </p>
              <div
                className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5 hero-rise"
                style={{ ['--rise-delay' as string]: '580ms' }}
              >
                <Link href="/kontakt" className="btn btn-primary">Umów rozmowę o projekcie</Link>
                <Link href="/katalog" className="link-arrow">Zobacz katalog</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Dolny pas faktów */}
        <div className="relative hairline-t">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <dl className="grid grid-cols-1 sm:grid-cols-3">
              {[
                ['Projekty indywidualne', 'Każdy pierścionek powstaje raz'],
                ['Ręczne wykonanie', 'Tradycyjne techniki złotnicze'],
                ['Od pokoleń', 'Rzemiosło przekazywane w rodzinie'],
              ].map(([t, d], i) => (
                <div
                  key={t}
                  className={[
                    'py-6 md:py-7 hero-rise',
                    i > 0 ? 'sm:border-l sm:border-[var(--hairline-on-dark)] sm:pl-8' : '',
                  ].join(' ')}
                  style={{ ['--rise-delay' as string]: `${700 + i * 120}ms` }}
                >
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.26em] text-[var(--gold-soft)]">{t}</dt>
                  <dd className="mt-1 text-sm font-light text-[var(--cream-dim)]">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── FILOZOFIA — asymetryczny split ───────────────── */}
      <section className="py-[var(--space-section-md)] md:py-[var(--space-section-lg)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <Reveal className="lg:col-span-5 order-2 lg:order-1">
              <div className="frame-zoom relative aspect-[4/5] bg-[var(--paper-deep)]">
                <Image
                  src="/about-us-details.png"
                  alt="Praca nad detalem pierścionka w pracowni"
                  fill
                  sizes="(min-width:1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <div className="lg:col-span-6 lg:col-start-7 order-1 lg:order-2">
              <Reveal>
                <div className="eyebrow eyebrow--rule mb-6">Filozofia pracowni</div>
                <h2 className="display-title text-4xl md:text-5xl lg:text-[3.4rem]">
                  Nie sprzedajemy biżuterii z&nbsp;gabloty. <em>Tworzymy ją dla jednej osoby.</em>
                </h2>
              </Reveal>
              <Reveal delay={150}>
                <p className="mt-8 max-w-lg text-base md:text-lg font-light leading-relaxed text-[var(--ink-soft)]">
                  W naszej pracowni łączymy tradycyjne techniki złotnicze
                  z współczesnym wzornictwem. Każdy projekt zaczyna się od
                  rozmowy, a kończy przedmiotem, który zostaje w rodzinie
                  na dekady.
                </p>
                <Link href="/o-nas" className="link-arrow mt-8">Poznaj naszą historię</Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── WYBRANE PROJEKTY ─────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-[var(--space-section-md)] md:py-[var(--space-section-lg)] bg-[var(--paper-deep)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-12 md:mb-16">
              <div>
                <div className="eyebrow eyebrow--rule mb-6">Katalog</div>
                <h2 className="display-title text-4xl md:text-5xl">Wybrane projekty</h2>
              </div>
              <Link href="/katalog" className="link-arrow mb-2">Cały katalog</Link>
            </Reveal>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {featured.map((p, i) => (
                <Reveal as="li" key={p.id} delay={i * 120}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── PROCES ───────────────────────────────────────── */}
      <section className="py-[var(--space-section-md)] md:py-[var(--space-section-lg)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="max-w-2xl mb-14 md:mb-20">
            <div className="eyebrow eyebrow--rule mb-6">Jak pracujemy</div>
            <h2 className="display-title text-4xl md:text-5xl">
              Trzy kroki od pomysłu <em>do pierścionka.</em>
            </h2>
          </Reveal>
          <ol className="grid grid-cols-1 md:grid-cols-3">
            {processSteps.map((step, i) => (
              <Reveal
                as="li"
                key={step.no}
                delay={i * 140}
                className={[
                  'py-8 md:py-2 border-t md:border-t-0 border-[var(--hairline)]',
                  i > 0 ? 'md:border-l md:pl-10' : '',
                  i < processSteps.length - 1 ? 'md:pr-10' : '',
                ].join(' ')}
              >
                <span className="font-display text-5xl md:text-6xl font-light text-[var(--gold)]">{step.no}</span>
                <h3 className="mt-5 font-display text-2xl md:text-[1.65rem]">{step.title}</h3>
                <p className="mt-3 text-sm md:text-[0.95rem] font-light leading-relaxed text-[var(--ink-soft)]">
                  {step.text}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA — noir band ──────────────────────────────── */}
      <section className="on-noir">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-[var(--space-section-md)] md:py-[var(--space-section-lg)]">
          <div className="max-w-3xl">
            <Reveal>
              <div className="eyebrow eyebrow--rule mb-6 !text-[var(--gold-soft)]">Zacznijmy</div>
              <h2 className="display-title text-4xl md:text-6xl">
                Opowiedz nam o&nbsp;swoim <em>pomyśle.</em>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-7 max-w-xl text-base md:text-lg font-light leading-relaxed text-[var(--cream-dim)]">
                Pierwsza rozmowa niczego nie zobowiązuje. Opowiedz, co chcesz
                uwiecznić — my powiemy, jak możemy to wykonać.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
                <Link href="/kontakt" className="btn btn-primary">Napisz do nas</Link>
                <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="link-arrow">{PHONE_NUMBER}</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
