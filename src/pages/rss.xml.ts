import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSortedArticles } from '../lib/articles';
import { renderArticleMarkdown } from '../lib/markdown';

export async function GET(context: APIContext) {
  const articles = await getSortedArticles();
  const siteUrl = (context.site ?? new URL('https://fromthecabinet.com')).toString().replace(/\/$/, '');

  return rss({
    title: 'From the Cabinet',
    description:
      'A living cabinet of essays, dialogues, and slow notes on philosophy, theology, and attention.',
    site: siteUrl,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    items: articles.map((article) => {
      const rendered = renderArticleMarkdown(article.body ?? '', {
        formatDialogue: article.data.isDialogue,
      });

      let fullHtml = rendered.en.html;
      if (rendered.en.references.length > 0) {
        const refsList = rendered.en.references
          .map((ref) => `<li id="ref-${ref.id}">${ref.html}</li>`)
          .join('');
        fullHtml += `<hr/><h3>References &amp; Notes</h3><ol>${refsList}</ol>`;
      }

      return {
        title: article.data.title,
        pubDate: article.data.date,
        description: article.data.summary || article.data.excerpt,
        link: `/writing/${article.id}/`,
        author: 'pacochp@gmail.com (Jakub Pacocha)',
        categories: article.data.tags,
        content: fullHtml,
      };
    }),
    customData: [
      '<language>en-us</language>',
      `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`,
    ].join(''),
  });
}
