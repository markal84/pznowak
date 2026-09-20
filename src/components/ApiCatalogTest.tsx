'use client';

import ArrowIcon from '@/components/ArrowIcon';
import Link from 'next/link';
import {useEffect, useState} from 'react';

const productsEndpoint = 'https://pznowak-catalog-api-test.vercel.app/products?limit=3';

type ApiProduct = {
  id: number;
  slug: string;
  name: string;
  lead: string;
  imagePath: string;
  metal: string;
  stone: string;
};

type ApiResponse = {
  products: ApiProduct[];
  meta: {
    available: number;
    count: number;
    randomized: boolean;
    source: string;
  };
};

async function requestProducts(signal?: AbortSignal) {
  const response = await fetch(productsEndpoint, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`API zwróciło status ${response.status}`);
  }

  const payload = await response.json() as ApiResponse;

  if (!Array.isArray(payload.products) || payload.products.length !== 3) {
    throw new Error('API zwróciło nieprawidłową liczbę produktów');
  }

  return payload;
}

export default function ApiCatalogTest() {
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    requestProducts(controller.signal)
      .then((data) => {
        setPayload(data);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Nie udało się pobrać produktów');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  async function refreshProducts() {
    setLoading(true);
    setError(null);

    try {
      setPayload(await requestProducts());
    } catch (requestError) {
      setPayload(null);
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się pobrać produktów');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="wrap api-test-panel" aria-live="polite" aria-busy="true">
        <div className="api-test-state">
          <span className="eyebrow">Łączenie z API</span>
          <h2>Pobieram trzy pierścionki…</h2>
          <p>Strona czeka na odpowiedź niezależnego backendu Vercel.</p>
        </div>
      </section>
    );
  }

  if (error || !payload) {
    return (
      <section className="wrap api-test-panel" aria-live="assertive">
        <div className="api-test-state api-test-error">
          <span className="eyebrow">Brak odpowiedzi</span>
          <h2>Nie udało się pobrać katalogu.</h2>
          <p>{error ?? 'Backend nie zwrócił danych.'}</p>
          <button className="button" type="button" onClick={refreshProducts}>Spróbuj ponownie</button>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap api-test-panel" aria-live="polite">
      <div className="api-test-toolbar">
        <div>
          <span className="eyebrow">Połączenie działa</span>
          <h2>Trzy produkty pobrane z API.</h2>
          <p>Zestaw jest losowany z {payload.meta.available} prawdziwych produktów testowych.</p>
        </div>
        <button className="button outline" type="button" onClick={refreshProducts}>Pobierz inne trzy</button>
      </div>

      <ul className="product-grid api-test-grid">
        {payload.products.map((product) => (
          <li className="product-card" key={product.id}>
            <Link href={`/katalog/${product.slug}/`}>
              <div className="photo">
                <img
                  src={product.imagePath}
                  alt={`Pierścionek ${product.name}`}
                  width="600"
                  height="600"
                />
                <span aria-hidden="true"><ArrowIcon /></span>
              </div>
              <div className="caption">
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.stone || 'Projekt pracowni'}{product.metal ? ` · ${product.metal}` : ''}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="api-test-note">Dane produktów pochodzą z Neon przez API, a zdjęcia są dostarczane z Vercel Blob CDN.</p>
    </section>
  );
}
