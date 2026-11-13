import { Marked } from 'marked';

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface CitationReference {
  id: string;
  html: string;
  occurrences: number;
}

export interface RenderedArticlePart {
  html: string;
  headings: TocHeading[];
  references: CitationReference[];
}

export interface RenderedArticle {
  isBilingual: boolean;
  en: RenderedArticlePart;
  pl?: RenderedArticlePart;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function renderPart(rawMarkdown: string, formatDialogue = false): RenderedArticlePart {
  // 1. Extract footnote/citation definitions: [^1]: ...
  const defMap = new Map<string, string>();
  const defRegex = /^\[\^(\d+)\]:\s*(.+)$/gm;
  let defMatch: RegExpExecArray | null;
  while ((defMatch = defRegex.exec(rawMarkdown)) !== null) {
    defMap.set(defMatch[1], defMatch[2].trim());
  }

  // Remove definition lines from body
  const cleanedMarkdown = rawMarkdown.replace(/^\[\^(\d+)\]:\s*.+$/gm, '').trim();

  // 2. Parse Markdown to HTML
  let html = marked.parse(cleanedMarkdown) as string;

  // 3. Format dialogue lines if enabled (e.g. "Alexander: Greetings...")
  if (formatDialogue) {
    html = html.replace(
      /<p>([A-ZÀ-Ž][a-zA-ZÀ-ž]*):\s*([\s\S]*?)<\/p>/g,
      (_m, speaker: string, speech: string) =>
        `<p class="dialogue-line"><span class="dialogue-speaker">${speaker}</span><span class="dialogue-speech">${speech.trim()}</span></p>`
    );
  }

  // 4. Extract headings (h2, h3) and inject deterministic IDs
  const headings: TocHeading[] = [];
  const usedIds = new Map<string, number>();

  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, levelStr: string, innerHtml: string) => {
    const level = Number(levelStr) as 2 | 3;
    const text = stripTags(innerHtml);
    let baseId = slugify(text) || `section-${headings.length + 1}`;
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    headings.push({ id, text, level });
    return `<h${level} id="${id}">${innerHtml}</h${level}>`;
  });

  // 5. Replace inline citations [^N] with accessible triggers
  const occurrenceCounts = new Map<string, number>();
  html = html.replace(/\[\^(\d+)\]/g, (match, num: string) => {
    if (!defMap.has(num)) {
      return match;
    }
    const occ = (occurrenceCounts.get(num) ?? 0) + 1;
    occurrenceCounts.set(num, occ);
    return (
      `<sup class="citation-ref" id="cite-${num}-${occ}">` +
      `<a href="#ref-${num}" class="citation-trigger" data-citation-trigger data-citation-id="${num}" data-citation-occ="${occ}" aria-label="Citation ${num}" aria-expanded="false">${num}</a>` +
      `</sup>`
    );
  });

  // 6. Build ordered references list (preserving all defined references)
  const references: CitationReference[] = [];
  const sortedKeys = Array.from(defMap.keys()).sort((a, b) => Number(a) - Number(b));
  for (const num of sortedKeys) {
    const rawDef = defMap.get(num)!;
    const renderedDef = marked.parseInline(rawDef) as string;
    references.push({
      id: num,
      html: renderedDef,
      occurrences: occurrenceCounts.get(num) ?? 0,
    });
  }

  return { html, headings, references };
}

export function renderArticleMarkdown(
  rawMarkdown: string,
  options: { formatDialogue?: boolean } = {}
): RenderedArticle {
  const separator = '---lang:pl---';
  if (rawMarkdown.includes(separator)) {
    const [enPart, ...rest] = rawMarkdown.split(separator);
    const plPart = rest.join(separator);
    return {
      isBilingual: true,
      en: renderPart(enPart, options.formatDialogue),
      pl: renderPart(plPart, options.formatDialogue),
    };
  }

  return {
    isBilingual: false,
    en: renderPart(rawMarkdown, options.formatDialogue),
  };
}
