import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { formatShortDate, normalizeTypeLabel, type ArticleEntry } from './articles';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_TEMPLATE_VERSION = 'v3';

const FRAME_SIZE = 10;
const INNER_W = OG_WIDTH - FRAME_SIZE * 2; // 1180
const INNER_H = OG_HEIGHT - FRAME_SIZE * 2; // 610
const CONTENT_W = 1012; // 84px left/right margin inside inner canvas
const CONTENT_H = 486; // 62px top/bottom margin inside inner canvas

const CACHE_DIR = path.resolve('.astro/og-cache');

const PALETTE = {
  bg: '#171614',
  frame: '#23211E',
  ink: '#ECE9E2',
  ink2: '#9B978E',
  muted: '#7B776F',
  rule: 'rgba(236, 233, 226, 0.32)',
  accent: '#E57389',
} as const;

export interface HomeOgPayload {
  brand: string;
  kicker: string;
  headline: string;
  description: string;
  footerLeft: string;
  footerRight: string;
}

export interface ArticleOgPayload {
  slug: string;
  title: string;
  summary?: string;
  type?: string;
  readingTime?: string;
  tags: string[];
  date?: string;
}

const HOME_OG_PAYLOAD: HomeOgPayload = {
  brand: 'From the Cabinet',
  kicker: 'archive & essays',
  headline: 'A living cabinet of essays, treatises and longform notes',
  description: 'Slow reading, careful arguments, field notes and reflective drafts.',
  footerLeft: 'essays / dialogues / notes',
  footerRight: 'fromthecabinet.com',
};

const memoryCache = new Map<string, Uint8Array>();
let cachedFonts: SatoriOptions['fonts'] | null = null;

function loadFonts(): SatoriOptions['fonts'] {
  if (cachedFonts) return cachedFonts;

  const readFont = (relPath: string) => fs.readFileSync(path.resolve('node_modules', relPath));

  cachedFonts = [
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-ext-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-500-normal.woff'),
      weight: 500,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-ext-500-normal.woff'),
      weight: 500,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: readFont('@fontsource/geist/files/geist-latin-ext-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'Instrument Sans',
      data: readFont('@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Instrument Sans',
      data: readFont('@fontsource/instrument-sans/files/instrument-sans-latin-ext-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Instrument Sans',
      data: readFont('@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff'),
      weight: 500,
      style: 'normal',
    },
    {
      name: 'Instrument Sans',
      data: readFont('@fontsource/instrument-sans/files/instrument-sans-latin-ext-500-normal.woff'),
      weight: 500,
      style: 'normal',
    },
  ];

  return cachedFonts;
}

function hashPayload(kind: string, payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ v: OG_TEMPLATE_VERSION, kind, payload }))
    .digest('hex')
    .slice(0, 10);
}

function cleanText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || undefined;
}

