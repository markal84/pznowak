import Link from 'next/link'

export default function NotFoundContent() {
  return (
    <section className="wrap not-found">
      <h1 className="h1">Tej strony nie znaleźliśmy</h1>
      <p className="lead" style={{ maxWidth: '32em' }}>
        Ten adres nie prowadzi do żadnej strony pracowni. Wróć do pierścionków albo napisz, czego szukasz.
      </p>
      <div className="row gap-14-28">
        <Link className="btn" href="/pierscionki">Zobacz pierścionki</Link>
        <Link className="tl" href="/kontakt">Umów wizytę</Link>
      </div>
    </section>
  )
}
