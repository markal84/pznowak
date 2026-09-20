import collection from './catalog-snapshot.json';
export const products=collection.products;
export const gallery=collection.gallery;
export type Jewel=(typeof products)[number];
