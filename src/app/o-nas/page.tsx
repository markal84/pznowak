import React from 'react'
// Placeholder for potential image imports

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-8 text-center">O Naszej Pracowni</h1>
      <div className="max-w-3xl mx-auto text-gray-700 leading-relaxed space-y-6">
        <p>
          Witaj w świecie, gdzie pasja do piękna spotyka się z mistrzowskim rzemiosłem. Nasza pracownia złotnicza to miejsce zrodzone z miłości do tworzenia wyjątkowej biżuterii, która opowiada historie i podkreśla indywidualność.
        </p>
        {/* Placeholder for an image */}
        <div className="w-full h-64 bg-gray-200 my-8 rounded flex items-center justify-center text-gray-500">Placeholder Obraz Pracowni</div>
        <p>
          Od lat specjalizujemy się w projektowaniu i ręcznym wykonywaniu pierścionków zaręczynowych, obrączek ślubnych oraz innej biżuterii na zamówienie. Każdy projekt traktujemy indywidualnie, wsłuchując się w potrzeby i marzenia naszych Klientów. Używamy tylko najwyższej jakości metali szlachetnych oraz starannie selekcjonowanych kamieni, gwarantując nie tylko piękno, ale i trwałość naszych wyrobów.
        </p>
        <p>
          Nasz zespół to doświadczeni złotnicy, dla których praca jest nie tylko zawodem, ale przede wszystkim pasją. Wierzymy, że biżuteria to coś więcej niż ozdoba – to symbol ważnych chwil, uczuć i wspomnień. Dlatego wkładamy całe serce w każdy detal, aby finalny produkt był perfekcyjny pod każdym względem.
        </p>
        <p>
          Zapraszamy do kontaktu i odwiedzenia naszej pracowni, aby osobiście poznać proces tworzenia i zobaczyć, jak powstaje biżuteria tworzona z myślą o Tobie.
        </p>
      </div>
    </div>
  )
}

export default AboutPage 