import type {Metadata} from 'next';
import ApiCatalogTest from '@/components/ApiCatalogTest';

export const metadata: Metadata = {
  title: 'Test katalogu API',
  description: 'Niepodlinkowana strona sprawdzająca dynamiczne pobieranie produktów z niezależnego API.',
  robots: {index: false, follow: false},
};

export default function CatalogApiTestPage() {
  return (
    <>
      <section className="page-intro">
        <div className="wrap">
          <span className="eyebrow">Test techniczny</span>
          <h1>Katalog pobierany <em>na żywo.</em></h1>
          <p className="lead">Ta niepodlinkowana strona sprawdza, czy statyczna Astra potrafi wyświetlić produkty zwracane przez niezależny backend.</p>
        </div>
      </section>
      <ApiCatalogTest />
    </>
  );
}
