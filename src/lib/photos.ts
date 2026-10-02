import type { ImageMetadata } from 'astro';

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