function clampWords(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.replace(/[,;:.\-\s]+$/, '')}…`;
}

function selectDisplayTags(rawTags: string[]): string[] {
  const cleaned = rawTags.map((t) => cleanText(t)).filter((t): t is string => Boolean(t));
  if (cleaned.length === 0) return [];
  const topicTags = cleaned.filter((t) => !/^\d{4}$/.test(t));
  const pool = topicTags.length > 0 ? topicTags : cleaned;
  return pool.slice(0, 3);
}

export function getArticleOgPayload(entry: ArticleEntry): ArticleOgPayload {
  const title = cleanText(entry.data.title) ?? 'From the Cabinet';
  const summary = cleanText(entry.data.summary) ?? cleanText(entry.data.excerpt);
  const rawType = cleanText(entry.data.type);
  const type = rawType ? normalizeTypeLabel(rawType) : undefined;
  const readingTime = cleanText(entry.data.readingTime);
  const tags = selectDisplayTags(Array.isArray(entry.data.tags) ? entry.data.tags : []);
  const date =
    entry.data.date instanceof Date && !Number.isNaN(entry.data.date.getTime())
      ? formatShortDate(entry.data.date)
      : undefined;

  return {
    slug: entry.id,
    title,
    summary,
    type,
    readingTime,
    tags,
    date,
  };
}

export function getHomeOgHash(): string {
  return hashPayload('home', HOME_OG_PAYLOAD);
}

export function getHomeOgPath(): string {
  return `/og/home.png?v=${getHomeOgHash()}`;
}

export function getArticleOgHash(entry: ArticleEntry): string {
  return hashPayload('article', getArticleOgPayload(entry));
}

export function getArticleOgPath(entry: ArticleEntry): string {
  return `/og/writing/${entry.id}.png?v=${getArticleOgHash(entry)}`;
}

export function getArticleOgAlt(entry: ArticleEntry): string {
  const payload = getArticleOgPayload(entry);
  return payload.type
    ? `${payload.title} — ${payload.type} on From the Cabinet`
    : `${payload.title} — From the Cabinet`;
}

// Minimal JSX-like element helper for Satori without needing React/JSX runtime
type SatoriNode =
  | string
  | {
      type: string;
      props: Record<string, unknown>;
    };

function h(
  type: string,
  style: Record<string, string | number>,
  ...children: Array<SatoriNode | false | null | undefined>
): SatoriNode {
  const filtered = children.filter(
    (c): c is SatoriNode => c !== false && c !== null && c !== undefined
  );
  return {
    type,
    props: {
      style,
      children: filtered.length === 1 ? filtered[0] : filtered,
    },
  };
}

function buildCanvas(...children: Array<SatoriNode | false | null | undefined>): SatoriNode {
  return h(
    'div',
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PALETTE.frame,
    },
    h(
      'div',
      {
        width: INNER_W,
        height: INNER_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PALETTE.bg,
      },
      h(
        'div',
        {
          width: CONTENT_W,
          height: CONTENT_H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'Geist',
          color: PALETTE.ink,
        },
        ...children
      )
    )
  );
}

function buildHomeTree(payload: HomeOgPayload): SatoriNode {
  return buildCanvas(
    // Top bar
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: CONTENT_W,
      },
      h(
        'div',
        {
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '-0.025em',
          color: PALETTE.ink,
        },
        payload.brand
      ),
      h(
        'div',
        {
          fontFamily: 'Instrument Sans',
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '0.09em',
          color: PALETTE.ink2,
        },
        payload.kicker
      )
    ),

    // Main center block
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: CONTENT_W,
      },
      h(
        'div',
        {
          fontSize: 54,
          fontWeight: 600,
          lineHeight: 1.09,
          letterSpacing: '-0.035em',
          color: PALETTE.ink,
          maxWidth: 920,
        },
        payload.headline
      ),
      h(
        'div',
        {
          marginTop: 22,
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1.45,
          letterSpacing: '-0.01em',
          color: PALETTE.ink2,
          maxWidth: 860,
        },
        payload.description
      )
    ),

    // Bottom divider + footer
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: CONTENT_W,
      },
      h('div', {
        width: CONTENT_W,
        height: 1,
        backgroundColor: PALETTE.rule,
        marginBottom: 24,
      }),
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: CONTENT_W,
        },
        h(
          'div',
          {
            fontFamily: 'Instrument Sans',
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: '0.08em',
            color: PALETTE.ink2,
          },
          payload.footerLeft
        ),
        h(
          'div',
          {
            fontFamily: 'Instrument Sans',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: PALETTE.muted,
          },
          payload.footerRight
        )
      )
    )
  );
}

function buildArticleTree(payload: ArticleOgPayload): SatoriNode {
  const safeTitle = clampWords(payload.title, 108);
  const titleLen = safeTitle.length;

  let titleFontSize = 58;
  let titleLineHeight = 1.07;
  let summaryMaxChars = 230;
  let summaryFontSize = 23;

  if (titleLen > 72) {
    titleFontSize = 38;
    titleLineHeight = 1.15;
    summaryMaxChars = 155;
    summaryFontSize = 21;
  } else if (titleLen > 46) {
    titleFontSize = 46;
    titleLineHeight = 1.11;
    summaryMaxChars = 190;
    summaryFontSize = 22;
  } else if (titleLen > 28) {
    titleFontSize = 52;
    titleLineHeight = 1.08;
    summaryMaxChars = 225;
    summaryFontSize = 23;
  }

  const safeSummary = payload.summary ? clampWords(payload.summary, summaryMaxChars) : undefined;

  const topRightParts = [payload.type, payload.readingTime].filter((v): v is string => Boolean(v));
  const hasTopRight = topRightParts.length > 0;

  const bottomLeftLabel = payload.tags.length > 0 ? payload.tags.join('  /  ') : undefined;
  const bottomRightParts = [payload.date, 'fromthecabinet.com'].filter((v): v is string =>
    Boolean(v)
  );
  const bottomRightLabel = bottomRightParts.join('  /  ');

  return buildCanvas(
    // Top bar: brand left, type / reading time right
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: CONTENT_W,
      },
      h(
        'div',
        {
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '-0.025em',
          color: PALETTE.ink,
        },
        'From the Cabinet'
      ),
      hasTopRight
        ? h(
            'div',
            {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              fontFamily: 'Instrument Sans',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: PALETTE.ink2,
            },
            payload.type ? h('span', { color: PALETTE.accent }, payload.type) : false,
            payload.type && payload.readingTime
              ? h('span', { marginLeft: 12, marginRight: 12, color: PALETTE.muted }, '/')
              : false,
            payload.readingTime ? h('span', { color: PALETTE.ink2 }, payload.readingTime) : false
          )
        : false
    ),

    // Main center block: title + summary
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: CONTENT_W,
      },
      h(
        'div',
        {
          fontSize: titleFontSize,
          fontWeight: 600,
          lineHeight: titleLineHeight,
          letterSpacing: '-0.035em',
          color: PALETTE.ink,
          maxWidth: 960,
        },
        safeTitle
      ),
      safeSummary
        ? h(
            'div',
            {
              marginTop: 22,
              fontSize: summaryFontSize,
              fontWeight: 400,
              lineHeight: 1.46,
              letterSpacing: '-0.01em',
              color: PALETTE.ink2,
              maxWidth: 940,
            },
            safeSummary
          )
        : false
    ),

    // Bottom hairline rule + tags / date + domain
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: CONTENT_W,
      },
      h('div', {
        width: CONTENT_W,
        height: 1,
        backgroundColor: PALETTE.rule,
        marginBottom: 24,
      }),
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: bottomLeftLabel ? 'space-between' : 'flex-end',
          width: CONTENT_W,
        },
        bottomLeftLabel
          ? h(
              'div',
              {
                fontFamily: 'Instrument Sans',
                fontSize: 18,
                fontWeight: 400,
                letterSpacing: '0.04em',
                color: PALETTE.ink2,
              },
              bottomLeftLabel
            )
          : false,
        h(
          'div',
          {
            fontFamily: 'Instrument Sans',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: PALETTE.muted,
          },
          bottomRightLabel
        )
      )
    )
  );
}

async function renderCachedPng(cacheKey: string, tree: SatoriNode): Promise<Uint8Array> {
  const memHit = memoryCache.get(cacheKey);
  if (memHit) return memHit;

  const diskPath = path.join(CACHE_DIR, `${cacheKey}.png`);
  try {
    if (fs.existsSync(diskPath)) {
      const bytes = new Uint8Array(fs.readFileSync(diskPath));
      memoryCache.set(cacheKey, bytes);
      return bytes;
    }
  } catch {
    // Ignore disk cache read errors and render fresh
  }

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: loadFonts(),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
  });
  const pngBytes = new Uint8Array(resvg.render().asPng());

  memoryCache.set(cacheKey, pngBytes);
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(diskPath, pngBytes);
  } catch {
    // Cache directory may be read-only in restricted environments
  }

  return pngBytes;
}

export async function renderHomeOgPng(): Promise<Uint8Array> {
  const hash = getHomeOgHash();
  return renderCachedPng(`home-${hash}`, buildHomeTree(HOME_OG_PAYLOAD));
}

export async function renderArticleOgPng(entry: ArticleEntry): Promise<Uint8Array> {
  const payload = getArticleOgPayload(entry);
  const hash = hashPayload('article', payload);
  return renderCachedPng(`article-${entry.id}-${hash}`, buildArticleTree(payload));
}
