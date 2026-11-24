export type ProfileSourceStatus = 'live' | 'unavailable';

export interface GitHubContributionGrid {
  months: string[];
  /** Up to 14 weeks × 7 days (levels 0..4) */
  weeks: number[][];
  totalContributions?: number;
}

export interface GitHubProfileData {
  platform: 'github';
  status: ProfileSourceStatus;
  username: string;
  handle: string;
  url: string;
  displayUrl: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  location?: string;
  repos?: number;
  followers?: number;
  contributions?: GitHubContributionGrid;
}

export interface MastodonProfileData {
  platform: 'mastodon';
  status: ProfileSourceStatus;
  instance: string;
  username: string;
  handle: string;
  url: string;
  displayUrl: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  followers?: number;
  statuses?: number;
}

export interface SubstackProfileData {
  platform: 'substack';
  status: ProfileSourceStatus;
  handle: string;
  url: string;
  displayUrl: string;
  name?: string;
  publicationName?: string;
  avatarUrl?: string;
  bio?: string;
  postCount?: number;
  latestPostTitle?: string;
  latestPostDate?: string;
}

export interface XProfileData {
  platform: 'x';
  status: ProfileSourceStatus;
  username: string;
  handle: string;
  url: string;
  displayUrl: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  verifiedType?: 'blue' | 'business' | 'government' | 'none';
  followers?: number;
  posts?: number;
  oembedConfirmed?: boolean;
}

export interface SocialProfilesData {
  github: GitHubProfileData;
  mastodon: MastodonProfileData;
  substack: SubstackProfileData;
  x: XProfileData;
}

export interface SocialProfileHandles {
  github?: string;
  mastodon?: { username: string; instance: string };
  substack?: string;
  x?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const USER_AGENT = 'fromthecabinet-build (+https://fromthecabinet.com)';
const REQUEST_TIMEOUT_MS = 4000;

const GITHUB_LEVEL_MAP: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
}

function stripMastodonHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<span[^>]*class="[^"]*invisible[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function formatMonthYear(dateInput: string): string | undefined {
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return `${MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

function extractXmlTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  if (!match) return undefined;
  const cleaned = decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
}

function parseSubstackFeed(xml: string): {
  publicationName?: string;
  description?: string;
  postCount?: number;
  latestPostTitle?: string;
  latestPostDate?: string;
} {
  const channelHead = xml.split(/<item[\s>]/i)[0] ?? xml;
  const publicationName = extractXmlTag(channelHead, 'title');
  const rawDescription = extractXmlTag(channelHead, 'description');
  const description =
    rawDescription && rawDescription.toLowerCase() !== publicationName?.toLowerCase()
      ? rawDescription
      : undefined;

  const itemMatches = Array.from(xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi));
  const postCount = itemMatches.length > 0 ? itemMatches.length : undefined;
  const firstItem = itemMatches[0]?.[1];
  const latestPostTitle = firstItem ? extractXmlTag(firstItem, 'title') : undefined;
  const latestRawDate = firstItem ? extractXmlTag(firstItem, 'pubDate') : undefined;
  const latestPostDate = latestRawDate ? formatMonthYear(latestRawDate) : undefined;

  return {
    publicationName,
    description,
    postCount,
    latestPostTitle,
    latestPostDate,
  };
}

function readEnv(key: string): string | undefined {
  const val = process.env[key];
  return val && val.trim() ? val.trim() : undefined;
}

async function fetchGitHubContributionsGraphQL(
  username: string,
  token: string
): Promise<GitHubContributionGrid | undefined> {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });
    if (!res.ok) return undefined;

    const payload = (await res.json()) as {
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: {
              totalContributions?: number;
              weeks?: Array<{
                contributionDays?: Array<{ date: string; contributionLevel: string }>;
              }>;
            };
          };
        };
      };
    };

    const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
    const rawWeeks = calendar?.weeks;
    if (!rawWeeks || rawWeeks.length === 0) return undefined;

    const recentWeeks = rawWeeks.slice(-14);
    const weeks: number[][] = [];
    const seenMonths: string[] = [];

    for (const week of recentWeeks) {
      const days = week.contributionDays ?? [];
      const levels = days.map((d) => GITHUB_LEVEL_MAP[d.contributionLevel] ?? 0);
      while (levels.length < 7) levels.push(0);
      weeks.push(levels.slice(0, 7));

      for (const day of days) {
        const monthIdx = Number(day.date.slice(5, 7)) - 1;
        const label = MONTH_NAMES[monthIdx];
        if (label && seenMonths[seenMonths.length - 1] !== label) {
          seenMonths.push(label);
        }
      }
    }

    if (weeks.length === 0) return undefined;

    return {
      months: seenMonths.slice(-4),
      weeks,
      totalContributions:
        typeof calendar?.totalContributions === 'number' ? calendar.totalContributions : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function loadGitHubProfile(username = 'JPacoch'): Promise<GitHubProfileData> {
  const base: GitHubProfileData = {
    platform: 'github',
    status: 'unavailable',
    username,
    handle: username,
    url: `https://github.com/${username}`,
    displayUrl: `github.com/${username}`,
  };

  const token = readEnv('GITHUB_TOKEN');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const userPromise = fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers,
    });
    const contribPromise = token
      ? fetchGitHubContributionsGraphQL(username, token)
      : Promise.resolve(undefined);

    const [userRes, contributions] = await Promise.all([userPromise, contribPromise]);

    if (userRes.ok) {
      const json = (await userRes.json()) as {
        login?: string;
        name?: string | null;
        avatar_url?: string | null;
        bio?: string | null;
        company?: string | null;
        location?: string | null;
        html_url?: string | null;
        public_repos?: number;
        followers?: number;
      };

      const resolvedLogin = json.login || username;
      base.status = 'live';
      base.username = resolvedLogin;
      base.handle = resolvedLogin;
      base.url = json.html_url || `https://github.com/${resolvedLogin}`;
      base.displayUrl = `github.com/${resolvedLogin}`;
      if (json.name?.trim()) base.name = json.name.trim();
      if (json.avatar_url?.trim()) base.avatarUrl = json.avatar_url.trim();
      if (json.bio?.trim()) base.bio = json.bio.trim();
      if (json.company?.trim()) base.company = json.company.trim().replace(/^@/, '');
      if (json.location?.trim()) base.location = json.location.trim();
      if (typeof json.public_repos === 'number') base.repos = json.public_repos;
      if (typeof json.followers === 'number') base.followers = json.followers;
    }

    if (contributions) {
      base.contributions = contributions;
    }
  } catch {
    // Graceful fallback when offline, rate-limited, or timed out
  }

  return base;
}

