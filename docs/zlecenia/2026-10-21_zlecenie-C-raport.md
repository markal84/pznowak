# Raport – zlecenie C: plan reklamy lokalnej (21.10.2026)

Dla Marcina. Zakres: analiza i dokumenty, **bez zmian w kodzie strony**.

## Co powstało

- [`docs/marketing/plan-reklamy-lokalnej.md`](../marketing/plan-reklamy-lokalnej.md) – plan pełny: wizytówka Google,
  frazy lokalne, konkurencja, rekomendacje dla strony, social media z kalendarzem na 4 tygodnie, płatna reklama,
  plan 30/60/90 dni, decyzje, źródła.
- [`docs/marketing/dla-pracowni.md`](../marketing/dla-pracowni.md) – wersja dla Michała i Kamili, prostym językiem,
  ok. 2 strony.
- Ten raport.

## Najważniejsze 5 kroków

1. **Wizytówka Google w tygodniu 1:** dostęp (Michał i Kamila jako właściciele), nazwa bez dopisków, godziny
   + godziny świąteczne (11.11, 24–26.12, 31.12, 1.01, 6.01), kategorie, opis, usługi, 10 prawdziwych zdjęć.
2. **Opinie od każdego klienta przy odbiorze** – kod QR/link z panelu, gotowe teksty, zgodnie z zasadami Google
   (bez zachęt, bez wybierania zadowolonych).
3. **Ceny „od” i treść o kamieniach szlachetnych** – Michał podaje kwoty i informacje o kamieniach; potem
   rekomendacje T1–T2 na stronie. Dziś strona ma `[X] zł`, a ludzie szukają z „cena”.
4. **2–3 posty tygodniowo + wpis w wizytówce raz w tygodniu** według kalendarza od 26.10; poprawki FB (link
   vercel.app → pznowak.pl, e-mail → @pznowak.pl).
5. **Pomiar od pierwszego dnia:** zeszyt „skąd o nas wiesz”, statystyki wizytówki, Search Console (start: ok. 15
   kliknięć / 28 dni we wrześniu), miesięczna tabela pod slajd „Efekty w liczbach”. Płatna reklama najwcześniej od
   25.11, po przeprowadzce.

## Decyzje do podjęcia

Pełna lista z terminami: plan, rozdz. 8 (D1–D12). Najpilniejsze:

- **D1** jedna nazwa firmy wszędzie; **D2** kategoria główna „Jubiler” czy „Złotnik”; **D3** czy działa stary
  numer 41 378 84 34 (jest w katalogach Targeo/MisterWhat/Cylex z nieaktualnymi danymi).
- **D5** ceny „od” do publikacji (Michał).
- **D6** czy promować skup złota; formalności (m.in. możliwy 2% PCC przy zakupie od osoby prywatnej powyżej
  1000 zł – źródło branżowe, do potwierdzenia z księgową).
- **D9** wariant płatnej reklamy: 0 / Meta 300–600 zł / Meta + Google 600–1200 zł miesięcznie (szacunki).
- **D10** które rekomendacje dla strony wdrożyć (ceny, kamienie, skup, tytuły i opisy, dane strukturalne
  JewelryStore, mapa witryny, analityka).

## Ustalenia warte uwagi

- **Pytań i odpowiedzi w profilu Google już nie ma** – Google wycofał tę funkcję (API wyłączone 3.11.2025,
  zastąpienie odpowiedziami AI zapowiedziane w grudniu 2025). Zamiast tego: pełny profil i FAQ na stronie.
- W Busku widoczni są m.in. Jubiler Cel-Art (skup „od grama”, naprawy, grawer), PK Salony, Złota Korona, Verona,
  Skorpion Gold oraz lombardy; w podpowiedziach Google dla „jubiler busko” pojawiają się ich nazwy, a nazwy
  pracowni Nowaka – nie. Wyróżnik pracowni do komunikacji: własny warsztat, kamienie szlachetne, tradycja od 1890.
- Ogólnopolskie sklepy i sieci skupu mają podstrony „Jubiler Kielce”, „Skup złota Busko-Zdrój” – lokalna przewaga
  to przede wszystkim Mapy Google (odległość), nie zwykłe wyniki.
- Nowa strona nie ma mapy witryny, danych strukturalnych ani analityki; przekierowania starych adresów już są.

## Ograniczenia i odstępstwa

- **Gałąź:** zlecenie wskazywało `docs/plan-reklamy`; ta sesja mogła wypychać zmiany tylko na
  `claude/plan-c-sg6jxk`, więc PR idzie z tej gałęzi do `main`.
- **Brak wolumenów fraz** – nie było dostępu do Planera słów kluczowych. Popyt oceniony jakościowo na podstawie
  podpowiedzi Google z 21.10 (surowe dane w załączniku A planu). Jak zdobyć liczby: plan, rozdz. 2.1.
- **Nie sprawdzono:** panelu wizytówki (lista kontrolna ma kolumnę „stan” dla Kamili), pozycji w Mapach na miejscu
  w Busku (procedura w rozdz. 3.7), statystyk FB/IG.
- W repozytorium nie ma wcześniejszych raportów `docs/zlecenia/*-raport.md` ani slajdów dla pracowni, więc
  „Efekty w liczbach” przywołuję tylko z nazwy; tabela pomiarów (rozdz. 6.5) jest pomyślana jako jego ciąg dalszy.
- Budżety reklam to szacunki z uzasadnieniem, nie benchmarki rynkowe. Brak obietnic wyników.

## Źródła (najważniejsze)

Pełna lista (S1–S20, K1–K30): plan, rozdz. 9.

- Google – czynniki wyników lokalnych: https://support.google.com/business/answer/7091?hl=pl
- Google – zasady nazwy i opisu w profilu: https://support.google.com/business/answer/3038177?hl=pl
- Google – opinie i zakaz zachęt: https://support.google.com/business/answer/3474122?hl=pl ,
  https://support.google.com/contributionpolicy/answer/7400114?hl=pl
- BrightLocal – wycofanie Q&A: https://www.brightlocal.com/learn/google-q-and-a/
- Google – dane strukturalne LocalBusiness: https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=pl
- Google Ads – budżet dzienny: https://support.google.com/google-ads/answer/6385083?hl=pl
- Meta – minimalne budżety: https://www.facebook.com/business/help/203183363050448
- UOKiK – opinie na stronie: https://uokik.gov.pl/falszywe-opinie-stop
- Konkurencja: https://www.jubilerbusko.pl/oferta/ , https://pksalonyjubilerskie.pl/ , https://zlotylombard.eu/ ,
  https://www.jubilerwik.pl/ , https://zlotnik-kielce.eu/
