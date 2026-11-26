import type { APIRoute, GetStaticPaths } from 'astro';
import { getSortedArticles, type ArticleEntry } from '../../../lib/articles';
import { renderArticleOgPng } from '../../../lib/og';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const articles = await getSortedArticles();
  return articles.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const entry = props.entry as ArticleEntry;
  const png = await renderArticleOgPng(entry);
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
};
