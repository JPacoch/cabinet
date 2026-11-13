import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

const SITE = 'https://fromthecabinet.com';

function loadArticleLastModMap() {
  const dir = path.resolve('src/content/articles');
  const map = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.mdx')) continue;
    const slug = file.replace(/\.mdx$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const match = raw.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m);
    if (match) {
      map.set(`${SITE}/writing/${slug}/`, new Date(`${match[1]}T00:00:00Z`).toISOString());
    }
  }
  return map;
}

const articleDates = loadArticleLastModMap();
const latestArticleDate = Array.from(articleDates.values()).sort().at(-1);

export default defineConfig({
  site: SITE,
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const articleLastMod = articleDates.get(item.url);
        if (articleLastMod) {
          return {
            ...item,
            lastmod: articleLastMod,
            changefreq: ChangeFreqEnum.MONTHLY,
            priority: 0.8,
          };
        }
        if (item.url === `${SITE}/`) {
          return {
            ...item,
            lastmod: latestArticleDate,
            changefreq: ChangeFreqEnum.WEEKLY,
            priority: 1.0,
          };
        }
        if (item.url === `${SITE}/writing/`) {
          return {
            ...item,
            lastmod: latestArticleDate,
            changefreq: ChangeFreqEnum.WEEKLY,
            priority: 0.9,
          };
        }
        if (item.url === `${SITE}/about/`) {
          return {
            ...item,
            changefreq: ChangeFreqEnum.MONTHLY,
            priority: 0.6,
          };
        }
        return {
          ...item,
          changefreq: ChangeFreqEnum.YEARLY,
          priority: 0.3,
        };
      },
    }),
  ],
  build: {
    format: 'directory',
  },
});
