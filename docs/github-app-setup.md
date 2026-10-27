# GitHub App setup

The app currently authenticates GitHub API calls with each user's OAuth token
(`repo` scope — full read/write to all their private repositories). The goal is
to move repository operations to a **GitHub App**, which issues short-lived
(1 hour) installation tokens scoped to only the repositories the app is
installed on.

The adapter in `apps/web/src/lib/github-app.ts` is already in the codebase and
dormant: until the environment variables below exist, every call falls back to
the user token, so nothing breaks.

## 1. Create the GitHub App

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**.

- **Name:** Innoverse (or your brand)
- **Homepage URL:** your site
- **Callback URL:** `https://<your-domain>/api/auth/callback/github`
  (keep the existing OAuth app for sign-in; the GitHub App is for repo access)
- **Webhook:** disable for now (we do not consume events yet)
- **Where can this app be installed?** Any account
- **Request user authorization (OAuth) during installation:** optional — not
  needed for the token model we use

### Repository permissions

| Permission | Access | Why |
|---|---|---|
| Metadata | Read | Required baseline |
| Contents | Read & write | README, file access |
| Pull requests | Read & write | Review, merge, close, inline comments |
| Issues | Read & write | PR conversation comments |
| Administration | Read & write | Add collaborators / create repos (phase 2) |

Leave everything else at "No access".

## 2. Generate credentials

- Note the **App ID**.
- **Generate a private key** (`.pem` download). Keep it out of git.
- Install the app on your account/org and select the repositories Innoverse
  should manage.

## 3. Configure the environment

In `.env.local` (and Vercel):

```env
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Vercel stores the key on one line — the adapter converts literal `\n` back to
newlines, so paste it with `\n` escapes.

## 4. Wiring (next step, done in code)

Repository routes will call:

```ts
const token = await getRepoToken(repoOwner, repoName, userToken);
```

- App installed on that repo → short-lived installation token.
- App not installed / not configured → the existing user token (fallback).

This lets us roll out per-repository without a flag day, and eventually reduce
the OAuth scope from `repo` to `read:user user:email` once all installations
are migrated.

## 5. Verification

- `GET /api/uploads/diagnose` style check is not needed; add a one-off
  `/api/github/app-status` route that reports:
  - `configured: true`
  - installation found for a given owner/repo
  - token acquired (never return the token itself)
