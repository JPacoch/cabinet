import { getCollection, type CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;

export async function getSortedArticles(): Promise<ArticleEntry[]> {
  const articles = await getCollection('articles');
  return articles.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
}

export function formatFullDate(date: Date): string {
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export function normalizeTypeLabel(type: string): string {
  if (type === 'Dialogues from the Cabinet') return 'Dialogue';
  if (type === 'Post') return 'Essay';
  return type;
}
