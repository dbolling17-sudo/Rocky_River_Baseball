import { getCollection } from 'astro:content';

/** Highlights from X, newest first. */
export async function getHighlights() {
  return (await getCollection('highlights'))
    .map((h) => h.data)
    .sort((a, b) => b.date.localeCompare(a.date));
}
