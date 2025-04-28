// This file will contain functions for interacting with the WordPress REST API

// Base URL for the WordPress REST API
const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

// --- Type Definitions ---

// Basic structure for ACF fields (adjust based on actual field types)
interface ProductACF {
  product_gallery_1?: { url: string };
  product_gallery_2?: { url: string };
  product_gallery_3?: { url: string };
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
    sizes?: {
      medium?: { source_url: string };
      large?: { source_url: string };
      thumbnail?: { source_url: string };
      full?: { source_url: string };
      // Add other registered image sizes if needed
    };
  };
}

// Structure for the embedded data
interface ProductEmbedded {
  'wp:featuredmedia'?: WpFeaturedMedia[];
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
  // Add other standard WordPress fields if needed (date, status, etc.)
}

// --- API Fetching Functions ---

/**
 * Fetches a list of products from the WordPress REST API.
 * Assumes the CPT slug is 'pierscionki'. Change if necessary.
 */
export async function getProducts(): Promise<Product[]> {
  // !! Replace 'pierscionki' with your actual CPT slug if different !!
  const productSlug = 'ring';
  const endpoint = `${WP_API_URL}/${productSlug}?_embed`; // Using _embed to get featured image data

  try {
    const response = await fetch(endpoint, {
      // cache: 'no-store' // Uncomment for development to avoid caching
       next: { revalidate: 60 } // Revalidate data every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    const products: Product[] = await response.json();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    // In a real app, you might want to handle this error more gracefully
    return []; // Return empty array on error
  }
}

/**
 * Fetches a single product by its slug from the WordPress REST API.
 * Assumes the CPT slug is 'ring'. Change if necessary.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  // !! Replace 'ring' with your actual CPT slug if different !!
  const productSlug = 'ring';
  const endpoint = `${WP_API_URL}/${productSlug}?slug=${slug}&_embed`;

  try {
    const response = await fetch(endpoint, {
      // cache: 'no-store' // Uncomment for development
       next: { revalidate: 60 } // Revalidate data every 60 seconds
    });

    if (!response.ok) {
      // If status is 404, the product likely wasn't found by slug
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch product by slug ${slug}: ${response.status} ${response.statusText}`);
    }

    const products: Product[] = await response.json();

    // The API returns an array even when querying by slug, return the first item
    if (products.length > 0) {
      return products[0];
    } else {
      return null; // Product not found
    }
  } catch (error) {
    console.error(`Error fetching product by slug ${slug}:`, error);
    return null; // Return null on error
  }
}

// TODO: Add function to fetch a single product by slug or ID if needed