/**
 * Teksty stron, które można zmieniać w panelu (Strona → Teksty stron, src/globals/SiteContent.ts). Tu są wartości
 * domyślne: dokładnie te, które strona miała przed przeniesieniem do panelu. Strona używa ich, gdy pole w panelu jest
 * puste albo baza jest niedostępna, a skrypt `npm run tresci:przenies` wpisuje je do panelu jako punkt wyjścia.
 */

export type PageFaqItem = {
  question: string
  answer: string
  /** Znacznik „do uzupełnienia” widoczny tylko na podglądzie (staging, lokalnie), dopisany po odpowiedzi. */
  previewNote?: string
  /** Pytanie widoczne tylko na podglądzie (np. czeka na decyzję Michała). */
  previewOnly?: boolean
}

export const PAGE_TEXT_DEFAULTS = {
  home: {
    /** Gwiazdki: fragment w kursywie (druga linia nagłówka). */
    title: 'Rzemiosło, które docenisz. *Biżuteria, którą pokochasz.*',
    intro: 'Projektujemy i wykonujemy biżuterię na zamówienie w rodzinnej pracowni w Busku-Zdroju.',
  },
  catalog: {
    title: 'Pierścionki z pracowni',
    intro: 'Każdy projekt wykonamy w Twoim rozmiarze. Kamień i kolor złota możemy zmienić.',
    priceNote: 'Ostateczna cena zależy od wybranego kamienia i złota.',
    metaTitle: 'Pierścionki zaręczynowe z kamieniami szlachetnymi',
    metaDescription:
      'Pierścionki z szafirem, rubinem, szmaragdem i diamentem z naszej pracowni. Zmienimy kamień, kolor złota lub rozmiar.',
  },
  order: {
    title: 'Pierścionek na zamówienie',
    /** Treść potwierdzona przez Kamę 13.11.2026: klient może przyjść z własnym pomysłem, złotnik ocenia, co da się wykonać. */
    intro:
      'Zaczynamy od rozmowy o osobie, która będzie go nosić. Wybieramy model i kamień spośród fasonów dostępnych w pracowni albo tworzymy nowy projekt według Twojego pomysłu, szkicu lub zdjęcia. O ostatecznej wersji decydujemy razem, a złotnik mówi wprost, co da się wykonać. Pracę przy stole zaczynamy dopiero wtedy, gdy projekt i cena są dla Ciebie jasne.',
    priceNote: 'Cena zależy od kamieni i złota.',
    metaTitle: 'Pierścionek zaręczynowy na zamówienie',
    metaDescription: 'Rozmowa, szkic i wycena przed rozpoczęciem pracy. Kamienie oprawiamy ręcznie w Busku-Zdroju.',
    /**
     * Zamówienie spoza Buska, jedna ścieżka (Marcin 14.11.2026): telefon → rozmiar u jubilera w okolicy albo w pracowni →
     * przymiarka i odbiór w Busku albo wysyłka kurierem. Michał 14.11: zaliczka 30% (BLIK lub przelew), certyfikat dla
     * każdego pierścionka z kamieniami naturalnymi, zwykły kurier. Zwroty czekają na decyzję (tylko podgląd).
     */
    faq: [
      {
        question: 'Czy mogę zobaczyć pierścionek przed wykonaniem?',
        answer: 'Tak. Pokazujemy szkic albo zdjęcia podobnego wzoru. Zmieniamy go, dopóki proporcje nie będą takie, jak chcesz.',
      },
      {
        question: 'Czy mogę przyjść z własnym pomysłem?',
        answer:
          'Tak. Przynieś albo wyślij nam szkic, zdjęcie lub opis tego, co Ci się podoba. Złotnik oceni, co da się wykonać w złocie i z wybranym kamieniem, a jeśli jakiś element nie byłby trwały, zaproponuje bezpieczniejsze rozwiązanie.',
      },
      {
        question: 'Mieszkam daleko od Buska. Jak zamówić?',
        answer:
          'Zadzwoń albo napisz. Rozmawiamy przez telefon, a kamienie i projekty pokazujemy na zdjęciach i filmach. Rozmiar zmierzy każdy jubiler w Twojej okolicy, możesz też zmierzyć go u nas w pracowni. Gotowy pierścionek przymierzasz i odbierasz w Busku-Zdroju albo wysyłamy go kurierem.',
      },
      {
        question: 'Jak wygląda zaliczka i płatność?',
        answer:
          'Gdy zaakceptujesz projekt i wycenę, wpłacasz zaliczkę w wysokości 30% ceny, BLIK-iem albo przelewem. Wtedy zaczynamy pracę przy stole. Pozostałą kwotę rozliczamy przy odbiorze w pracowni albo przed wysyłką kurierem. Wszystkie kwoty znasz, zanim cokolwiek wpłacisz.',
      },
      {
        question: 'Jak wysyłacie biżuterię?',
        answer:
          'Kurierem, na adres, który podasz. Michał sam pakuje każdy pierścionek i pilnuje, żeby przesyłka dotarła do Ciebie szybko i bezpiecznie. Jeśli wolisz odebrać pierścionek osobiście, zapraszamy do pracowni w Busku-Zdroju: przymierzysz go na miejscu, a jeśli trzeba, poprawimy drobiazgi.',
      },
      {
        question: 'Czy mogę zwrócić pierścionek?',
        answer:
          'Pierścionek wykonany na zamówienie, według projektu i rozmiaru ustalonego z Tobą, nie podlega zwrotowi bez podania przyczyny. Wady wykonania możesz reklamować zgodnie z przepisami.',
        previewNote:
          '[ROZMIAR PO ODBIORZE: czy i na jakich warunkach poprawiamy rozmiar; czy pierścionek z kolekcji w standardowym rozmiarze można zwrócić]',
        previewOnly: true,
      },
      {
        question: 'Czy pierścionek ma certyfikat?',
        answer:
          'Tak. Każdy pierścionek z kamieniami naturalnymi dostajesz z certyfikatem, który potwierdza, że kamień jest naturalny. Certyfikat dołączamy do pierścionka przy odbiorze w pracowni albo w przesyłce. Warto go zachować: przyda się przy ubezpieczeniu biżuterii, przy wymianie lub naprawie oprawy i wtedy, gdy pierścionek przejdzie kiedyś na kolejne pokolenie.',
      },
    ] as PageFaqItem[],
  },
  bands: {
    title: 'Obrączki ślubne',
    intro:
      'Z naszych wzorów albo zaprojektowane dla Was dwojga. Mierzymy oboje, dobieramy szerokość i wykończenie, a w środku grawerujemy to, co ważne.',
    price: 'od 3500 zł za parę',
    priceNote: 'Cena zależy od szerokości i wagi. Obrączki wykonujemy ze złota próby 585.',
    metaTitle: 'Obrączki ślubne ze złota na zamówienie',
    metaDescription:
      'Klasyczne obrączki ślubne, płaskie i półokrągłe, z żółtego, białego i różowego złota. Przymiarka i grawer w pracowni.',
    faq: [
      {
        question: 'Kiedy przyjść na przymiarkę?',
        answer:
          'Najlepiej razem i z zapasem przed ślubem. Palce zmieniają się w ciągu dnia, dlatego mierzymy kilkoma obręczami.',
      },
      {
        question: 'Czy możemy użyć złota z rodzinnej biżuterii?',
        answer: 'Najczęściej tak. Najpierw sprawdzimy próbę i ilość złota, potem powiemy, ile trzeba dołożyć.',
      },
      {
        question: 'Co można wygrawerować?',
        answer: 'Datę, imiona albo krótki napis po wewnętrznej stronie. Ile znaków się zmieści, zależy od szerokości obrączki.',
      },
      {
        question: 'Czy obrączki mogą być różne?',
        answer: 'Tak. Często są tego samego wzoru, ale w innej szerokości, albo jedna ma kamień, a druga nie.',
      },
    ] as PageFaqItem[],
  },
  guides: {
    title: 'Poradniki pracowni',
    intro:
      'Odpowiedzi na pytania, które słyszymy w pracowni najczęściej. Bez żargonu, z liczbami i przykładami, tak żeby dało się podjąć decyzję jeszcze przed pierwszą rozmową.',
    metaTitle: 'Poradniki: rozmiar, kamienie i cena pierścionka',
    metaDescription:
      'Poradniki pracowni złotniczej z Buska-Zdroju: jak sprawdzić rozmiar pierścionka, jaki kamień wybrać i z czego składa się cena pierścionka na zamówienie.',
  },
  about: {
    title: 'Od kuźni w Szańcu do stołu złotniczego w Busku',
    intro:
      'Jesteśmy rodzinną pracownią z Buska-Zdroju. Rzemiosło przechodzi u nas z ojca na syna od 1920 roku. Łączymy klasyczny warsztat z nowoczesnym projektowaniem i każdą rzecz robimy dla konkretnej osoby.',
  },
}

export type PageTexts = typeof PAGE_TEXT_DEFAULTS
