// This file will contain functions for interacting with the WordPress REST API

// Base URL for the WordPress REST API
const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

// --- Type Definitions ---

// Basic structure for ACF fields (adjust based on actual field types)
interface ProductACF {
  product_gallery_1?: number | string; // Zaktualizowane na podstawie poprzednich dyskusji
  product_gallery_2?: number | string; // Zaktualizowane
  product_gallery_3?: number | string; // Zaktualizowane
  video?: number | string; // Dodane na podstawie poprzednich dyskusji
  czy_posiada_kamien?: boolean;
  rodzaj_kamienia?: string;
  kolor_metalu?: string;
  czystosc_kamienia?: string;
  masa_karatowa?: string;
  dodatkowe_informacje?: string;
  pielegnacja?: string;
  cena?: string;
  // Add other ACF fields here as needed
}

// Structure for embedded featured media
interface WpFeaturedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: {
    width?: number; // Dodaj width i height, jeśli API je zwraca
    height?: number; // na tym poziomie dla media_details
    sizes?: {
      thumbnail?: { source_url: string; width?: number; height?: number; };
      medium?: { source_url: string; width?: number; height?: number; };
      medium_large?: { source_url: string; width?: number; height?: number; }; // <-- DODANE TUTAJ
      large?: { source_url: string; width?: number; height?: number; };
      full?: { source_url: string; width?: number; height?: number; };
      // Możesz dodać inne standardowe rozmiary lub sygnaturę indeksu
      // [key: string]: { source_url: string; width?: number; height?: number; } | undefined;
    };
  };
  title?: { rendered: string }; // Często przydatne
  mime_type?: string; // Dodaj mime_type, jeśli API go zwraca
}

// Structure for the embedded data
interface ProductEmbedded {
  'wp:featuredmedia'?: WpFeaturedMedia[];
  // Możesz tu dodać inne osadzone relacje, np. 'author', 'wp:term' etc.
}

// Main interface for a Product post type
export interface Product {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  featured_media: number; // ID of the featured media
  acf: ProductACF; // ACF fields
  _embedded?: ProductEmbedded; // Embedded data (like featured image)
  date?: string;
  modified?: string;
  status?: string;
  // Add other standard WordPress fields if needed
}

// Main interface for a Page
export interface Page {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
}

// --- API Fetching Functions ---

/**
 * Fetches a list of products from the WordPress REST API.
 * Assumes the CPT slug is 'ring'. Change if necessary.
 */
export async function getProducts(): Promise<Product[]> {
  const productCptSlug = 'ring'; // Użyj poprawnej nazwy CPT
  if (!WP_API_URL) {
    console.error("WP_API_URL is not defined. Check your .env.local file.");
    return [];
  }
  const endpoint = `${WP_API_URL}/${productCptSlug}?_embed`;

  try {
    const response = await fetch(endpoint, {
       next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch products: ${response.status} ${response.statusText}`, await response.text());
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    const products: Product[] = await response.json();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/**
 * Fetches a single product by its slug from the WordPress REST API.
 * Assumes the CPT slug is 'ring'. Change if necessary.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const productCptSlug = 'ring'; // Użyj poprawnej nazwy CPT
  if (!WP_API_URL) {
    console.error("WP_API_URL is not defined. Check your .env.local file.");
    return null;
  }
  const endpoint = `${WP_API_URL}/${productCptSlug}?slug=${slug}&_embed`;

  try {
    const response = await fetch(endpoint, {
       next: { revalidate: 60 }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Product with slug "${slug}" not found (404).`);
        return null;
      }
      console.error(`Failed to fetch product by slug ${slug}: ${response.status} ${response.statusText}`, await response.text());
      throw new Error(`Failed to fetch product by slug ${slug}: ${response.status} ${response.statusText}`);
    }

    const products: Product[] = await response.json();

    if (products.length > 0) {
      return products[0];
    } else {
      console.warn(`Product with slug "${slug}" not found in the response array, though status was OK.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching product by slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetches a single page by its slug from the WordPress REST API.
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  if (!WP_API_URL) {
    console.error("WP_API_URL is not defined. Check your .env.local file.");
    return null;
  }
  const endpoint = `${WP_API_URL}/pages?slug=${slug}&_embed`;

  try {
    const response = await fetch(endpoint, {
       next: { revalidate: 60 }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Page with slug "${slug}" not found (404).`);
        return null;
      }
      console.error(`Failed to fetch page by slug ${slug}: ${response.status} ${response.statusText}`, await response.text());
      throw new Error(`Failed to fetch page by slug ${slug}: ${response.status} ${response.statusText}`);
    }

    const pages: Page[] = await response.json();

    if (pages.length > 0) {
      return pages[0];
    } else {
      console.warn(`Page with slug "${slug}" not found in the response array, though status was OK.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching page by slug ${slug}:`, error);
    return null;
  }
}
