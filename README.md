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

## License

ISC · Built by [Arjun Singh](https://github.com/arjunrhetoric)
