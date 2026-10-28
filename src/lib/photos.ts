import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';

// Every photo lives under src/assets/photos/. Content files refer to photos by
// their path inside that folder, e.g. "2026/fall-workout-01.jpg". Astro then
// makes small, fast versions automatically when the site is built.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/photos/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
  { eager: true },
);

export function getPhoto(path: string): ImageMetadata {
  const key = `/src/assets/photos/${path.replace(/^\/+/, '')}`;
  const found = files[key];
  if (!found) {
    throw new Error(`Photo not found: src/assets/photos/${path}. Check the file name and folder.`);
  }
  return found.default;
}

export interface FeaturedPhoto {
  file: string;
  alt: string;
  album: string;
}

// Photos marked "featured: true" in src/data/albums.yaml, newest album first.
// An album's cover photo leads its group when it is also featured.
export async function getFeaturedPhotos(): Promise<FeaturedPhoto[]> {
  const albums = (await getCollection('albums'))
    .map((a) => a.data)
    .sort((a, b) => b.date.localeCompare(a.date));
  return albums.flatMap((album) =>
    album.photos
      .filter((p) => p.featured)
      .sort((a, b) => Number(b.file === album.cover) - Number(a.file === album.cover))
      .map((p) => ({ file: p.file, alt: p.alt, album: album.title })),
  );
}
