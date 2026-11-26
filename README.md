# From the Cabinet

**[fromthecabinet.com](https://fromthecabinet.com)** / [Writing](https://fromthecabinet.com/writing/) / [Quotes](https://quotes.fromthecabinet.com/) / [RSS](https://fromthecabinet.com/rss.xml)

---

**From the Cabinet** is an independent reading space and personal archive written by [Jakub Pacocha](https://fromthecabinet.com/about/). It gathers essays, philosophical dialogues and brief field notes on phenomenology, theology, technology and human condition and experience.

Every text is treated as a *finished draft* that can stay at a permanent address, carry its own message and be revisited over the years.

### Inside the Cabinet

- **Essays and Treatises** - longform arguments examining phenomenology, determinism, attention and ethics
- **Dialogues** - Philosophical conversations written in theatrical exchange
- **Notes** - Shorter reflections and sketches of thoughts
- **Quotes** - Collected  passages curated separately at [quotes.fromthecabinet.com](https://quotes.fromthecabinet.com/).

If you enjoy reading this way, you can follow new texts via [RSS](https://fromthecabinet.com/rss.xml) or write directly to [pacochp@gmail.com](mailto:pacochp@gmail.com).

---

<details>
<summary><strong>Notes on the engine</strong> - technical stack, writing workflow &amp; deployment</summary>

### Stack

- **Framework:** [Astro](https://astro.build/) (static site generation, View Transitions)
- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Content:** Pure `.mdx` files in `src/content/articles/` validated via `src/content.config.ts` and parsed via `src/lib/markdown.ts`
- **Typography & Styling:** `Geist Variable` (primary), `Instrument Sans Variable` (secondary metadata & labels), and `Geist Mono Variable` (code & citation indices) with semantic design tokens (`src/styles/tokens.css`, `global.css`, `typography.css`)
- **Hosting & CI:** Netlify (`netlify.toml`), rebuilding static HTML, RSS, and sitemaps automatically on push

### Local Development

```bash
bun install
bun --bun run dev      # Start local dev server (http://localhost:4321)
bun --bun run build    # Build production static site to dist/
bun --bun run preview  # Preview dist/ locally
```

Use `--bun` so Bun executes Astro on its own runtime rather than falling back to system `node` (Astro `7.4.x` requires Node `>=22.23.4`).

Optional environment variables (local `.env` or Netlify build settings) for the `/about/` social profile cards:
- `X_BEARER_TOKEN` - enables live X profile metadata via X API v2 (without it, X falls back to a minimal link card).
- `GITHUB_TOKEN` - raises GitHub API rate limits and enables the live 14-week contribution grid via GitHub GraphQL.
- Mastodon, Substack, and basic GitHub profile details load automatically with no tokens.

### Adding a New Piece

Create `src/content/articles/<slug>.mdx`:

```yaml
---
title: "Article Title"
type: "Essay" # Essay | Note | Dialogues from the Cabinet | Post
date: "2026-11-13"
readingTime: "6 min read"
excerpt: "One-sentence summary for the archive and search metadata."
tags: ["Philosophy", "2026"]
---
```

Optional frontmatter flags:
- `isDialogue: true` - styles `Speaker: speech` turns cleanly and supports `---lang:pl---` for bilingual EN/PL reading.
- `diagram: d2` - embeds the interactive pan/zoom diagram component (`InteractiveDiagram.astro`).
- Footnotes (`[^1]` inline, `[^1]: ...` at the bottom) automatically classify into *Citation*, *Commentary*, *Aside*, or *Note* popovers and endnotes.
- Headings (`##`, `###`) automatically populate the margin Table of Contents on articles with 2 or more sections.

### SEO, Dynamic OG Images, RSS & Sitemaps

RSS (`/rss.xml`), XML sitemaps (`/sitemap-index.xml`, `/sitemap-0.xml`, plus Netlify's `/sitemap.xml` rewrite), and `1200×630` Open Graph preview PNGs are generated strictly **at build time** (`bun --bun run build`) with zero client-side JavaScript required by crawlers:

- **Homepage & default social banner:** Generated at `/og/home.png` (`src/pages/og/home.png.ts`) with site-level branding, tagline, and canonical URL (`https://fromthecabinet.com/`).
- **Per-article social banners:** Generated automatically at `/og/writing/<slug>.png` (`src/pages/og/writing/[slug].png.ts`) using `satori` + `@resvg/resvg-js` (`src/lib/og.ts`) from each article's frontmatter (`title`, `summary`/`excerpt`, `type`, `readingTime`, `tags`, `date`). Missing optional fields are omitted gracefully and typography scales dynamically to avoid clipping.
- **Caching & refresh behavior:**
  - Each image's payload (metadata + template version) is SHA-256 hashed (`?v=<hash>`). Rendered PNGs are cached locally in `.astro/og-cache/` so unchanged articles are not re-rendered across builds.
  - Updating any article frontmatter changes its `?v=<hash>` query string in `og:image` and `twitter:image`, busting social platform CDN caches automatically on the next deploy while `/og/*` serves `Cache-Control: public, max-age=3600, must-revalidate` (`netlify.toml`).
- **404 & Sitemap hygiene:** The custom `404.html` page and `/og/*` endpoints are excluded from sitemaps, and `404.html` emits `noindex, follow` (both `<meta>` and `X-Robots-Tag`) with no canonical tag.

</details>

## License

- **Code** (site engine, components, styles): [MIT License](LICENSE)
- **Writing** (essays, dialogues, notes): [CC BY-NC-SA 4.0](LICENSE)
