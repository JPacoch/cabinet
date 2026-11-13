# Security Policy

## Supported Versions

Because **From the Cabinet** is deployed continuously as a static site to production ([fromthecabinet.com](https://fromthecabinet.com)), only the latest version on the default production branch is actively supported and patched.

| Version | Supported |
| ------- | --------- |
| `2.0.x` (current production) | Yes |
| `< 2.0.0` (legacy static HTML) | No |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this repository or on the live website such as a Cross-Site Scripting (XSS) vector, insecure header or redirect behavior, supply-chain dependency issue or unintended data exposure - please report it **privately** rather than opening a public GitHub issue or pull request.

- **Email:** [pacochp@gmail.com](mailto:pacochp@gmail.com)
- **GitHub Private Vulnerability Reporting:** You may also submit a report via the **Security → Advisories → Report a vulnerability** tab.

Please include as much of the following as possible:

1. A clear description of the vulnerability and its potential impact.
2. Steps to reproduce, affected URL(s) or a minimal proof-of-concept.
3. Any suggested remediation or patch notes, if available.

### What to Expect

- **Acknowledgment:** Within **72 hours** of receiving your report.
- **Assessment & Updates:** Initial triage within **7 days**, with status updates as a fix is prepared.
- **Disclosure:** Please allow a reasonable window for a fix to be deployed before any public disclosure. Credit in the release notes will be given gladly if you wish.

---

## Scope & Architecture Notes

**From the Cabinet** is a static Astro site hosted on Netlify with no custom backend, user accounts or first-party database.

- **In Scope:**
  - Client-side scripts, HTML/MDX rendering, build outputs, and CSP/security header configuration (`netlify.toml`).
  - Dependencies defined in `package.json` / `bun.lock` that affect production builds or client assets.
  - Redirects, feeds (`/rss.xml`), and sitemap generation (`sitemap-index.xml`).

- **Out of Scope:**
  - Third-party platforms and infrastructure operated independently of this repository (e.g., Netlify hosting infrastructure, MailerLite newsletter endpoints, DNS providers, or linked external profiles).
  - Automated scanner noise lacking a demonstrable security impact (e.g., missing optional headers without an exploit path, rate-limiting on static assets, or social engineering).
  - Content typos or broken links (for those, feel free to open a normal issue or pull request per [CONTRIBUTING.md](CONTRIBUTING.md)).

---

## Security Practices

- The site serves `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` across all routes via `netlify.toml`.
- Build-time external fetches (such as GitHub profile metadata for `/about/`) run strictly during static site generation (`astro build`) with short timeouts and static fallbacks—never exposing credentials or executing live third-party fetches in visitor browsers.
- No tracking cookies or analytics scripts are used; newsletter subscriptions submit directly to MailerLite over HTTPS with explicit user consent.
