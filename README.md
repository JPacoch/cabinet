# From the Cabinet

A living cabinet of essays, dialogues, and slow notes on philosophy, theology, and attention.

**https://fromthecabinet.com**

## Stack

- **Framework:** [Astro](https://astro.build/) (static output)
- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Content:** MDX files in `src/content/articles/` validated via Astro Content Collections (`src/content.config.ts`)
- **Styling:** Custom CSS with design tokens (`src/styles/tokens.css`, `global.css`, `typography.css`)
- **Hosting:** Netlify (`netlify.toml`)

## Development

```bash
# Install dependencies
bun install

# Start local development server
bun run dev

# Build static production site to dist/
bun run build

# Preview the production build locally
bun run preview
```

## Publishing a New Article

Create a new `.mdx` file in `src/content/articles/<slug>.mdx` with frontmatter:

```yaml
---
title: "Article Title"
type: "Essay" # Essay | Note | Dialogues from the Cabinet | Post
date: "2026-11-13"
readingTime: "6 min read"
excerpt: "One-sentence summary for the archive and metadata."
tags: ["Philosophy", "2026"]
---
```

Optional frontmatter flags:
- `isDialogue: true` — styles `Speaker: speech` paragraphs as editorial dialogue lines (and supports `---lang:pl---` for bilingual EN/PL switching).
- `diagram: d2` — embeds the interactive pan/zoom diagram viewer.

Citations use standard footnote syntax (`[^1]` inline and `[^1]: Reference text` at the bottom). Headings (`##`, `###`) automatically populate the animated Table of Contents when an article has 2 or more headings.

RSS (`/rss.xml`) and the XML sitemap (`/sitemap-index.xml`) are generated automatically during `bun run build`.

## License

- **Code** (infrastructure, CSS, and logic): [MIT License](LICENSE)
- **Content** (essays, dialogues, and prose): [CC BY-NC-SA 4.0](LICENSE)
