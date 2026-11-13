export interface GitHubProfileData {
  username: string;
  name: string;
  bio: string;
  repos?: number;
  followers?: number;
  months: string[];
  /** 14 weeks × 7 days (levels 0..4) */
  weeks: number[][];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildFallbackMonths(): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let offset = 3; offset >= 0; offset--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    labels.push(MONTH_NAMES[d.getUTCMonth()]);
  }
  return labels;
}

const FALLBACK_WEEKS: number[][] = [
  [0, 1, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 0, 0, 0, 0, 2, 0],
  [0, 0, 0, 3, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 2, 1, 0, 0, 0],
  [0, 1, 0, 0, 2, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 0],
  [0, 2, 3, 2, 0, 0, 3],
  [2, 3, 0, 1, 2, 3, 2],
  [4, 2, 3, 2, 3, 2, 1],
  [3, 1, 4, 2, 0, 2, 0],
  [3, 2, 3, 1, 2, 3, 0],
];

function parseContributionCalendar(html: string): { months: string[]; weeks: number[][] } | null {
  const cellRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"|data-level="([0-4])"[^>]*data-date="(\d{4}-\d{2}-\d{2})"/g;
  const cells: Array<{ date: string; level: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = cellRegex.exec(html)) !== null) {
    const date = m[1] || m[4];
    const level = Number(m[2] ?? m[3] ?? 0);
    if (date) cells.push({ date, level });
  }
  if (cells.length < 28) return null;

  cells.sort((a, b) => a.date.localeCompare(b.date));
  const recent = cells.slice(-98); // ~14 weeks × 7 days
  const weeks: number[][] = [];
  for (let i = 0; i < recent.length; i += 7) {
    const slice = recent.slice(i, i + 7).map((c) => c.level);
    while (slice.length < 7) slice.push(0);
    weeks.push(slice);
  }

  const seenMonths: string[] = [];
  for (const c of recent) {
    const monthIdx = Number(c.date.slice(5, 7)) - 1;
    const label = MONTH_NAMES[monthIdx];
    if (label && seenMonths[seenMonths.length - 1] !== label) {
      seenMonths.push(label);
    }
  }

  return {
    months: seenMonths.slice(-4),
    weeks: weeks.slice(-14),
  };
}

export async function loadGitHubProfile(username = 'JPacoch'): Promise<GitHubProfileData> {
  const base: GitHubProfileData = {
    username,
    name: 'Jakub Pacocha',
    bio: 'AI Engineer based in Bydgoszcz, Poland.',
    months: buildFallbackMonths(),
    weeks: FALLBACK_WEEKS,
  };

  try {
    const [userRes, contribRes] = await Promise.allSettled([
      fetch(`https://api.github.com/users/${username}`, {
        signal: AbortSignal.timeout(1600),
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'fromthecabinet-build' },
      }),
      fetch(`https://github.com/users/${username}/contributions`, {
        signal: AbortSignal.timeout(1600),
        headers: { 'User-Agent': 'fromthecabinet-build' },
      }),
    ]);

    if (userRes.status === 'fulfilled' && userRes.value.ok) {
      const json = (await userRes.value.json()) as {
        name?: string;
        bio?: string;
        public_repos?: number;
        followers?: number;
      };
      if (json.name) base.name = json.name;
      if (json.bio) base.bio = json.bio;
      if (typeof json.public_repos === 'number') base.repos = json.public_repos;
      if (typeof json.followers === 'number') base.followers = json.followers;
    }

    if (contribRes.status === 'fulfilled' && contribRes.value.ok) {
      const html = await contribRes.value.text();
      const parsed = parseContributionCalendar(html);
      if (parsed) {
        base.months = parsed.months;
        base.weeks = parsed.weeks;
      }
    }
  } catch {
    // Offline / sandboxed build fallback
  }

  return base;
}
