<div align="center">

```
██╗███╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗██████╗ ███████╗███████╗
██║████╗  ██║████╗  ██║██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
██║██╔██╗ ██║██╔██╗ ██║██║   ██║██║   ██║█████╗  ██████╔╝███████╗█████╗
██║██║╚██╗██║██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝
██║██║ ╚████║██║ ╚████║╚██████╔╝ ╚████╔╝ ███████╗██║  ██║███████║███████╗
╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
```

**The evidence layer for early-career hiring.**

</div>

Résumés and slide decks don't prove anything. Innoverse runs a hiring pipeline where the proof is **merged code**: startups post real work, students ship it through GitHub pull requests, and every claim ends in a verifiable **Proof-of-Work Report** — not a certificate with nothing behind it.

## The loop

1. A startup posts a challenge. Innoverse creates a private GitHub repo and adds the approved student as a collaborator.
2. Work happens on GitHub. Innoverse provides PR review with inline comments, file/commit/diff views, approvals, reviewer requests, and live updates.
3. Milestones track delivery; only the startup that owns the challenge can manage or complete them.
4. At sign-off the startup scores a weighted rubric and writes a summary.
5. Innoverse snapshots the evidence from GitHub and issues a two-page PDF: the certificate, plus an evidence report with a **confidence score and its reasons**.
6. Anyone can open `/r/{token}` or scan the QR to audit the evidence — no account required. Certificates can be revoked, and the public page then says so.

**Universities** create a cohort with a join code; students enrol themselves, and the institution sees each member's reports, confidence, merged PRs, and cohort-wide participation — evidence that maps directly to accreditation and placement reporting.

**Paid engagements** turn a completed project into a transaction: the startup scopes milestones with amounts, the student accepts the IP-assignment terms, and acceptance generates a signed one-page agreement. Payments are recorded manually with a reference (no gateway yet) and confirmed by the student; the engagement closes when every milestone is confirmed.

## What makes the claim falsifiable

| Signal | Source |
|---|---|
| Merged pull requests by the student | GitHub API, captured at sign-off |
| Commit attribution (student vs others) | GitHub commits |
| Active days, lines added/removed | GitHub API |
| Review comments given | GitHub issue comments |
| Milestones completed | Innoverse database |
| Reviewer rubric (quality, delivery, communication, testing) | Startup, weighted |
| Confidence score 0–100 with printed reasons | Deterministic and explainable |

The evidence snapshot is frozen into the report. Later changes to the repo do not rewrite history.

## Security model

- **GitHub tokens are never sent to the browser.** They are encrypted at rest (AES-256-GCM) and resolved server-side per request. Repository operations prefer a **GitHub App installation token** (1-hour, repo-scoped) when configured; see `docs/github-app-setup.md`.
- **Object-level authorization in one place** (`lib/policy.ts`): only the challenge owner can review proposals, manage milestones, issue or revoke certificates.
- **Verified startups only** can post challenges or mint certificates (business-email domain validation; dev bypass is disabled in production builds).
- **Audit trail** of role selection, proposals, milestones, and certificate issue/revoke, viewable by the owner.
- **Input validation** with Zod on mutating routes; uploads are checked by magic bytes and HTML/SVG is rejected.
- **Private file storage:** proposals and branding assets are never served directly from storage. Downloads go through authorized routes (`/api/proposals/[id]/file`, `/api/branding/[kind]`); public certificates are served by verification code. The storage access mode is auto-detected or pinned with `BLOB_ACCESS`.
- **Rate limits** on authentication, uploads, proposals, certificates, and GitHub write actions.
- **Certificate integrity:** SHA-256 fingerprint stored, public revocation with reason.
- CI runs typecheck, unit tests, and a production build on every push.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · MongoDB/Mongoose · NextAuth (GitHub OAuth) · Tailwind · pdf-lib · Vercel Blob · Redis pub/sub + SSE · Vitest

```
apps/web          Next.js app (pages + API routes)
packages/database Mongoose models and connection
packages/types    Shared TypeScript contracts
```

## Run it

```bash
git clone https://github.com/arjunrhetoric/innoverse.git
cd innoverse
npm install
cp .env.example apps/web/.env.local   # fill in values
npm run dev                            # http://localhost:3000
```

Students and startups sign in with GitHub. Institutions use email + password
(scrypt-hashed, rate-limited) or can self-register at `/register/institution`.

Requires Node 18+, MongoDB, and a GitHub OAuth app whose callback is
`http://localhost:3000/api/auth/callback/github`.

Seed a demo dataset locally (development only):

```bash
curl -X POST http://localhost:3000/api/dev/seed
```

## Tests

```bash
npm test --workspace apps/web
npx tsc --noEmit -p apps/web
```

## Roadmap

- **Now:** challenge-based hiring (reports, talent directory, shortlist), university cohorts, and paid engagements — all built on the same evidence engine.
- **Next:** open-source issue workflows, AI repository knowledge base, and read-only GitHub access by default.
- **Later:** escrow with a payment provider, organizations with team roles, SSO for enterprise buyers.
- **Platform:** GitHub App short-lived per-repo tokens instead of the OAuth `repo` scope; see `docs/github-app-setup.md`.

## License

ISC · Built by [Arjun Singh](https://github.com/arjunrhetoric)
