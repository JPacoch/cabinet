import type { APIRoute } from 'astro';
import { renderHomeOgPng } from '../../lib/og';

export const prerender = true;

export const GET: APIRoute = async () => {
  const png = await renderHomeOgPng();
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
};
