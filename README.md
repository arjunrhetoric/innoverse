<div align="center">

```
██╗███╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗██████╗ ███████╗███████╗
██║████╗  ██║████╗  ██║██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝
██║██╔██╗ ██║██╔██╗ ██║██║   ██║██║   ██║█████╗  ██████╔╝███████╗█████╗
██║██║╚██╗██║██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝
██║██║ ╚████║██║ ╚████║╚██████╔╝ ╚████╔╝ ███████╗██║  ██║███████║███████╗
╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
```

### *Where ideas meet execution.*

</div>

## What is Innoverse?

**Innoverse** connects student developers with startup founders. Startups post real innovation challenges (backed by GitHub repos), students submit proposals, collaborate through pull requests with inline review, track milestones on live dashboards, and earn verifiable certificates on completion.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Monorepo | npm workspaces + Turborepo |
| Database | MongoDB + Mongoose (`packages/database`) |
| Shared types | TypeScript (`packages/types`) |
| Auth | NextAuth (GitHub OAuth) |
| Real-time | Server-Sent Events (`/api/events`) |
| Styling | Tailwind CSS + shadcn-style components |
| Certificates | Server-generated PDFs (`pdf-lib`) with QR verification |

## Project Structure

```
innoverse/
├── apps/web/                 → Next.js app (pages + API routes)
│   └── src/
│       ├── app/              → routes, incl. api/pr/*, milestones, certificates
│       ├── components/       → UI, incl. pr-review, certificate-section
│       └── lib/              → auth, api client, github, realtime, diff
├── packages/
│   ├── database/             → Mongoose models + connection
│   └── types/                → shared TypeScript types
├── turbo.json
└── .env.example              → required environment variables
```

## Getting Started

Prerequisites: Node.js v18+, MongoDB (local or Atlas), npm.

```bash
git clone https://github.com/arjunrhetoric/innoverse.git
cd innoverse
npm install
cp .env.example apps/web/.env.local   # then fill in values
npm run dev
# → http://localhost:3000
```

Create a GitHub OAuth app with authorization callback URL
`http://localhost:3000/api/auth/callback/github`.

## Scripts

```bash
npm run dev     # all workspaces (turbo)
npm run build   # production build
npm run lint    # eslint
```

## Environment

See `.env.example`. Never commit real secrets — `.env*` files are gitignored.

## Deploying to Vercel

1. Push to GitHub, then import the repo in Vercel with **Root Directory `apps/web`**.
2. Provision in Vercel Dashboard → Storage:
   - **Blob** → `BLOB_READ_WRITE_TOKEN` (proposal files, certificates, branding images)
   - **Upstash Redis / KV** → `REDIS_URL` (live updates across serverless instances)
3. Use a **MongoDB Atlas** URI for `MONGODB_URI` with network access `0.0.0.0/0`.
4. In your GitHub OAuth app, add the production callback
   `https://<your-domain>/api/auth/callback/github`.
5. Set `NEXTAUTH_URL=https://<your-domain>` and a generated `NEXTAUTH_SECRET`.
6. Notes: the SSE stream reconnects automatically (serverless caps each
   stream at ~60s); uploads require the Blob token since serverless
   filesystems are read-only.

## License

ISC · Built by [Arjun Singh](https://github.com/arjunrhetoric)