export async function loadMastodonProfile(
  username = 'JakubPacocha',
  instance = 'mastodon.social'
): Promise<MastodonProfileData> {
  const base: MastodonProfileData = {
    platform: 'mastodon',
    status: 'unavailable',
    instance,
    username,
    handle: `@${username}@${instance}`,
    url: `https://${instance}/@${username}`,
    displayUrl: `${instance}/@${username}`,
  };

  try {
    const res = await fetch(
      `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      }
    );

    if (!res.ok) return base;

    const json = (await res.json()) as {
      username?: string;
      acct?: string;
      display_name?: string;
      note?: string;
      url?: string;
      avatar_static?: string;
      avatar?: string;
      followers_count?: number;
      statuses_count?: number;
    };

    const resolvedUsername = json.username || username;
    const acct = json.acct && json.acct.includes('@') ? `@${json.acct}` : `@${resolvedUsername}@${instance}`;
    const avatar = json.avatar_static || json.avatar;

    base.status = 'live';
    base.username = resolvedUsername;
    base.handle = acct;
    base.url = json.url || `https://${instance}/@${resolvedUsername}`;
    base.displayUrl = `${instance}/@${resolvedUsername}`;
    if (json.display_name?.trim()) base.name = json.display_name.trim();
    if (avatar && !avatar.endsWith('/missing.png')) base.avatarUrl = avatar;
    if (json.note) {
      const cleanedBio = stripMastodonHtml(json.note);
      if (cleanedBio) base.bio = cleanedBio;
    }
    if (typeof json.followers_count === 'number') base.followers = json.followers_count;
    if (typeof json.statuses_count === 'number') base.statuses = json.statuses_count;
  } catch {
    // Graceful fallback when offline, rate-limited, or timed out
  }

  return base;
}

export async function loadSubstackProfile(handle = 'jakubpacocha'): Promise<SubstackProfileData> {
  const base: SubstackProfileData = {
    platform: 'substack',
    status: 'unavailable',
    handle: `@${handle}`,
    url: `https://${handle}.substack.com/`,
    displayUrl: `${handle}.substack.com`,
  };

  try {
    const [feedRes, profileRes] = await Promise.allSettled([
      fetch(`https://${encodeURIComponent(handle)}.substack.com/feed`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': USER_AGENT,
        },
      }),
      fetch(`https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      }),
    ]);

    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
      const json = (await profileRes.value.json()) as {
        name?: string;
        handle?: string;
        photo_url?: string | null;
        bio?: string | null;
        publicationUsers?: Array<{
          is_primary?: boolean;
          publication?: {
            name?: string;
            subdomain?: string;
            custom_domain?: string | null;
            hero_text?: string | null;
            logo_url?: string | null;
          };
        }>;
      };

      const primaryPub =
        json.publicationUsers?.find((p) => p.is_primary)?.publication ??
        json.publicationUsers?.[0]?.publication;

      base.status = 'live';
      if (json.name?.trim()) base.name = json.name.trim();
      if (json.handle?.trim()) base.handle = `@${json.handle.trim()}`;
      if (json.photo_url?.trim()) {
        base.avatarUrl = json.photo_url.trim();
      } else if (primaryPub?.logo_url?.trim()) {
        base.avatarUrl = primaryPub.logo_url.trim();
      }
      if (json.bio?.trim()) {
        base.bio = json.bio.trim();
      } else if (primaryPub?.hero_text?.trim()) {
        base.bio = primaryPub.hero_text.trim();
      }
      if (primaryPub?.name?.trim()) base.publicationName = primaryPub.name.trim();
      if (primaryPub?.custom_domain?.trim()) {
        const domain = primaryPub.custom_domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        base.url = `https://${domain}/`;
        base.displayUrl = domain;
      } else if (primaryPub?.subdomain?.trim()) {
        const sub = primaryPub.subdomain.trim();
        base.url = `https://${sub}.substack.com/`;
        base.displayUrl = `${sub}.substack.com`;
      }
    }

    if (feedRes.status === 'fulfilled' && feedRes.value.ok) {
      const xml = await feedRes.value.text();
      const parsed = parseSubstackFeed(xml);
      base.status = 'live';
      if (!base.publicationName && parsed.publicationName) {
        base.publicationName = parsed.publicationName;
      }
      if (!base.name && parsed.publicationName) {
        base.name = parsed.publicationName;
      }
      if (!base.bio && parsed.description) {
        base.bio = parsed.description;
      }
      if (parsed.postCount !== undefined) base.postCount = parsed.postCount;
      if (parsed.latestPostTitle) base.latestPostTitle = parsed.latestPostTitle;
      if (parsed.latestPostDate) base.latestPostDate = parsed.latestPostDate;
    }
  } catch {
    // Graceful fallback when offline, rate-limited, or timed out
  }

  return base;
}

