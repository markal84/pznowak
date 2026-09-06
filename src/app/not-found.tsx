import Link from 'next/link';
export default function NotFound(){return <section className="section wrap"><span className="eyebrow">Nie znaleziono strony</span><h1>Wróćmy do <em>inspiracji.</em></h1><p className="lead">Ten adres nie prowadzi do projektu w naszym katalogu.</p><Link className="button" style={{marginTop:30}} href="/katalog">Zobacz pierścionki ↗</Link></section>}
