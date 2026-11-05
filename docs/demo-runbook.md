# Innoverse demo runbook

Two accounts, one clean loop. This is the flow to rehearse before the demo.

## Accounts

| Role | GitHub | Innoverse |
|---|---|---|
| Startup | `@arjundsingh` | `founder@acmelabs.dev` (or GitHub sign-in) |
| Student | `@arjunrhetoric` | `arjun@student.dev` (or GitHub sign-in) |
| Institution | — | `coordinator@statetech.edu` |

Password for the dev credentials: `Innoverse2026`. Cohort code: `INNOV26`.

For anything touching a repository, **sign in with GitHub**, not the credentials form. The seed links the GitHub IDs to the same seeded users, so GitHub sign-in lands in the right workspace and stores a usable token. Credentials logins are UI-only and cannot send invites or change permissions.

## Before the demo

1. `POST /api/dev/seed?reset=1` (returns demo logins and the report token).
2. Check `GEMINI_API_KEY` is set for the knowledge base.
3. Use two browser profiles: startup as `@arjundsingh`, student as `@arjunrhetoric`.
4. Create the demo challenge **during rehearsal**, not on stage, so the public repo already exists.
5. Keep a seeded report open in a third tab for the verification moment.

## The 6-minute flow

### 1. Problem (30 sec)

Open the landing page. Say the line: **“Students can build. Hiring still can’t see it.”** Do not read the slide; tell the two-sided story.

### 2. Startup posts a challenge (45 sec)

Dashboard → **Post challenge**.

- Title: “Ship the CSV export for billing”
- Contribution type: **New project repo**
- Repository: **Create public repo** (default)
- Publish.

The repo is created under `@arjundsingh` and is public, so the student never needs write access.

> If you want to show a private repo, choose **Link existing repo** and use an organization-owned repo where `@arjundsingh` is an admin. Personal private repos are rejected on purpose: GitHub cannot grant read-only access there.

### 3. Student applies, startup approves (45 sec)

Student → Explore → open the challenge → submit a proposal with a short deck. Startup → proposal queue → **Approve**. Point out the draft agreement attached to the approval.

### 4. Student signs, access works (45 sec)

Student → **Sign agreement**. Because the repo is public, the agreement page should show **Access active** and **Open repository** immediately. No invitation, no 404.

If the repo was an organization-owned private repo, the app sends a **Read** invitation. The student accepts it and clicks **“I accepted — check access.”**

### 5. GitHub-native work (45 sec)

Open the repo and show the fork/PR model. In Innoverse, open the project → **Pull requests**. Show PR details, files, commits, and the review view. Emphasize: the student never gets write access to the main branch.

### 6. AI knowledge base (45 sec)

Project → **Knowledge**.

- Ask: **“Where is authentication enforced?”** or click a suggested prompt.
- Point out the grounded file count and clickable sources.
- Enter a PR number and run **Assess**. Show the verdict, risks, and the checklist.
- Open the history and expand a past review.

If the model is slow, keep the seeded history visible and narrate the verdict. Do not wait in silence.

### 7. Proof-of-Work Report (45 sec)

Open the seeded report from the dashboard. Show:

- merged PRs, commits, active days
- the founder rubric
- confidence + printed reasons
- QR / public verification

Open the public `/r/{token}` in a private window: no account needed. Then show revocation on the certificate page.

### 8. Escrow (45 sec)

Open **Engagements → Telemetry pipeline delivery**.

The seeded ledger shows **₹60,000 funded**, **₹45,000 released**, **₹15,000 unreleased**. The first two milestones are paid; the third is delivered.

- As startup, record a funding entry (if not fully funded) with a reference.
- Mark the delivered milestone paid; the release is drawn from the unreleased balance.
- As student, confirm receipt.
- If the engagement is completed or cancelled, show **Record return of balance**.

Say clearly: **Innoverse records the ledger; it does not move money yet.** A payment provider can replace the recording step without changing the release rules.

### 9. Institution (30 sec)

Institution dashboard → cohort `INNOV26`. Show members, their reports, confidence, merged PRs, and the export. This is the placement/accreditation view.

## Fallbacks

| If this fails | Do this |
|---|---|
| GitHub token expired | Sign out, sign in with GitHub again, retry. |
| Repo link 404s | Check the repo owner. Public repos work without invites; private repos must be organization-owned. |
| Invite stays pending | The student must accept it from GitHub notifications, then click “I accepted — check access.” |
| Gemini is slow/503 | Show the seeded history and narrate; the retry UI is honest. |
| PDF generation fails | Use the seeded report/agreement files; mention the generator is deterministic. |
| Live repo creation fails | Link an existing public repo instead; the rest of the loop is unchanged. |

## Do not claim

- Do not say Innoverse holds or moves money. It records an escrow ledger.
- Do not say personal private repos support read-only collaborators. They do not.
- Do not quote user numbers, revenue, or conversion. The product is pre-traction.
- Do not call the confidence score a guarantee; it is evidence with reasons.

## Reset after the demo

`POST /api/dev/seed?reset=1` restores the demo dataset. The old private repo, if any, is not touched by the reset.