export async function loadXProfile(username = 'JakubPacocha'): Promise<XProfileData> {
  const base: XProfileData = {
    platform: 'x',
    status: 'unavailable',
    username,
    handle: `@${username}`,
    url: `https://x.com/${username}`,
    displayUrl: `x.com/${username}`,
  };

  const bearerToken = readEnv('X_BEARER_TOKEN');

  if (bearerToken) {
    try {
      const apiUrl =
        `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}` +
        '?user.fields=name,username,description,profile_image_url,public_metrics,verified,verified_type';
      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      });

      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            name?: string;
            username?: string;
            description?: string;
            profile_image_url?: string;
            verified?: boolean;
            verified_type?: 'blue' | 'business' | 'government' | 'none';
            public_metrics?: {
              followers_count?: number;
              tweet_count?: number;
            };
          };
        };

        const user = json.data;
        if (user) {
          const resolvedUsername = user.username || username;
          base.status = 'live';
          base.username = resolvedUsername;
          base.handle = `@${resolvedUsername}`;
          base.url = `https://x.com/${resolvedUsername}`;
          base.displayUrl = `x.com/${resolvedUsername}`;
          if (user.name?.trim()) base.name = user.name.trim();
          if (user.description?.trim()) base.bio = user.description.trim();
          if (user.profile_image_url?.trim()) {
            base.avatarUrl = user.profile_image_url.trim().replace('_normal.', '_200x200.');
          }
          if (user.verified_type && user.verified_type !== 'none') {
            base.verifiedType = user.verified_type;
          } else if (user.verified) {
            base.verifiedType = 'blue';
          }
          if (typeof user.public_metrics?.followers_count === 'number') {
            base.followers = user.public_metrics.followers_count;
          }
          if (typeof user.public_metrics?.tweet_count === 'number') {
            base.posts = user.public_metrics.tweet_count;
          }
          return base;
        }
      }
    } catch {
      // Fall through to official public oEmbed check
    }
  }

  // Without X_BEARER_TOKEN, X's public oEmbed endpoint only confirms the profile URL
  // and does not return display name, bio, avatar, or metrics.
  try {
    const res = await fetch(
      `https://publish.x.com/oembed?url=${encodeURIComponent(`https://x.com/${username}`)}`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      }
    );
    if (res.ok) {
      const json = (await res.json()) as { url?: string; provider_name?: string };
      if (json.url) {
        base.url = json.url;
        base.displayUrl = json.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }
      base.oembedConfirmed = json.provider_name === 'X' || json.provider_name === 'Twitter';
    }
  } catch {
    // Graceful minimal fallback
  }

  return base;
}

export async function loadSocialProfiles(
  handles: SocialProfileHandles = {}
): Promise<SocialProfilesData> {
  const [github, mastodon, substack, x] = await Promise.all([
    loadGitHubProfile(handles.github ?? 'JPacoch'),
    loadMastodonProfile(
      handles.mastodon?.username ?? 'JakubPacocha',
      handles.mastodon?.instance ?? 'mastodon.social'
    ),
    loadSubstackProfile(handles.substack ?? 'jakubpacocha'),
    loadXProfile(handles.x ?? 'JakubPacocha'),
  ]);

  return { github, mastodon, substack, x };
}
