# Plan reklamy lokalnej — Michał Nowak Pracownia Złotnicza (Busko-Zdrój)

Data: 21.10.2026 · Zlecenie C · Status: **projekt do akceptacji** (Marcin, Michał, Kamila)
Wersja prostym językiem dla pracowni: [dla-pracowni.md](dla-pracowni.md) · Raport: [../zlecenia/2026-10-21_zlecenie-C-raport.md](../zlecenia/2026-10-21_zlecenie-C-raport.md)

**Zasady tego dokumentu**

- Każda liczba i twierdzenie o rynku ma odnośnik do źródła (`[S…]` – zasady i narzędzia, `[K…]` – konkurencja,
  lista na końcu) albo jest jawnie oznaczone jako **szacunek**.
- Nie podajemy wolumenów wyszukiwań: nie mieliśmy dostępu do narzędzia, które je mierzy. Popyt na frazy oceniamy
  jakościowo, na podstawie podpowiedzi Google (opis metody w rozdz. 2).
- Bez obietnic wyników. Google sam pisze, że nie da się kupić ani zamówić wyższej pozycji w wynikach lokalnych [S1].
- Zero zmian w kodzie strony. Wszystko, co dotyczy strony, to rekomendacje do decyzji (rozdz. 4).
- Zdjęć i treści odlewni Iza, Stelmach oraz modeli z CGTrader nie proponujemy do publikacji bez zgody właściciela.

## Spis treści

0. [Punkt wyjścia](#0-punkt-wyjścia-stan-na-21102026)
1. [Wizytówka Google (Profil Firmy)](#1-wizytówka-google-profil-firmy)
2. [Frazy lokalne](#2-frazy-lokalne)
3. [Konkurencja lokalna i regionalna](#3-konkurencja-lokalna-i-regionalna)
4. [Propozycje dla strony (bez wdrażania)](#4-propozycje-dla-strony-tylko-rekomendacje)
5. [Social media (FB/IG) i kalendarz na 4 tygodnie](#5-social-media-fbig)
6. [Płatna reklama — opcja](#6-płatna-reklama--opcja)
7. [Plan 30/60/90 dni](#7-plan-306090-dni)
8. [Decyzje do podjęcia](#8-decyzje-do-podjęcia)
9. [Źródła](#9-źródła)
10. [Załącznik A: podpowiedzi Google](#załącznik-a-podpowiedzi-google-21102026)

---

## 0. Punkt wyjścia (stan na 21.10.2026)

| Obszar | Co wiemy | Skąd |
| --- | --- | --- |
| Pracownia | Kilińskiego 12, 28-100 Busko-Zdrój; tradycja rodziny od 1890; Michał – czwarte pokolenie. Na nowej stronie: tel. 501 321 347, `kontakt@pznowak.pl`, pon.–pt. 8:00–16:00, sob. 10:00–16:00. | zlecenie; `cms/src/lib/site.ts` |
| Priorytety (Kamila, 21.10) | 1) sprzedaż kamieni szlachetnych w złocie (pierścionki, kolczyki), 2) reklama i docieranie do klientów; dalej obrączki, naprawy, zamówienia, sprzedaż na miejscu, skup złota. | zlecenie |
| Google Search Console | ok. 15 kliknięć z Google w 28 dni (wrzesień 2026) – punkt startowy. | zlecenie |
| Wizytówka Google | Istnieje; pracownia sygnalizuje, że wymaga poprawek. **Nie mieliśmy wglądu w panel**, dlatego lista kontrolna w rozdz. 1 ma kolumnę „stan” do uzupełnienia przez Kamilę. | zlecenie |
| Facebook | „Michał Nowak Pracownia Złotnicza”, ok. 1,5 tys. obserwujących, 8 opinii (100% poleca). W „Linkach” adres vercel.app zamiast pznowak.pl; widoczny e-mail `info@mkgold.pl`. Adres strony to `profile.php?id=…` (bez własnej nazwy). | zlecenie; [K1] |
| Instagram | `nowak_pracownia_zlotnicza`, opis: „Diamenty, kamienie szlachetne w złocie. Pracownia złotnicza z czteropokoleniową tradycją Busko-Zdrój ul Kilińskiego 12, wysyłka.” | [K2] |
| Obecna pznowak.pl | Tytuł „Pracownia Złotnicza Michał Nowak”, opis „Unikalna biżuteria tworzona z pasją. Pierścionki zaręczynowe, obrączki, biżuteria na zamówienie.” – bez nazwy miasta. | [K3] |
| Nowa strona (preview) | Podstrony: pierścionki, obrączki, na zamówienie, naprawy, realizacje, pracownia, kontakt, kreator. Ceny wciąż jako `[X] zł`, czasy napraw jako `[czas]`. Brak podstrony o skupie złota i o kamieniach szlachetnych. Brak danych strukturalnych, mapy witryny (`sitemap.xml`) i analityki. Są przekierowania starych adresów (`/katalog`, `/galeria`, `/o-nas`). Indeksowanie włączy się dopiero na produkcji. | kod w `cms/` |
| Przeprowadzka | Z home.pl, termin 21.11.2026. | zlecenie |
| Stare wpisy w katalogach | Targeo: „Mieczysław Nowak – Pracownia Złotnicza” [K4]; MisterWhat i Cylex: tel. 41 378 84 34 [K5][K6]. Na nowej stronie jest tylko 501 321 347. | [K4–K6] |

**Czego nie sprawdziliśmy:** pozycji w Mapach Google na miejscu w Busku (zależą od położenia osoby szukającej [S1]),
panelu wizytówki, statystyk FB/IG, wolumenów fraz. W repozytorium nie ma plików `docs/zlecenia/*-raport.md` ani
slajdów („Efekty w liczbach”), na które powołuje się zlecenie – plan odwołuje się do slajdu tylko z nazwy.

---

## 1. Wizytówka Google (Profil Firmy)

Google opiera wyniki lokalne głównie na trzech rzeczach: **trafności** (czy profil pasuje do zapytania),
**odległości** od szukającego i **rozpoznawalności** (m.in. linki do firmy, liczba i ocena opinii) [S1]. Na odległość
nie mamy wpływu. Na trafność i rozpoznawalność – tak: kompletny profil, zdjęcia i regularne opinie.

### 1.1 W pierwszej kolejności (tydzień 1)

1. **Dostęp.** Ustalić, kto jest właścicielem profilu. Docelowo: Michał i Kamila jako właściciele, Marcin jako
   menedżer. Statystyki są dostępne tylko dla zweryfikowanego profilu [S8].
2. **Nazwa, adres, telefon – tak samo wszędzie.** Nazwa w profilu ma być nazwą firmy z szyldu, bez dopisków typu
   „złotnik Busko” czy „obrączki”. Google zabrania dopisywania usług, lokalizacji i sloganów do nazwy, a naruszenie
   może skończyć się zawieszeniem profilu [S2]. Ta sama nazwa, ten sam telefon i e-mail na stronie, FB, IG i
   w katalogach (pkt 1.9).
3. **Godziny i godziny specjalne.** Sprawdzić zgodność ze stroną (pon.–pt. 8–16, sob. 10–16) i od razu wpisać
   godziny na najbliższe dni świąteczne: 11.11 (środa), 24–26.12 (czw.–sob.), 31.12, 1.01 i 6.01.2027. Google ma do
   tego osobne „niestandardowe godziny otwarcia” [S7].
4. **Kategorie** (pkt 1.2).
5. **10 prawdziwych zdjęć** (pkt 1.5).
6. **Link lub kod QR do opinii** z panelu i start proszenia o opinie (pkt 1.8) [S4].

### 1.2 Lista kontrolna

| Element | Co ustawić | Kto | Stan |
| --- | --- | --- | --- |
| Kategoria główna | Jedna, najlepiej opisująca firmę [S3]. Kandydaci: „Jubiler” albo „Złotnik” – **do decyzji** (pkt 8). Za „Jubiler” przemawia to, że podpowiedzi Google dla „jubiler busko” są wyraźnie bogatsze niż dla „złotnik busko” (zał. A) – to sygnał jakościowy, nie liczba. | Kamila + Michał | [ ] |
| Kategorie dodatkowe | Kilka z listy Google, bez osobnej kategorii dla każdego produktu [S3]. Kandydaci (polskie brzmienie wybrać z listy w panelu): złotnik / jubiler (ta, która nie jest główną), projektant biżuterii, naprawa biżuterii, skup złota, grawerowanie. Tylko te, które pracownia faktycznie świadczy. | Kamila | [ ] |
| Opis | Bez linków [S2]. Propozycja w pkt 1.3. | Kamila | [ ] |
| Usługi | Lista w pkt 1.4, z ceną „od”, gdy Michał ją zatwierdzi. | Kamila | [ ] |
| Produkty | W Polsce dodawanie produktów może wymagać połączenia systemu sprzedaży z Local Inventory [S7]. Jeśli panel na to nie pozwala, ofertę pokazujemy zdjęciami i wpisami. | Kamila | [ ] |
| Zdjęcia | Pkt 1.5. | Michał (robi), Kamila (wgrywa) | [ ] |
| Wpisy | Raz w tygodniu, pkt 1.6. | Kamila | [ ] |
| Atrybuty | Tylko prawdziwe (np. płatność kartą, dostępność dla wózków) [S1]. | Kamila | [ ] |
| Data otwarcia | Google pozwala ją podać i pokazuje, ile lat działa firma [S7]. Wpisanie 1890 dotyczy tradycji rodziny, a nie obecnej działalności – **do decyzji** (pkt 8). | Michał | [ ] |
| Strona WWW | `https://pznowak.pl/` (do 21.11 obecna strona, potem nowa pod tym samym adresem). | Marcin | [ ] |
| Telefon | Numer, który odbiera pracownia; dodatkowe numery można dodać [S2]. Decyzja o 41 378 84 34 (pkt 1.9). | Michał | [ ] |
| Opinie | Odpowiadać na każdą, pkt 1.8. | Kamila | [ ] |

### 1.3 Proponowany opis (do poprawy przez Michała)

> Rodzinna pracownia złotnicza w Busku-Zdroju. Prowadzi ją Michał Nowak, złotnik w czwartym pokoleniu – rodzina
> zajmuje się rzemiosłem od 1890 roku. Wykonujemy pierścionki z kamieniami szlachetnymi w złocie (szafiry, rubiny,
> szmaragdy, diamenty i inne kamienie), pierścionki zaręczynowe i obrączki na zamówienie – od rozmowy i projektu 3D
> po ręczną oprawę kamieni. Naprawiamy i przerabiamy biżuterię: zmiana rozmiaru, czyszczenie, nowe łapki, wymiana
> kamienia, łańcuszki, grawer. Na miejscu sklep z gotową biżuterią ze złota i srebra oraz skup złota.
> Zapraszamy na Kilińskiego 12.

Kamienie wymienione w opisie występują w katalogu nowej strony (`cms/src/lib/catalog.ts`). Skup złota zostawić
tylko, jeśli pracownia chce go promować (pkt 8).

### 1.4 Usługi do wpisania

Pierścionki z kamieniami szlachetnymi · Pierścionki zaręczynowe na zamówienie · Obrączki ślubne (płaskie,
półokrągłe, klasyczne) · Kolczyki złote z kamieniami · Zmiana rozmiaru pierścionka · Czyszczenie i polerowanie ·
Przegląd i naprawa oprawy · Wymiana lub dosadzenie kamienia · Naprawa łańcuszka i bransoletki · Grawer ·
Renowacja starej biżuterii · Przeróbka rodzinnego złota na nową biżuterię · Skup złota (jeśli tak zdecydujecie).

Nazwy usług pokrywają się z podstronami nowej strony (`/naprawy`, `/obraczki`, `/na-zamowienie`), dzięki czemu
profil i strona mówią to samo.

### 1.5 Zdjęcia – lista ujęć

Tylko prawdziwe zdjęcia z pracowni i własnych wyrobów. Bez wizualizacji z odlewni i bez zdjęć-koncepcji AI
z nowej strony (koncepcje zostały na stronie decyzją z 12.10, [DECYZJE-2026-10-12.md](../../cms/docs/parity-2026-10-09/DECYZJE-2026-10-12.md),
ale w Google i w reklamach klient zakłada, że widzi prawdziwe miejsce – to nasza rekomendacja, nie zasada Google).

1. Witryna i wejście od ulicy (żeby łatwo trafić).
2. Wnętrze sklepu i lada.
3. Michał przy stole złotniczym / przy mikroskopie.
4. 3–4 pierścionki z kamieniami **na dłoni**, w świetle dziennym.
5. Kolczyki z kamieniami (na uchu albo na tacce).
6. Para obrączek: płaskie i półokrągłe obok siebie.
7. Naprawa przed / po (np. zmiana rozmiaru, nowe łapki).
8. Zbliżenie kamienia w oprawie.
9. Archiwalne zdjęcie rodziny (te same, które są na stronie w „Pracowni”).
10. Michał i Kamila razem (jeśli chcą pokazać twarze).

Potem co miesiąc 2–4 nowe zdjęcia.

### 1.6 Wpisy w profilu

- Typy: aktualności, oferty, wydarzenia; można dodać zdjęcie, film i przycisk z linkiem [S6].
- Wpisy bez zakresu dat są archiwizowane po 6 miesiącach [S6] – dlatego raz w tygodniu.
- **Nie wpisywać numeru telefonu w treści** – wpis może zostać odrzucony [S6]. Zamiast tego przycisk „Zadzwoń”.
- Najprościej: ten sam materiał co na FB/IG (rozdz. 5), skrócony.

### 1.7 Pytania i odpowiedzi – funkcja wycofana

Zlecenie wymienia „pytania i odpowiedzi”, ale Google je wycofał: interfejs API wyłączono 3.11.2025, a w grudniu
2025 Google zapowiedział zastąpienie sekcji odpowiedziami generowanymi przez AI („Ask Maps”); według BrightLocal
w marcu 2026 Ask Maps działało tylko w USA i Indiach [S9]. Według tego samego źródła odpowiedzi AI korzystają
z informacji w profilu, opinii i strony firmy [S9]. Czy w polskim profilu pracowni zostały jeszcze stare pytania –
sprawdzić w panelu.

**Co zamiast tego:** pełny profil (pkt 1.2) i sekcje FAQ na stronie z uzupełnionymi odpowiedziami (dziś część
odpowiedzi to „[Do uzupełnienia…]”, np. o pochodzeniu kamieni w `/na-zamowienie`).

### 1.8 Opinie – jak prosić

**Wolno:** prosić każdego klienta, dać link albo kod QR z panelu [S4].
**Nie wolno** [S4][S5]:

- dawać nic w zamian (rabat, gratis) za opinię albo za zmianę/usunięcie negatywnej,
- prosić tylko zadowolonych klientów albo zniechęcać do negatywnych opinii,
- naciskać, żeby klient wystawił opinię na miejscu, w sklepie,
- podpowiadać, co ma się znaleźć w treści,
- wyznaczać pracownikom limit opinii do zebrania.

**Kiedy prosić:** przy odbiorze pierścionka, obrączek, naprawy – czyli wtedy, gdy klient jest zadowolony z gotowej
rzeczy. Tak samo każdego klienta, bez wybierania.

**Przy ladzie (Kamila / Michał):**
> „Jeśli będzie Pani/Pan miał chwilę w domu, bardzo nam pomoże krótka opinia w Google. Tu jest kod – wystarczy
> zeskanować telefonem.”

**SMS / Messenger dzień po odbiorze:**
> „Dzień dobry, tu Kamila z pracowni Michała Nowaka. Dziękujemy za odbiór [pierścionka/obrączek/naprawy]. Jeśli
> ma Pani/Pan chwilę, będziemy wdzięczni za kilka słów w Google: [link]. Pozdrawiamy, Kilińskiego 12.”

**Kartka przy kasie / w pudełku:** kod QR + „Twoja opinia pomaga nam, rodzinnej pracowni z Buska”.

**Odpowiadanie** – na każdą opinię, uprzejmie, bez reklamowania się; przy negatywnej zaproponować kontakt i nie
ujawniać danych klienta [S4]. Szablony:

- Pozytywna: „Dziękujemy, Pani Anno! Cieszymy się, że pierścionek z szafirem trafił w gust. Zapraszamy na
  czyszczenie i przegląd oprawy – w pracowni zrobimy to od ręki.”
- Negatywna: „Przykro nam, że naprawa nie spełniła oczekiwań. Prosimy o telefon do pracowni – chcemy to obejrzeć
  i wyjaśnić. Michał Nowak.”

Cel liczymy w **działaniu**, nie w liczbie opinii: „prosimy każdego klienta przy odbiorze”. Nie obiecujemy,
ile opinii przybędzie.

### 1.9 Spójność danych poza Google

Rozpoznawalność zależy też od tego, ile witryn wspomina firmę i linkuje do niej [S1]. Stare wpisy w katalogach
warto poprawić, żeby nie myliły klientów:

| Katalog | Co widać | Do poprawy |
| --- | --- | --- |
| Targeo [K4] | „Mieczysław Nowak – Pracownia Złotnicza”, Kilińskiego 12 | nazwa |
| MisterWhat [K5] | „Pracownia złotnicza”, tel. 41 378 84 34 | nazwa, telefon (jeśli nieaktualny) |
| Cylex [K6] | „Pracownia Złotnicza Michał Nowak”, tel. 41 378 84 34 | telefon (jeśli nieaktualny) |
| Facebook | link vercel.app, e-mail `info@mkgold.pl` | link → pznowak.pl, e-mail → @pznowak.pl |

Dodatkowo do sprawdzenia: Panorama Firm i pkt.pl (konkurencja jest tam obecna [K10][K11]) oraz lokalny portal
busko.com.pl, na którym ogłaszają się Złota Korona i Złoty Lombard [K9][K13]. Warunki tych serwisów nie zostały
sprawdzone.

---

## 2. Frazy lokalne

### 2.1 Metoda i ograniczenia

- **Brak wolumenów.** Nie mieliśmy dostępu do narzędzia mierzącego liczbę wyszukiwań. Każda ocena popytu poniżej to
  **szacunek jakościowy**.
- **Źródło sygnału:** podpowiedzi wyszukiwarki Google (autouzupełnianie), pobrane 21.10.2026 z ustawieniami języka
  i kraju na Polskę (surowe wyniki w załączniku A). Podpowiedź oznacza, że ktoś tak wpisuje; nie mówi, jak często.
- **Jak zdobyć prawdziwe liczby:**
  1. Planer słów kluczowych Google Ads – pokazuje prognozy miesięcznej liczby wyszukiwań i szacunkowe koszty;
     wymaga konta Google Ads z danymi rozliczeniowymi [S14].
  2. Search Console po przeprowadzce – raport zapytań pokaże, po jakich frazach ludzie faktycznie trafiają na
     pznowak.pl.
  3. Statystyki wizytówki – sekcja „Wyszukiwania” pokazuje hasła, po których znaleziono profil [S8].

### 2.2 Lista fraz

Priorytet: **A** – zacząć od tego, **B** – w drugiej kolejności, **C** – długoterminowo.

| Grupa | Fraza | Czego szuka człowiek | Sygnał z podpowiedzi (21.10) | Gdzie ją wykorzystać | Prio |
| --- | --- | --- | --- | --- | --- |
| Pracownia | jubiler Busko-Zdrój | sklep / pracownia w mieście | tak; obok podpowiedzi z nazwami konkurentów (Partyzantów, Rynek, Skorpion, PK, Verona, Cel-Art) | profil Google, tytuł strony głównej | A |
| Pracownia | złotnik Busko-Zdrój | złotnik, często do naprawy | tak, mniej podpowiedzi niż „jubiler” | profil, strona główna, `/naprawy` | A |
| Pracownia | pracownia złotnicza Busko | j.w. | „pracownia złotnicza” – podpowiedzi tylko z dużymi miastami | strona główna, `/pracownia` | B |
| Obrączki | obrączki Busko-Zdrój / obrączki ślubne Busko-Zdrój | zakup obrączek na miejscu | tak, obie formy | `/obraczki`, wpisy | A |
| Obrączki | obrączki ślubne Kielce | szerszy region | tak; pojawia się nazwa Salonu WIK | `/obraczki` (wzmianka o dojeździe z Kielc) | C |
| Obrączki | obrączki płaskie / półokrągłe / klasyczne | wybór kształtu | „obrączki płaskie” – wiele wariantów (fazowane, z frezem, „płaskie czy okrągłe”) | `/obraczki` – porównanie kształtów, posty | B |
| Kamienie | pierścionek zaręczynowy z szafirem / z rubinem / ze szmaragdem / z diamentem / z brylantem | konkretny kamień | wszystkie w podpowiedziach do „pierścionek zaręczynowy z…” | nowa sekcja/podstrona o kamieniach, `/pierscionki`, posty | A |
| Kamienie | pierścionek z kamieniem szlachetnym / naturalnym | kamień, nie tylko zaręczyny | tak | j.w. | A |
| Kamienie | kolczyki złote z szafirem / z brylantami / z diamentami | kolczyki z kamieniem | tak | posty, opis sklepu na miejscu | B |
| Kamienie | pierścionek zaręczynowy z diamentem laboratoryjnym | tańsza alternatywa | tak | FAQ – tylko jeśli pracownia je oferuje (dziś „[Do uzupełnienia]”) | C |
| Naprawy | naprawa biżuterii Busko | naprawa na miejscu | dla „naprawa biżuterii” podpowiedzi to duże miasta i Kielce, bez Buska – lokalnie fraza prawdopodobnie rzadka (szacunek) | `/naprawy`, profil (usługi) | A |
| Naprawy | zmiana rozmiaru pierścionka (cena) | konkretna usługa, pytanie o cenę | tak, w tym „cena” i „zaręczynowego” | `/naprawy` z ceną „od”, posty | A |
| Naprawy | złotnik Kielce naprawa | naprawa w regionie | tak | `/naprawy` (wzmianka o regionie) | C |
| Skup | skup złota Busko-Zdrój | sprzedaż złota | tak | nowa podstrona `/skup-zlota`, profil (kategoria/usługa) | A* |
| Skup | lombard Busko-Zdrój | lombard (konkurencja) | tak; nazwy lombardów i „opinie” | nie celujemy; to fraza konkurencji | – |
| Skup | skup złota Kielce (ceny) | region, porównanie cen | tak, w tym „ceny” i „najwyżej oceniane” | tylko pośrednio | C |

\* Skup złota – priorytet A tylko, jeśli pracownia zdecyduje, że chce go promować (pkt 8).

### 2.3 Miejscowości

- **Powiat buski:** Busko-Zdrój, Gnojno, Nowy Korczyn, Pacanów, Solec-Zdrój, Stopnica, Tuczępy, Wiślica [S19].
  Powiat liczył ok. 71,5 tys. mieszkańców (GUS, 30.06.2020, za [S19]).
- **Sąsiednie powiaty:** kazimierski, pińczowski, kielecki, staszowski, dąbrowski [S19] – w praktyce m.in.
  Kazimierza Wielka, Pińczów, Chmielnik, Staszów i Kielce.
- **Jak używać:** jedna sekcja „Dojazd / skąd przyjeżdżają klienci” na stronie kontaktu i naturalne wzmianki
  w opisach realizacji („obrączki dla pary z Pacanowa” – za zgodą klientów). **Nie tworzyć osobnych podstron dla
  każdej miejscowości**: wiele podobnych stron pod różne miasta Google zalicza do nadużyć („doorway”) [S12].

### 2.4 Wnioski

1. „Jubiler” to prawdopodobnie częstsze słowo niż „złotnik” w lokalnych wyszukiwaniach (szacunek jakościowy
   z podpowiedzi) – warto mieć oba w profilu i na stronie.
2. Ludzie pytają o **cenę** („zmiana rozmiaru pierścionka cena”, „skup złota kielce ceny”). Strona z cenami „od”
   lepiej odpowiada na takie pytania niż strona z `[X] zł`.
3. Frazy o kamieniach („z szafirem”, „ze szmaragdem”) to wyszukiwania ogólnopolskie, nie lokalne. Lokalnie
   wygrywa je profil Google i polecenia; na stronie trzeba mieć o nich treść, żeby Google w ogóle wiedział, że
   pracownia to robi.

---

## 3. Konkurencja lokalna i regionalna

Stan z 21.10.2026, na podstawie stron firm, katalogów i podpowiedzi Google. **Nie sprawdziliśmy kolejności
w Mapach** – patrz procedura w pkt 3.7.

### 3.1 Busko-Zdrój – jubilerzy

| Firma | Adres | Co komunikuje | Źródło |
| --- | --- | --- | --- |
| Jubiler Cel-Art | ul. Partyzantów 11 | Biżuteria złota i srebrna, obrączki na zamówienie, grawer laserowy, naprawy i czyszczenie, skup złota i srebra „od grama”. Strona z FAQ i godzinami (pon.–pt. 9:30–17:00, sob. 9:00–14:00), FB, Instagram. Na stronie nie znaleźliśmy informacji o własnej pracowni ani cen. | [K7][K8] |
| PK Salony Jubilerskie | Plac Zwycięstwa 8 (oraz Rynek 19, Miechów) | Obrączki, pierścionki zaręczynowe, biżuteria na komunię, grawer, naprawy; marki (Nomination, Qudo, Coeur de Lion). Tytuł strony zawiera „Jubiler Busko-Zdrój”. Sklep internetowy. Cen na stronie głównej nie podaje. | [K12] |
| Złota Korona Salon Jubilerski | ul. Wojska Polskiego 2a | Medaliki, łańcuszki, bransoletki, kolczyki, zestawy. FB z oceną 5,0 (8 opinii). Ogłasza promocje okolicznościowe w portalu busko.com.pl. | [K9] |
| Verona | Park Promyk, ul. Bohaterów Warszawy 118 | Salon sieci. | [K14] |
| Skorpion Gold | pl. Zwycięstwa 11/12 | Sklep jubilerski; czy to salon sieci Jubiler Skorpion – nie potwierdzono. | [K15] |
| „Jubiler-SAE” Adam Słabowski | pl. Zwycięstwa 19 | Wpis w Panoramie Firm. | [K10] |

Podpowiedzi Google dla „jubiler busko” zawierają nazwy: Partyzantów, Rynek, Skorpion, PK, Verona, Cel-Art (zał. A).
Oznacza to, że ludzie szukają tych firm po nazwie; nazwy pracowni Nowaka wśród podpowiedzi nie było.

### 3.2 Busko-Zdrój – skup złota i lombardy

| Firma | Adres | Co komunikuje | Źródło |
| --- | --- | --- | --- |
| Złoty Lombard | Plac Zwycięstwa 5 | Skup złota i srebra, pożyczki pod zastaw; ceny za gram na stronie nie znaleźliśmy. | [K13][K16] |
| Loombard | pl. Zwycięstwa 28 | Lombard; godziny wg katalogu: codziennie 8:00–21:00. | [K17][K18] |
| Jubiler Cel-Art | ul. Partyzantów 11 | Skup złota i srebra „od grama”. | [K8] |
| Extra Skup Złota | – | Ogólnopolska sieć ma podstronę „Skup Złota Busko-Zdrój”; czy ma punkt w Busku – nie sprawdzono. | [K19] |

### 3.3 Kielce i okolice

| Firma | Miejscowość | Co komunikuje | Źródło |
| --- | --- | --- | --- |
| Salon WIK | Kielce, ul. Witosa 103A | Obrączki ślubne z własnego warsztatu, projekty indywidualne, przerabianie złota. | [K20] |
| Złotnik Kielce – Paweł Hajdukiewicz | Kielce | Własna pracownia, wzory gotowe i na zamówienie, kamienie (brylanty, szmaragdy, szafiry, rubiny), naprawy „których inni nie chcą się podejmować”. Cen nie podaje. | [K21] |
| Pracownia Złotnicza Szczepanik | Kielce | „W Kielcach od 1982 roku”, usługi złotnicze, skup złomu złota i srebra. | [K22][K23] |
| Kowalski Janusz i Anna – salon złotniczo-jubilerski | Kielce, ul. Paderewskiego 48 | Obrączki na zamówienie, pierścionki zaręczynowe. | [K24] |
| Mosquito Pracownia Jubilerska | Pińczów | Indywidualne projekty, naprawy i renowacje, naturalne diamenty; aktywny Instagram. | [K25][K26] |
| „Kamea” Pracownia Złotnicza | Kazimierza Wielka | Wpis w Panoramie Firm. | [K27] |
| Sklep Jubilerski Złotnik Ciopińscy | Chmielnik | Biżuteria złota i srebrna, ślubna, upominki. | [K28] |

Podpowiedzi dla „złotnik kielce” zawierają siedem wariantów z nazwami ulic (zał. A) – w Kielcach widocznych
złotników jest wielu, więc walka o „złotnik Kielce” byłaby trudna (szacunek jakościowy).

### 3.4 Ogólnopolskie strony „pod miasto”

Sklepy internetowe i sieci tworzą podstrony pod konkretne miasta: „Jubiler Kielce” (Goldrun, Skorupski, Dom
Jubilerski A&A), „Jubiler Kazimierza Wielka” (Goldrun), „Skup Złota Busko-Zdrój” (Extra Skup Złota) [K19][K29][K30].
Oznacza to, że w zwykłych wynikach wyszukiwania lokalna pracownia konkuruje też z firmami spoza regionu. Przewagę
stacjonarnej pracowni daje przede wszystkim **profil w Mapach**, gdzie liczy się odległość od klienta [S1].

### 3.5 Czym wyróżnia się pracownia

To wyróżniki do komunikacji, a nie twierdzenia o rynku („jedyni”, „najlepsi” – tego nie piszemy, bo nie da się
tego udowodnić):

1. **Własna pracownia i ręczna robota w Busku.** W materiałach sprawdzonych konkurentów z Buska nie znaleźliśmy
   informacji o własnym warsztacie złotniczym (Cel-Art, PK Salony – [K7][K12]). Michał sam oprawia kamienie.
2. **Rodzinna historia od 1890 r.** – cztery pokolenia, archiwalne zdjęcia (już są na stronie).
3. **Kamienie szlachetne w złocie** – szafiry, rubiny, szmaragdy, tanzanity, morganity, diamenty w katalogu. Salony
   w Busku eksponują raczej gotową biżuterię i marki [K9][K12].
4. **Projekt i wycena przed pracą** (szkic, model 3D) oraz **kreator pierścionka online** na nowej stronie.
5. **Rodzinne złoto w nowej biżuterii** – przetopienie / wykorzystanie złota po bliskich (już opisane na stronie).

### 3.6 Czego brakuje względem konkurencji

- **Cen „od”** (konkurenci też ich zwykle nie podają – to szansa, żeby się wyróżnić).
- **Jasnej informacji o skupie złota** – Cel-Art pisze wprost „skupujemy od grama” [K8]; u nas nie ma tego
  na stronie.
- **FAQ z godzinami i dojazdem** – Cel-Art ma je na stronie oferty [K8]; nasza nowa strona ma FAQ, ale część
  odpowiedzi jest pusta.
- **Lokalnych ogłoszeń** – Złota Korona i Złoty Lombard są w busko.com.pl [K9][K13].

### 3.7 Jak sprawdzać widoczność w Mapach (raz w miesiącu, 10 minut)

Wyniki zależą od tego, gdzie stoi osoba szukająca [S1], dlatego robimy to zawsze tak samo:

1. Telefon, przeglądarka w trybie prywatnym, **w Busku** (np. w pracowni).
2. Wpisać kolejno: „jubiler Busko-Zdrój”, „złotnik Busko-Zdrój”, „obrączki Busko-Zdrój”, „naprawa biżuterii Busko”,
   „skup złota Busko-Zdrój”.
3. Zrobić zrzut ekranu mapy z wynikami i zapisać, na którym miejscu jest pracownia (albo „brak”).
4. Wpisać wynik do tabeli miesięcznej (pkt 6.5).

---

## 4. Propozycje dla strony (tylko rekomendacje)

Nic z tego nie zostało wdrożone. Kolumna „Zgoda” mówi, kto musi zatwierdzić przed wdrożeniem:
**M** – Michał, **K** – Kamila, **Mr** – Marcin.

### 4.1 Treści

| # | Rekomendacja | Po co | Zgoda | Prio |
| --- | --- | --- | --- | --- |
| T1 | **Uzupełnić ceny „od”** w miejscach z `[X] zł` (strona główna, `/obraczki`, `/na-zamowienie`) i czasy/ceny w `/naprawy`. | Ludzie szukają z „cena” (rozdz. 2); konkurencja cen nie podaje (rozdz. 3). | M, K | A |
| T2 | **Sekcja lub podstrona o kamieniach szlachetnych w złocie**: szafir, rubin, szmaragd, diament, tanzanit, morganit; jak dobieramy kamień, jakie parametry podajemy, skąd kamienie, certyfikaty; kolczyki z kamieniami. | Priorytet nr 1 pracowni; frazy „pierścionek zaręczynowy z szafirem…” (rozdz. 2). | M (treść o kamieniach, dostawcach, certyfikatach), K | A |
| T3 | **Podstrona `/skup-zlota`**: co skupujemy, jak wyceniamy (waga i próba przy kliencie), jakie dokumenty, możliwość zamiany starego złota na nową biżuterię. Bez haseł „najwyższe ceny”. | Fraza „skup złota Busko-Zdrój”; konkurencja pisze o skupie wprost [K8]. | M, K; formalności – księgowa (pkt 8) | A* |
| T4 | **Sekcja „Sklep na miejscu”**: łańcuszki, kolczyki, srebro, złoto, prezenty – ze zdjęciami prawdziwej witryny. Dziś jest tylko jedno zdanie w stopce. | Sprzedaż stacjonarna; okres przedświąteczny. | K | B |
| T5 | **`/obraczki`: kształty** (płaskie, półokrągłe, klasyczne) z porównaniem. Wzory Stelmach – **dopiero po pisemnej zgodzie** i bez ich zdjęć do czasu zgody. | Frazy „obrączki płaskie / czy okrągłe” (zał. A). | M, K; zgoda Stelmach | B |
| T6 | **Uzupełnić FAQ** (dziś m.in. „Skąd pochodzą kamienie? [Do uzupełnienia…]”). | Odpowiedzi AI w Google korzystają też z FAQ na stronie [S9]. | M | B |
| T7 | **Sekcja „Dojazd”** na `/kontakt`: parking, skąd przyjeżdżają klienci (powiat buski, Pińczów, Kielce). Bez osobnych stron dla miejscowości [S12]. | Frazy z miejscowościami (pkt 2.3). | K | C |

\* zależne od decyzji o promocji skupu.

### 4.2 Tytuły i opisy stron

Dziś tylko strona główna i kreator mają własny opis; pozostałe podstrony dziedziczą opis ogólny. Szablon tytułu
dokleja „— Michał Nowak”. Propozycje (opisy z cenami dopiero po uzupełnieniu T1):

| Strona | Tytuł (przed „— Michał Nowak”) | Opis |
| --- | --- | --- |
| `/` | Złotnik w Busku-Zdroju – pracownia rodzinna od 1890 | Pracownia złotnicza przy Kilińskiego 12 w Busku-Zdroju. Pierścionki z kamieniami szlachetnymi, obrączki, naprawy biżuterii. Pon.–pt. 8–16, sob. 10–16. |
| `/pierscionki` | Pierścionki z kamieniami szlachetnymi w złocie | Pierścionki z szafirem, rubinem, szmaragdem i diamentem z naszej pracowni. Zmienimy kamień, kolor złota lub rozmiar. Od [X] zł. |
| `/obraczki` | Obrączki ślubne – Busko-Zdrój | Obrączki płaskie, półokrągłe i klasyczne z żółtego, białego i różowego złota. Przymiarka i grawer w pracowni. Od [X] zł za parę. |
| `/na-zamowienie` | Pierścionek zaręczynowy na zamówienie | Rozmowa, szkic i model 3D, wycena przed rozpoczęciem pracy. Kamienie oprawiamy ręcznie w Busku-Zdroju. |
| `/naprawy` | Naprawa biżuterii i zmiana rozmiaru pierścionka | Zmiana rozmiaru, czyszczenie, nowe łapki, wymiana kamienia, łańcuszki, grawer. Wycena przy Tobie, Kilińskiego 12, Busko-Zdrój. |
| `/realizacje` | Realizacje pracowni – przed i po | Pierścionki, obrączki i naprawy wykonane w naszej pracowni w Busku-Zdroju. |
| `/pracownia` | Pracownia i historia rodziny Nowaków od 1890 | Cztery pokolenia złotników: od kuźni w Szańcu do stołu złotniczego w Busku-Zdroju. |
| `/kontakt` | Kontakt i dojazd – Kilińskiego 12, Busko-Zdrój | Umów wizytę w pracowni. Tel. 501 321 347. Pon.–pt. 8–16, sob. 10–16. |
| `/skup-zlota` (nowa) | Skup złota w Busku-Zdroju | Ważymy i sprawdzamy próbę przy Tobie. Możesz też zamienić stare złoto na nową biżuterię. |

### 4.3 Dane strukturalne (JewelryStore)

Google zaleca opisać firmę typem `LocalBusiness` w możliwie szczegółowym podtypie; wymagane są `name` i `address`,
zalecane m.in. `geo`, `openingHoursSpecification`, `telephone`, `url`, `priceRange` [S10]. Dla pracowni pasuje
`JewelryStore`. Szkic do wdrożenia po akceptacji (wartości w nawiasach do uzupełnienia):

```json
{
  "@context": "https://schema.org",
  "@type": "JewelryStore",
  "name": "[nazwa jak na szyldzie i w profilu Google]",
  "url": "https://pznowak.pl/",
  "telephone": "+48 501 321 347",
  "email": "kontakt@pznowak.pl",
  "image": ["https://pznowak.pl/[zdjęcie witryny lub pracowni].jpg"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Kilińskiego 12",
    "postalCode": "28-100",
    "addressLocality": "Busko-Zdrój",
    "addressRegion": "świętokrzyskie",
    "addressCountry": "PL"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "[z Map Google]", "longitude": "[z Map Google]" },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "16:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "16:00" }
  ],
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61568506251939",
    "https://www.instagram.com/nowak_pracownia_zlotnicza/"
  ]
}
```

**Nie dodawać ocen gwiazdkowych (`aggregateRating`) z opinii o samej pracowni.** Google nie pokazuje gwiazdek dla
opinii, które firma publikuje o sobie na własnej stronie („self-serving reviews”) [S11].

### 4.4 Technika (dla Marcina)

| # | Rekomendacja | Po co | Zgoda |
| --- | --- | --- | --- |
| W1 | Mapa witryny (`sitemap.xml`) i zgłoszenie jej w Search Console po przeprowadzce. Dziś jest tylko `robots`. | Szybsze poznanie nowych adresów przez Google. | Mr |
| W2 | `metadataBase`, adresy kanoniczne i obrazki Open Graph (podgląd linku na FB/Messengerze). | Ładny podgląd przy udostępnianiu postów. | Mr |
| W3 | Po 21.11 sprawdzić w Search Console, czy stare adresy (`/katalog`, `/katalog/:slug`, `/galeria`, `/o-nas`) przekierowują poprawnie – przekierowania już są w `cms/next.config.ts`. | Nie zgubić ruchu ze starej strony. | Mr |
| W4 | Prosta analityka, np. Vercel Web Analytics: bez plików cookie, dostępna we wszystkich planach, pokazuje m.in. odsyłające strony [S16]. Wymaga wzmianki w polityce prywatności (dziś „[wkrótce]”). | Wiedzieć, ile wejść daje FB, IG i wizytówka. | Mr, K |
| W5 | Opcjonalne pole „Skąd o nas wiesz?” w formularzu kontaktowym i w kreatorze. | Pomiar źródła zapytań. | Mr, K |
| W6 | Ujednolicić e-mail na @pznowak.pl wszędzie (strona ma `kontakt@pznowak.pl`, FB `info@mkgold.pl`). | Spójność danych (pkt 1.9). | K, Mr |

### 4.5 Opinie na stronie

Jeśli `/realizacje` będzie pokazywać opinie klientów, trzeba napisać, czy i jak pracownia sprawdza, że pochodzą od
prawdziwych klientów – UOKiK wymaga tej informacji od każdego przedsiębiorcy, który publikuje opinie na swojej
stronie [S17]. Najprościej: „Publikujemy wyłącznie opinie klientów, którzy odebrali u nas zamówienie lub naprawę,
za ich zgodą”.

### 4.6 Zdjęcia na stronie

- Zamieniać stopniowo zdjęcia-koncepcje AI na prawdziwe zdjęcia pracowni i wyrobów (otwarta decyzja z raportu
  parity, `cms/docs/parity-2026-10-09/RAPORT.md`).
- Zdjęć z odlewni Iza, Stelmach i modeli z CGTrader nie publikować bez zgody właściciela. Przed użyciem zdjęcia
  produktu z katalogu w reklamie upewnić się, że to zdjęcie własne.

---

## 5. Social media (FB/IG)

### 5.1 Poprawki na start (tydzień 1)

- FB → „Linki”: zamienić adres vercel.app na `https://pznowak.pl/`.
- FB → e-mail: `info@mkgold.pl` → adres @pznowak.pl (decyzja W6).
- FB → rozważyć własną nazwę strony zamiast `profile.php?id=…` (krótszy adres na wizytówki i kartki) – do decyzji.
- IG → w opisie dodać `pznowak.pl` i godziny; zostawić „Busko-Zdrój, ul. Kilińskiego 12”.
- Posty planować hurtem raz w tygodniu, np. w Meta Business Suite [S15a].

### 5.2 Formaty, które pasują do pracowni

Zlecenie wskazuje, że działają zdjęcie na dłoni i krótki film (statystyk FB/IG nie oglądaliśmy). Na tej podstawie:

1. **Zdjęcie na dłoni** w świetle dziennym – pierścionek, obrączki, kolczyki na uchu.
2. **Krótki film 10–20 s** – obrót pierścionka w świetle, oprawa kamienia pod mikroskopem, polerowanie (Michał
   nagrywa telefonem przy stole, Kamila montuje i opisuje).
3. **Przed / po** – naprawy (zmiana rozmiaru, nowe łapki, czyszczenie).
4. **Karuzela „jak powstaje”** – rozmowa, szkic, model 3D, oprawa, gotowy pierścionek.
5. **Historia rodziny** – zdjęcia archiwalne z 1890, 1955, 1985 i dziś (już są na stronie).

### 5.3 Kalendarz na 4 tygodnie (start 26.10.2026)

2–3 posty tygodniowo na FB i IG + 1 wpis w wizytówce Google (najlepszy post tygodnia).
Ceny `[X]` uzupełnia Michał – **postów z `[X]` nie publikujemy**.

| Tydzień | Wt | Czw | Sob | Wizytówka Google |
| --- | --- | --- | --- | --- |
| 1 (26.10–1.11) | Michał przy stole + archiwalne zdjęcie Wiktora z 1890 – „czwarte pokolenie” | Pierścionek z szafirem na dłoni, cena od [X] zł (szablon 1) | Film: oprawa kamienia pod mikroskopem | Aktualność: kim jesteśmy + zdjęcie pracowni |
| 2 (2.11–8.11) | Przed/po: zmiana rozmiaru, od [X] zł, [czas] (szablon 2) | Kolczyki złote z kamieniami – „na miejscu w sklepie” | Godziny 11.11 + skup złota „jak wyceniamy” (szablon 3, jeśli decyzja na tak) | Aktualność: godziny 11.11 |
| 3 (9.11–15.11) | Obrączki płaskie vs półokrągłe – karuzela, od [X] zł za parę (szablon 4) | Film: „z rodzinnego złota nowy pierścionek” | Podziękowanie za opinie + prośba o opinię (link) | Oferta/aktualność: obrączki |
| 4 (16.11–22.11) | Prezenty na święta: łańcuszki, kolczyki od [X] zł + godziny grudniowe | Kreator pierścionka online (`/kreator`) – po przeprowadzce | „Mamy nową stronę” – tylko jeśli przeprowadzka 21.11 się udała | Aktualność: nowa strona / prezenty |

### 5.4 Szablony podpisów

Każdy podpis: konkret → cena „od” → zaproszenie do kontaktu → link do pznowak.pl.

**Szablon 1 – pierścionek z kamieniem**
> Pierścionek z [szafirem ok. 0,5 ct] w [żółtym złocie 585]. Kamień Michał oprawił ręcznie w naszej pracowni.
> Cena od [X] zł – kamień i kolor złota dobierzemy do Twojego budżetu.
> Zadzwoń 501 321 347 albo zajrzyj: pznowak.pl/pierscionki
> 📍 Kilińskiego 12, Busko-Zdrój

**Szablon 2 – naprawa**
> Za ciasny albo za luźny pierścionek? Zmiana rozmiaru od [X] zł, zwykle [czas].
> Przynieś biżuterię w godzinach otwarcia – obejrzymy ją przy Tobie i powiemy, ile to kosztuje.
> Pon.–pt. 8–16, sob. 10–16 · pznowak.pl/naprawy

**Szablon 3 – skup złota** (tylko po decyzji i ustaleniu formalności)
> Skupujemy złoto. Ważymy i sprawdzamy próbę przy Tobie, wycenę dostajesz od razu.
> Możesz też zamienić stare złoto na nową biżuterię z naszej pracowni.
> [Potrzebne dokumenty: …] · Kilińskiego 12, Busko-Zdrój · tel. 501 321 347

**Szablon 4 – obrączki**
> Płaskie czy półokrągłe? Pokażemy obie na dłoni i dobierzemy szerokość.
> Obrączki od [X] zł za parę, grawer [w cenie / +X zł].
> Umów przymiarkę: pznowak.pl/kontakt

**Szablon 5 – historia**
> 1890 – Wiktor Nowak, kowal z Szańca, robi w rodzinie pierwsze projekty biżuterii. Dziś przy stole złotniczym
> siedzi Michał, czwarte pokolenie. Zapraszamy do pracowni przy Kilińskiego 12. pznowak.pl/pracownia

W wizytówce Google te same teksty **bez numeru telefonu** w treści (przycisk „Zadzwoń”) [S6].

### 5.5 Zasady

- Zdjęcie klienta lub jego dłoni – tylko za jego zgodą.
- Tylko własne zdjęcia własnych wyrobów; nic z odlewni Iza, Stelmach, CGTrader bez zgody właściciela.
- Bez „najlepsi”, „najtańsi”, „najwyższe ceny skupu”.
- Na wiadomości i komentarze odpowiadać tego samego dnia roboczego (cel organizacyjny, nie wymóg platformy).

---

## 6. Płatna reklama — opcja

### 6.1 Kiedy

Najpierw rzeczy bezpłatne: wizytówka, opinie, ceny na stronie, regularne posty. Reklamę płatną warto testować
**po przeprowadzce (21.11)**, kiedy reklama prowadzi na nową stronę z cenami. W dniach 1–30 budżet płatny: 0 zł.

### 6.2 Meta Ads (Facebook i Instagram)

- **Najprościej:** „promuj post” dla najlepszego posta tygodnia (Kamila, z telefonu).
- **Obszar:** Busko-Zdrój z promieniem dobranym na mapie w panelu tak, by objąć powiat buski. Kielce – osobny test
  dopiero, jeśli lokalny zadziała.
- **Dwie kampanie testowe po 2 tygodnie:**
  1. pierścionki i kolczyki z kamieniami (prezent, zaręczyny) – zdjęcie na dłoni / film,
  2. naprawy + sklep na miejscu (przed świętami) – przed/po, prezenty.
- **Budżet testowy: 15–20 zł dziennie → ok. 210–280 zł na 2 tygodnie, 300–600 zł miesięcznie** – **szacunek**.
  Uzasadnienie: obszar jest mały (powiat ok. 71,5 tys. mieszkańców [S19]), więc większy budżet raczej częściej
  pokazuje reklamę tym samym osobom, niż dociera do nowych. Meta wymaga minimalnego budżetu zależnego od kraju
  i celu kampanii; panel reklam ostrzega, gdy jest za niski [S15].

### 6.3 Google Ads

- **Kampania w sieci wyszukiwania** na wąskie frazy lokalne: „złotnik Busko”, „jubiler Busko”, „obrączki Busko”,
  „naprawa biżuterii Busko”, „skup złota Busko” (ostatnia – tylko po decyzji), obszar: powiat buski, kierowanie na
  osoby przebywające w obszarze. Rozszerzenie z numerem telefonu.
- **Przed startem:** Planer słów kluczowych – sprawdzić prognozy liczby wyszukiwań i kosztów [S14]. Jeśli liczby
  są znikome, nie uruchamiać.
- **Budżet: 10–20 zł dziennie.** Google może w danym dniu wydać do 2× średniego budżetu dziennego, ale w miesiącu
  nie więcej niż 30,4× [S13] → **maks. ok. 304–608 zł miesięcznie**. Przy niszowych frazach lokalnych budżet może
  nie zostać wydany w całości (szacunek).

### 6.4 Warianty do wyboru

| Wariant | Miesięcznie | Dla kogo |
| --- | --- | --- |
| 0 – bez płatnych | 0 zł | Jeśli pracownia najpierw chce zobaczyć efekt wizytówki i postów. |
| A – tylko Meta | 300–600 zł (szacunek) | Sprzedaż kamieni w złocie, prezenty – trzeba pokazać zdjęcie. |
| B – Meta + Google | 600–1200 zł (szacunek) | Gdy Planer potwierdzi, że lokalne frazy są wyszukiwane. |

### 6.5 Jak mierzyć – tabela miesięczna („Efekty w liczbach”)

Ta sama tabela co miesiąc, żeby slajd „Efekty w liczbach” miał ciąg dalszy. Wypełnia Marcin (dane online)
i Kamila (zeszyt przy ladzie).

| Wskaźnik | Źródło | Start | XI | XII | I |
| --- | --- | --- | --- | --- | --- |
| Kliknięcia z Google do strony (28 dni) | Search Console | ok. 15 (IX 2026) | | | |
| Wyświetlenia w Google (28 dni) | Search Console | do odczytu | | | |
| Wyświetlenia profilu | wizytówka – statystyki [S8] | do odczytu | | | |
| Połączenia z profilu | wizytówka [S8] | do odczytu | | | |
| Prośby o trasę dojazdu | wizytówka [S8] | do odczytu | | | |
| Kliknięcia w stronę z profilu | wizytówka [S8] | do odczytu | | | |
| Liczba opinii Google / średnia ocena | wizytówka | do odczytu | | | |
| Zgłoszenia z formularza i kreatora | panel strony (zgłoszenia) | 0 (wysyłka dopiero startuje) | | | |
| Telefony i wizyty „z internetu” | zeszyt przy ladzie: „Skąd Pan/Pani o nas wie?” | – | | | |
| Pozycja w Mapach (5 fraz) | ręczny test (pkt 3.7) | do odczytu | | | |
| Wydatki i wyniki reklam | Meta Ads / Google Ads | 0 zł | | | |

Uwaga: w listopadzie zmienia się strona (przeprowadzka), więc porównania listopad–wrzesień w Search Console trzeba
czytać ostrożnie.

### 6.6 Reguła decyzji po teście

Po 4 tygodniach reklamy: **koszt jednego zapytania** = wydatki ÷ liczba zapytań, które klienci przypisali reklamie
(zeszyt, formularz, połączenia z reklamy). Porównać z kwotą, jaką pracownia może wydać na zdobycie zapytania:
średni zysk z zamówienia × odsetek zapytań kończących się zakupem. Te dwie liczby zna tylko Michał – bez nich
decyzja „kontynuować / wyłączyć” będzie jakościowa.

---

## 7. Plan 30/60/90 dni

Start: poniedziałek 26.10.2026. Czas pracy to **szacunek**.

### Dni 1–30 (26.10–24.11) – fundamenty, bez płatnej reklamy

| Kamila (komunikacja, ok. 1–2 h/tydzień) | Michał (warsztat) | Marcin / pomocnicy |
| --- | --- | --- |
| Poprawki FB i IG (5.1). Wizytówka: godziny i godziny specjalne, kategorie, opis, usługi (1.1–1.4). Wgrać 10 zdjęć. Kod QR do opinii, kartka przy kasie, prośba przy każdym odbiorze. Posty wg kalendarza (5.3). Zeszyt „skąd o nas wiesz”. | Zrobić 10 zdjęć z listy 1.5 i 4 krótkie filmy. Zatwierdzić ceny „od” i czasy napraw (T1). Decyzje z pkt 8. Opis kamieni: dostawcy, certyfikaty (T2, T6). | Dostęp do wizytówki (właściciele/menedżer). Przeprowadzka 21.11 + sprawdzenie przekierowań (W3). Search Console dla nowej strony + mapa witryny (W1). Wpisanie danych startowych do tabeli 6.5. |

### Dni 31–60 (25.11–24.12) – sezon przedświąteczny

| Kamila | Michał | Marcin / pomocnicy |
| --- | --- | --- |
| Posty 2–3/tydz.: prezenty, kamienie, obrączki. Wpis w wizytówce co tydzień. Godziny świąteczne w profilu. Odpowiedzi na opinie. Jeśli wariant A/B: „promuj post” lub kampania Meta. | Materiał do postów: 2–4 zdjęcia i 2 filmy w miesiącu. Treść o skupie złota, jeśli decyzja na tak. | Wdrożenie zaakceptowanych rekomendacji: T1, T2, tytuły (4.2), dane strukturalne (4.3), analityka (W4). Poprawki w katalogach (1.9). Ewentualnie konfiguracja Google Ads po sprawdzeniu w Planerze. Tabela 6.5 za listopad. |

### Dni 61–90 (25.12–23.01.2027) – ocena i korekta

| Kamila | Michał | Marcin / pomocnicy |
| --- | --- | --- |
| Godziny 31.12, 1.01, 6.01. Podsumowanie zeszytu: skąd przyszli klienci. Posty: obrączki, pierścionki zaręczynowe, naprawy po świętach. | Decyzja: kontynuować reklamę czy nie (6.6). Kolejne realizacje do `/realizacje` (za zgodą klientów). | Tabela 6.5 za grudzień i styczeń, krótkie podsumowanie na slajd „Efekty w liczbach”. Wnioski z zapytań w Search Console → poprawki treści. Wdrożenie T3–T7 według decyzji. |

---

## 8. Decyzje do podjęcia

| # | Decyzja | Kto | Kiedy |
| --- | --- | --- | --- |
| D1 | Jedna nazwa firmy wszędzie (jak na szyldzie): „Michał Nowak Pracownia Złotnicza” czy „Pracownia Złotnicza Michał Nowak”? | Michał, Kamila | tydzień 1 |
| D2 | Kategoria główna w Google: „Jubiler” czy „Złotnik”? | Michał, Kamila | tydzień 1 |
| D3 | Telefony: czy 41 378 84 34 nadal działa? Jeśli nie – usunąć z katalogów. | Michał | tydzień 1 |
| D4 | E-mail: przejście z `info@mkgold.pl` na @pznowak.pl na FB i w Google. | Kamila, Marcin | tydzień 1–2 |
| D5 | Ceny „od” i czasy napraw do publikacji. | Michał | do 15.11 |
| D6 | Czy promować skup złota (strona, profil, posty)? Jeśli tak: zasady wyceny, wymagane dokumenty, formalności podatkowe – przy zakupie od osoby prywatnej powyżej 1000 zł może wystąpić 2% PCC po stronie kupującego (źródło branżowe [S18], **do potwierdzenia z księgową**). | Michał + księgowa | do 15.11 |
| D7 | Data otwarcia w profilu Google: 1890 (tradycja rodziny) czy data obecnej działalności? | Michał | tydzień 2 |
| D8 | Twarze Michała i Kamili na zdjęciach w profilu i w postach. | Michał, Kamila | tydzień 1 |
| D9 | Wariant płatnej reklamy (0 / A / B, pkt 6.4) od 25.11. | Michał, Kamila | do 20.11 |
| D10 | Wdrożenie rekomendacji strony (T1–T7, W1–W6) – które i w jakiej kolejności. | Marcin + Michał, Kamila | do 25.11 |
| D11 | Zdjęcia-koncepcje AI na stronie: zostają czy zamiana na prawdziwe? | Marcin, Michał, Kamila | do 24.12 |
| D12 | Wzory Stelmach: publikacja dopiero po pisemnej zgodzie (zgoda w toku). | Michał | po zgodzie |

---

## 9. Źródła

Wszystkie strony odczytane 21.10.2026.

**Zasady i narzędzia**

- [S1] Google, Profil Firmy – Poprawianie pozycji w lokalnych wynikach wyszukiwania:
  https://support.google.com/business/answer/7091?hl=pl
- [S2] Google, Profil Firmy – Wskazówki na temat umieszczania informacji o firmie w Google:
  https://support.google.com/business/answer/3038177?hl=pl
- [S3] Google, Profil Firmy – Zarządzanie kategorią działalności: https://support.google.com/business/answer/7249669?hl=pl
- [S4] Google, Profil Firmy – Wskazówki dotyczące uzyskiwania większej liczby opinii:
  https://support.google.com/business/answer/3474122?hl=pl
- [S5] Mapy Google – Treści zabronione i podlegające ograniczeniom (fałszywe zaangażowanie):
  https://support.google.com/contributionpolicy/answer/7400114?hl=pl
- [S6] Google, Profil Firmy – Tworzenie wpisów w profilu firmy: https://support.google.com/business/answer/7342169?hl=pl
- [S7] Google, Profil Firmy – Edytowanie profilu firmy (godziny niestandardowe, data otwarcia, produkty):
  https://support.google.com/business/answer/3039617?hl=pl
- [S8] Google, Profil Firmy – Informacje o skuteczności i statystykach profilu:
  https://support.google.com/business/answer/9918094?hl=pl
- [S9] BrightLocal, „A Guide to Google Business Profile Q&A” (aktualizacja 1.04.2026) – wycofanie Q&A, Ask Maps:
  https://www.brightlocal.com/learn/google-q-and-a/
- [S10] Google Search Central – Dane strukturalne LocalBusiness:
  https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=pl
- [S11] Google Search Central Blog, „Making Review Rich Results more helpful” (2019):
  https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful
- [S12] Google Search Central – Zasady dotyczące spamu (strony doorway):
  https://developers.google.com/search/docs/essentials/spam-policies?hl=pl
- [S13] Google Ads – Informacje o średnich budżetach dziennych: https://support.google.com/google-ads/answer/6385083?hl=pl
- [S14] Google Ads – Planer słów kluczowych: https://support.google.com/google-ads/answer/7337243?hl=pl
- [S15] Meta – Best practices for minimum budgets: https://www.facebook.com/business/help/203183363050448
- [S15a] Meta Business Suite: https://www.facebook.com/business/tools/meta-business-suite
- [S16] Vercel – Web Analytics: https://vercel.com/docs/analytics
- [S17] UOKiK – „Fałszywe opinie? Stop!”: https://uokik.gov.pl/falszywe-opinie-stop
- [S18] Mennica Krakowska, „Kupno złota a kwestie podatkowe – miniporadnik” (źródło branżowe, nie urzędowe):
  https://mennica-krakowska.pl/pl/blog/Kupno-zlota-a-kwestie-podatkowe-miniporadnik/31
- [S19] Wikipedia, „Powiat buski” (gminy, sąsiednie powiaty, liczba ludności wg GUS):
  https://pl.wikipedia.org/wiki/Powiat_buski
- [S20] Podpowiedzi wyszukiwarki Google (`suggestqueries.google.com`, `hl=pl`, `gl=pl`), pobrane 21.10.2026 – zał. A.

**Pracownia i konkurencja**

- [K1] Facebook – Michał Nowak Pracownia Złotnicza: https://www.facebook.com/p/Micha%C5%82-Nowak-Pracownia-Z%C5%82otnicza-61568506251939/
- [K2] Instagram – nowak_pracownia_zlotnicza: https://www.instagram.com/nowak_pracownia_zlotnicza/
- [K3] Obecna strona: https://pznowak.pl/
- [K4] Targeo – Mieczysław Nowak, Pracownia Złotnicza: https://mapa.targeo.pl/mieczyslaw-nowak-pracownia-zlotnicza-28-100-busko-zdroj~12227769/przedsiebiorstwo-firma/adres
- [K5] MisterWhat – Pracownia złotnicza, Busko-Zdrój: https://www.misterwhat.pl/company/663983-pracownia-zlotnicza-busko-zdroj
- [K6] Cylex – złotnik w Busku-Zdroju: https://www.cylex-polska.pl/busko-zdroj/z%C5%82otnik.html
- [K7] Jubiler Cel-Art – strona: https://www.jubilerbusko.pl/ ; Facebook: https://www.facebook.com/jubilerbusko/ ;
  Instagram: https://www.instagram.com/jubilercelart/
- [K8] Jubiler Cel-Art – Oferta i FAQ: https://www.jubilerbusko.pl/oferta/
- [K9] Złota Korona – Facebook: https://www.facebook.com/p/Z%C5%81OTA-Korona-Salon-Jubilerski-61568807352314/ ;
  ogłoszenie w busko.com.pl: https://busko.com.pl/salon-jubilerski-zlota-korona-wyjatkowe-miejsce-na-wyjatkowe-mikolajkowe-prezenty,0,3,1,1,1,40134,n.html
- [K10] Panorama Firm – „Jubiler-SAE” Adam Słabowski: https://panoramafirm.pl/%C5%9Bwi%C4%99tokrzyskie,buski,busko_zdr%C3%B3j,pl._zwyci%C4%99stwa,19/jubiler_sae_sklep_adam_slabowski-mewet_hjz.html
- [K11] pkt.pl – jubiler, Busko-Zdrój: https://www.pkt.pl/szukaj/jubiler/busko-zdr%C3%B3j
- [K12] PK Salony Jubilerskie: https://pksalonyjubilerskie.pl/
- [K13] busko.com.pl – Złoty Lombard: https://www.busko.com.pl/zloty-lombard-skup-zlota-pozyczki-pod-zastaw-busko-zdroj,60,4150,o.html
- [K14] Verona Park Promyk Busko-Zdrój: https://verona.pl/pages/verona-park-promyk-busko-zdroj
- [K15] MisterWhat – Skorpion Gold: https://www.misterwhat.pl/company/433390-skorpion-gold-sklep-jubilerski-busko-zdroj
- [K16] Złoty Lombard: https://zlotylombard.eu/
- [K17] Loombard Busko-Zdrój – Facebook: https://www.facebook.com/loombardbusko/
- [K18] Cityon – Loombard, pl. Zwycięstwa 28: https://cityon.pl/miejsce/loombard-plac-zwyciestwa-28-busko-zdroj
- [K19] Extra Skup Złota – Busko-Zdrój: https://www.extraskupzlota.pl/swietokrzyskie/skup-zlota-busko-zdroj.php
- [K20] Salon WIK, Kielce: https://www.jubilerwik.pl/
- [K21] Złotnik Kielce – Paweł Hajdukiewicz: https://zlotnik-kielce.eu/
- [K22] Pracownia Złotnicza Szczepanik – Instagram: https://www.instagram.com/szczepanik.gold/
- [K23] Pracownia Złotnicza Szczepanik – Facebook: https://www.facebook.com/szczepanik.gold/
- [K24] Panorama Firm – Kowalski Janusz i Anna: https://panoramafirm.pl/%C5%9Bwi%C4%99tokrzyskie,,kielce,paderewskiego,48/kowalski_janusz_i_anna._salon_zlotniczo_jubilerski-shbrfa_hjz.html
- [K25] Mosquito Pracownia Jubilerska – Instagram: https://www.instagram.com/mosquito.jewellery/
- [K26] Mosquito Pracownia Jubilerska – Facebook: https://www.facebook.com/p/Mosquito-Pracownia-Jubilerska-61586923996812/
- [K27] Panorama Firm – „Kamea” Pracownia Złotnicza: https://panoramafirm.pl/%C5%9Bwi%C4%99tokrzyskie,kazimierski,kazimierza_wielka,kolejowa,25_a(pawilon_hanlowy_paleo_2)/kamea_pracownia_zlotnicza_arkadiusz_piatek-aznxbn_hjz.html
- [K28] gdziewesele.pl – Sklep Jubilerski Złotnik Ciopińscy: https://www.gdziewesele.pl/bizuteria/sklep-jubilerski-zlotnik-ciopinscy ;
  GoWork (adres w Chmielniku): https://www.gowork.pl/sklep-jubilerski-zlotnik-aleksandra-ciopinska,24331951/dane-kontaktowe-firmy
- [K29] Goldrun – Jubiler Kielce: https://goldrun.pl/content/151-jubiler-kielce ; Jubiler Kazimierza Wielka:
  https://goldrun.pl/content/147-jubiler-kazimierza-wielka
- [K30] Skorupski – Jubiler Kielce: https://skorupski.com.pl/online/kielce/ ; Dom Jubilerski A&A – Jubiler Kielce:
  https://domjubilerski.aia.pl/tresc/58-jubiler-kielce

---

## Załącznik A: podpowiedzi Google (21.10.2026)

Wpisana fraza → podpowiedzi w kolejności zwróconej przez Google (`hl=pl`, `gl=pl`). Kolejność nie oznacza
popularności w liczbach.

| Wpisane | Podpowiedzi |
| --- | --- |
| złotnik busko | złotnik busko zdrój · zlotnik busko |
| jubiler busko | jubiler busko zdrój · jubiler busko · jubiler busko partyzantów · jubiler busko rynek · jubiler skorpion busko · pk jubiler busko · verona jubiler busko zdrój · jubiler cel art busko |
| obrączki busko | obrączki busko zdrój · obraczki busko · obrączki ślubne busko zdrój |
| skup złota busko | skup zlota busko zdroj · skup złota busko |
| lombard busko | lombard busko zdrój · lombard busko · lombard busko zdrój wojska polskiego · lombard busko-zdrój opinie · lombard busko zdrój zdjęcia · złoty lombard busko · złoty lombard busko zdrój zdjęcia · lombard loombard busko zdrój |
| złotnik kielce | złotnik kielce · złotnik kielce naprawa · złotnik kielce sienkiewicza · złotnik kielce staszica · złotnik kielce planty · złotnik kielce winnicka · złotnik kielce ul duża · zlotnik kielce duza · złotnik kielce wiśniowa · złotnik kielce leonarda |
| obrączki ślubne kielce | obrączki ślubne kielce · jubiler salon wik obrączki ślubne kielce |
| skup złota kielce | skup złota kielce · skup złota kielce sienkiewicza · skup złota kielce ceny · skup złota kielce najwyżej oceniane · skup złomu złota kielce · skup sprzedaż złota kielce · skup złota srebra kielce |
| naprawa biżuterii | naprawa biżuterii · … warszawa · wrocław · kraków · łódź · lublin · poznań · białystok · gdańsk · kielce |
| zmiana rozmiaru pierścionka | zmiana rozmiaru pierścionka · … apart · cena · warszawa · savicki · yes · zaręczynowego · w kruk · pandora · kraków |
| pracownia złotnicza | pracownia złotnicza · … syriusz · kraków · poznań · aleksy kacprzak · warszawa · bartosz wypchło jubiler kraków · wrocław · zdjęcia · aleksy kacprzak opinie |
| pierścionek zaręczynowy z | … z diamentem · złoty · z szafirem · z brylantem · z rubinem · ze szmaragdem · z białego złota · złoty z diamentem · z zielonym kamieniem · z diamentem laboratoryjnym |
| pierścionek z kamieniem | pierścionek z kamieniem · … księżycowym · naturalnym · szlachetnym · księżycowym srebrny · srebrny · księżycowym apart · niebieskim · piasek pustyni · stal chirurgiczna |
| kolczyki złote z | … z perłą · zapięcie angielskie · z cyrkoniami · z diamentami · ze stali chirurgicznej · z bursztynem · z szafirem · z koralem · z czarnym kamieniem · z brylantami |
| obrączki płaskie | obrączki płaskie · fazowane · z frezem · czy okrągłe · złote · z fazą · 585 · białe złoto · ścięte · płaskie obrączki ślubne |
