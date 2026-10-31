# Innoverse — First-Round PPT Content

**Deck title:** Innoverse — Proof, not promises.  
**Subtitle:** A hiring pipeline built on shipped work, not claims.  
**Format:** 7 content slides + optional cover/closing. 16:9. 5–7 minute pitch.  
**Design direction:** near-monochrome, one accent, generous whitespace, real product screenshots, one diagram per slide. No stock photos, no fake metrics, no testimonial quotes.

> **How this maps to the selection criteria**
>
> | Criterion | Where it is answered |
> |---|---|
> | Problem clarity and relevance | Slide 1 |
> | Solution and innovation | Slides 2 and 5 |
> | End-to-end flow | Slide 3 |
> | Technical depth and execution | Slide 4 |
> | Feasibility and competition | Slide 6 |
> | Research and validation | Slide 7 |
> | Demo readiness | Appendix + live product |

---

## Slide 1 — Problem Statement

### On-slide copy

**Headline:**  
**Students can build. Hiring still can’t see it.**

**Subhead:**  
Two applicants can look identical on paper. One has shipped a real feature. The other has only watched tutorials.

**Three-column pain map**

| Student | Startup | Institution |
|---|---|---|
| “I have projects, but no one can tell what I actually built or how I work in a team.” | “Every application has the same skills list. We don’t have time to audit every GitHub profile.” | “We can report grades and attendance, not what students actually shipped.” |
| Projects sit in GitHub, notebooks, or slide decks — with no context around ownership or scope. | A polished portfolio can hide who wrote the code, what broke, and how the person handled review. | Placement reports show activity. They don’t show proof of work. |

**A familiar scenario:**  
A second-year student has three real projects, applies to dozens of internships, and hears nothing. A founder has a stack of applications and no quick way to tell who can ship. Both sides lose.

**Bottom line:**  
So hiring falls back to resumes, referrals, and who interviews well. Ability gets filtered out before it gets tested.

**Visual:** Two identical resumes side by side. Behind one: a merged PR, a review thread, and a completed milestone. Behind the other: an empty outline. Let the contrast do the work.

### Speaker notes (30–35 sec)

> Picture a second-year student with three real projects. They apply to dozens of internships and hear nothing. On paper, they look the same as someone who only followed tutorials. On the other side, a founder gets a stack of applications and has no quick way to tell who has actually shipped something.
>
> Universities see grades and attendance, not the work. So everyone defaults to resumes, referrals, and interview performance. This isn’t a talent problem. It’s a visibility problem. [Optional: add your own 10-second example here — a student you know, a founder you spoke to, or your own experience.]

### Judge takeaway

The pain is concrete and three-sided: students can’t prove it, startups can’t see it, institutions can’t report it.

---

## Slide 2 — Solution

### On-slide copy

**Headline:**  
**Innoverse turns real startup work into proof you can check.**

**One-liner:**  
Startups post scoped work. Students ship it on GitHub. Innoverse captures what happened and turns it into a report anyone can verify.

**Four pillars**

1. **Real work, not practice tests**  
   Challenges come from startups, with real constraints and real review.

2. **GitHub-native proof**  
   Merged PRs, authored commits, active days, review threads, and milestones are captured from the source.

3. **Explainable report**  
   A weighted rubric plus a confidence score with printed reasons — not a black-box ranking.

4. **One shared record for three sides**  
   Students show what they built, startups hire with proof, institutions report outcomes.

**What is live today**

`Challenge marketplace` · `Proposals` · `Collaboration agreement` · `GitHub PR review` · `Milestones` · `Proof-of-Work Report` · `QR verification` · `Talent directory` · `Shortlist` · `Cohorts` · `Paid engagements`

**Core artifact:**  
**The Proof-of-Work Report.** The certificate is the display layer; the shipped work behind it is the product.

**Visual:** Product screenshot of the report preview, with callouts on “merged PRs”, “rubric”, “confidence + reasons”, and “QR verify”.

### Speaker notes (40–45 sec)

> Innoverse is not a course platform and not another profile. It sits between real work and hiring, and makes the work visible.
>
> A startup posts a scoped challenge. A student applies, gets approved, signs the collaboration and IP agreement, and works in a GitHub repository through forks and pull requests. Innoverse reviews the work, tracks milestones, and at sign-off snapshots the evidence: merged PRs, commit attribution, active days, review comments, and the startup’s rubric.
>
> The output is a two-page Proof-of-Work Report: a certificate plus an evidence page with a confidence score and the reasons behind it. Anyone can verify it through a public link or QR code — no account required. Certificates can be revoked, and the public page then says so.

### Judge takeaway

The solution is not “better resumes.” It is a way to make shipped work **visible and checkable**.

---

## Slide 3 — Flow of Solution

### On-slide copy

**Headline:**  
**One loop. Three sides. One auditable record.**

**Swimlane diagram**

```
STARTUP     Post challenge ──► Review proposal ──► Approve ──► Review PRs ──► Sign off
                                                                                   │
STUDENT     Discover ──► Apply ──► Sign agreement ──► Fork / PR ──► Deliver milestones
                                                                                   │
PLATFORM    Link repo ──► Capture GitHub evidence ──► Apply rubric ──► Report + QR + revocation
                                                                                   │
INSTITUTION Create cohort ──► Track participation ──► Read reports ──► Export outcomes
```

**What gets captured**

| Evidence | Source |
|---|---|
| Merged PRs by the student | GitHub API |
| Commit attribution (student vs others) | GitHub commits |
| Active days, lines added/removed | GitHub API |
| Review comments given | GitHub comments |
| Milestones completed | Innoverse database |
| Quality, delivery, communication, testing | Startup rubric |
| Confidence 0–100 with reasons | Deterministic scoring |

**Bottom line:**  
The report is frozen at sign-off. Later repo changes do not rewrite history.

**Visual:** Swimlane with GitHub as the central system of record; use one accent color for “evidence captured” moments.

### Speaker notes (45–50 sec)

> The flow is deliberately simple because the hard part is trust, not UI.
>
> A startup posts a challenge. Innoverse links or creates the repository and handles the agreement. The student contributes through a fork and pull request, so the startup keeps control of the main branch. The startup reviews the PR, approves milestones, and completes a short rubric at sign-off.
>
> Innoverse then takes a snapshot of the GitHub evidence plus the rubric and generates the report. The student gets a portable credential; the startup gets a candidate record; the institution gets cohort-level outcomes. The same evidence powers all three views.

### Judge takeaway

Every participant sees the same source of truth, and the evidence is captured once — not re-entered by three parties.

---

## Slide 4 — Tech Stack

### On-slide copy

**Headline:**  
**A small, reliable stack — with evidence integrity in the middle.**

**Architecture**

```
Next.js 16 / React 19 / TypeScript
        │
        ├── API routes + Zod validation
        │        ├── MongoDB / Mongoose
        │        ├── GitHub OAuth + GitHub App tokens
        │        ├── Vercel Blob (private uploads)
        │        ├── Redis pub/sub + SSE (live PR/milestone updates)
        │        └── pdf-lib (deterministic reports)
        │
        └── Vercel (deploy) + Vitest (tests)
```

**Why these choices**

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 App Router, React 19, TypeScript | One codebase for UI + server routes; typed end to end |
| Data | MongoDB + Mongoose | Flexible evidence/report schema; fast iteration |
| Identity | NextAuth + GitHub OAuth | Students and startups already have GitHub accounts |
| Repo access | GitHub App installation tokens where configured | Short-lived, repo-scoped tokens instead of broad OAuth access |
| Files | Vercel Blob + authorized download routes | Private proposals and branding assets |
| Realtime | Redis pub/sub + SSE | Live PR and milestone updates without polling |
| Reports | pdf-lib | Reproducible, signed PDFs with QR verification |
| Quality | Zod, Vitest, typecheck, production build | Validation and CI on every push |

**Trust layer**

- GitHub tokens are **encrypted at rest (AES-256-GCM)** and never sent to the browser.
- Object-level authorization in one policy layer: only the challenge owner can review, manage milestones, issue, or revoke.
- Rate limits on auth, uploads, proposals, certificates, and GitHub writes.
- Audit trail for role selection, proposals, milestones, and certificate issue/revoke.
- Uploads checked by magic bytes; HTML/SVG rejected.
- Certificate fingerprint stored with SHA-256; public revocation with reason.

**Status:** MVP is running; typecheck, automated tests, and production build pass.

**Visual:** Clean architecture diagram with “GitHub” and “MongoDB” as the two external anchors. Put the security bullets in a narrow right rail.

### Speaker notes (45–50 sec)

> We chose boring, proven infrastructure so the team spends time on the hard part: evidence integrity.
>
> The app is Next.js and TypeScript end to end. MongoDB holds the challenge, proposal, milestone, report, and cohort records. GitHub OAuth identifies users, and GitHub App tokens are preferred for repo operations because they are short-lived and scoped. Tokens are encrypted server-side and never reach the browser.
>
> The trust model is explicit: one authorization policy, rate limits, audit logs, private file access, and a SHA-256 fingerprint on every certificate. The report is generated deterministically with pdf-lib, and the QR points to a public verification page.

### Judge takeaway

This is not a prototype UI wrapped around a spreadsheet. The auth, evidence capture, reporting, and revocation paths are implemented.

---

## Slide 5 — Unique Selling Proposition

### On-slide copy

**Headline:**  
**The moat is the evidence, not the dashboard.**

**Five differentiators**

1. **Proof over profile**  
   Merged code, commit attribution, review threads, milestones, and a founder rubric — not self-reported skills.

2. **Explainable, not a black box**  
   Every confidence score is printed with the reasons that moved it. Deterministic and auditable.

3. **GitHub-native, zero new tool for students**  
   Students keep working in the workflow they already use: fork, commit, pull request.

4. **Three-sided network**  
   Student, startup, and institution read the same record. One shared record, three products.

5. **Full loop, not a point solution**  
   Discover → prove → verify → hire → pay. Reports, talent discovery, cohorts, and paid engagements share one engine.

**Claim vs evidence**

| Typical platform | Innoverse |
|---|---|
| “I know React.” | “Here are the merged PRs, commits, review threads, and the founder’s rubric.” |
| Ranking from a test. | Confidence with reasons, tied to real work. |
| Profile + application. | Report + QR verification + revocation. |
| One side of the market. | Student, startup, and institution on one record. |

**Why competitors can’t copy it in a sprint:**  
The defensibility is the evidence schema, the GitHub workflow, the institution reporting layer, and the trust surface (verification + revocation), not a single UI feature.

**Visual:** Two-column comparison. Left: a profile with checkboxes. Right: a report with evidence callouts. Use the same accent for “verified”.

### Speaker notes (40–45 sec)

> LinkedIn shows who you say you are. GitHub shows code, but it does not run a hiring workflow or issue a credential. HackerRank and Codility test in a synthetic environment. Riipen and Forage run project programs, but the evidence is often a completion record, not an auditable work history.
>
> Innoverse combines the three pieces that matter: real work, GitHub-native evidence, and an explainable credential. The report is the product, and the network around it makes it useful to all three sides.

### Judge takeaway

The differentiation is structural: a new evidence primitive plus a three-sided workflow, not a feature toggle.

---

## Slide 6 — Feasibility and Competitors

### On-slide copy

**Headline:**  
**Feasible now. Differentiated where it matters.**

**Feasibility**

- Working MVP: challenge posting, proposals, agreements, GitHub PR review, milestones, reports, QR verification, cohorts, engagements.
- Deployed on Vercel + MongoDB; low marginal infrastructure cost.
- GitHub-native: no new developer tool to install.
- Payments recorded manually with a reference; no gateway dependency for the first release.
- Automated tests, typecheck, and production build in CI.

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| GitHub API or permission changes | Server-side tokens, GitHub App tokens, public fork-only default, org-owned private repo path |
| Marketplace cold start | Start with university cohorts and hackathons; supply and demand arrive together |
| Fake or disputed evidence | Evidence snapshot at sign-off, commit attribution, SHA-256 fingerprint, public revocation, audit trail |
| Privacy and token security | Tokens encrypted at rest, never sent to browser, scoped access, private file routes |
| Trust in the rubric | Printed per-item scores and reasons; no hidden composite |

**Competitor matrix**

| | Real startup work | Verified GitHub evidence | Explainable score | Institution layer | Paid engagements |
|---|---:|---:|---:|---:|---:|
| LinkedIn / Handshake | ✕ | ✕ | ✕ | Partial | ✕ |
| GitHub | ✓ | ✓ | ✕ | ✕ | ✕ |
| HackerRank / Codility | ✕ | ✕ | Partial | Partial | ✕ |
| Riipen / Forage | ✓ | Partial | ✕ | ✓ | Partial |
| **Innoverse** | **✓** | **✓** | **✓** | **✓** | **✓** |

**Positioning line:**  
**LinkedIn shows who you say you are. Innoverse shows what you shipped.**

**Visual:** 2×2 or matrix; keep the Innoverse column visually dominant. Put risks in a compact bottom band.

### Speaker notes (45–50 sec)

> This is feasible because we have already built the loop, not because we have a slide. The app runs on serverless infrastructure with MongoDB, and the expensive parts are GitHub API calls and PDF generation — both bounded.
>
> The main risks are trust and distribution. We mitigate trust with frozen evidence, commit attribution, revocation, and an audit trail. We mitigate distribution by starting with university cohorts and hackathons, where both students and startups are already in one place. The first wedge is evidence for a cohort; the expansion is hiring and paid engagements.
>
> On GitHub access: organization-owned private repos support real read-only collaborators. For personal accounts, we default to public fork-only repositories so students never receive write access. That is a deliberate security choice, not a missing feature.

### Judge takeaway

The build is real, the cost structure is sane, and the go-to-market starts where both sides already are.

---

## Slide 7 — Research and References

### On-slide copy

**Headline:**  
**Research says work samples predict performance. We built the missing proof.**

**What the research says**

- **Work-sample tests are among the strongest predictors of job performance** — stronger than resumes, unstructured interviews, and years of experience.  
  *Schmidt & Hunter (1998), Psychological Bulletin.*
- **Skills are changing fast.** Analytical thinking, AI literacy, and collaboration are among the fastest-growing skills through 2030.  
  *World Economic Forum, Future of Jobs Report 2025.*
- **Employers consistently rank problem-solving, teamwork, and communication among the most important candidate attributes.**  
  *NACE Job Outlook.*
- **GitHub is the system of record for modern software collaboration.** Fork + pull request is the standard contribution workflow.  
  *GitHub Docs / Octoverse.*
- **Trust requires more than a score.** Evidence must be frozen, attributable, and revocable.  
  *Innoverse design principle, validated through the build.*

**References**

1. Schmidt, F. L., & Hunter, J. E. (1998). *The validity and utility of selection methods in personnel psychology.* Psychological Bulletin, 124(2), 262–274.  
   https://doi.org/10.1037/0033-2909.124.2.262
2. World Economic Forum. *The Future of Jobs Report 2025.*  
   https://www.weforum.org/publications/the-future-of-jobs-report-2025/
3. National Association of Colleges and Employers (NACE). *Job Outlook.*  
   https://www.naceweb.org/research/reports/
4. GitHub Docs. *About forks* and *Add a repository collaborator.*  
   https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks  
   https://docs.github.com/en/rest/collaborators/collaborators
5. GitHub. *Octoverse 2025.*  
   https://octoverse.github.com/
6. GitHub Docs. *GitHub Apps overview.*  
   https://docs.github.com/en/apps
7. Next.js, MongoDB, Vercel, pdf-lib, Zod, Vitest documentation.  
   https://nextjs.org/docs · https://www.mongodb.com/docs/ · https://vercel.com/docs · https://pdf-lib.js.org/ · https://zod.dev/ · https://vitest.dev/

**What we still need to validate**

- Conversion from challenge → paid engagement.
- Willingness of startups to pay for evidence-first hiring.
- Cohort retention and institution renewal.
- Fraud resistance at larger scale.

**Visual:** Minimal reference list with three big “research → product decision” arrows. Do not overcrowd the slide; put full citations in the appendix.

### Speaker notes (35–40 sec)

> We are not claiming that a score replaces human judgment. The research says the opposite: structured work samples are strong predictors, and unstructured signals are weak. Innoverse makes work samples structured, attributable, and portable.
>
> The product decisions follow directly: capture real work, freeze the evidence, print the reasons, and let anyone verify or revoke the claim. The remaining validation is commercial, not technical: conversion, pricing, and retention.

### Judge takeaway

The idea is grounded in selection research, and the build reflects the research rather than just citing it.

---

## Optional Cover Slide

**Innoverse**  
**Proof, not promises.**  
Proof-of-work hiring for students, startups, and universities.

`Live product` · `GitHub-native` · `Verifiable reports`

---

## Optional Closing Slide

**The ask:**  
Help us put the first cohorts and startups on the evidence loop.

**What we need:**
- 3–5 startup design partners with real scoped work.
- 1–2 university cohorts for the fall pilot.
- Introductions to early-career hiring leaders.

**Closing line:**  
**Your next hire should be able to prove it.**

---

## Appendix A — 60-Second Demo Script

1. **Landing page (5 sec):** “Innoverse turns real startup work into proof you can check.”
2. **Explore (10 sec):** Show a real challenge with scope, skills, deadline, and repo.
3. **Student proposal (10 sec):** Show the proposal, deck, and approval state.
4. **Agreement (8 sec):** Show the collaboration/IP agreement and signature.
5. **GitHub flow (10 sec):** Show the repo, fork/PR model, and PR review view.
6. **Report (12 sec):** Open a Proof-of-Work Report; point to merged PRs, rubric, confidence + reasons, QR.
7. **Verification (3 sec):** Open `/r/{token}` in a private window; show it works without an account.
8. **Close (2 sec):** “Proof, not promises.”

---

## Appendix B — Likely Judge Questions

**Q: How is this different from LinkedIn or Handshake?**  
They optimize profiles and applications. We produce an auditable record of real work. The report is the product.

**Q: How is this different from GitHub?**  
GitHub stores code. It does not run a challenge → agreement → rubric → credential workflow, and it does not issue a hiring report with revocation.

**Q: How do you prevent fake work?**  
Commit attribution, merged-PR checks, review threads, evidence snapshots, a founder rubric, SHA-256 fingerprints, public revocation, and an audit trail.

**Q: What if GitHub access fails?**  
Organization-owned private repos support read-only collaborators. Personal accounts default to public fork-only repos, so students never get write access. The app surfaces access state explicitly instead of claiming success.

**Q: How do you make money?**  
Startup subscriptions for hiring, institution cohort plans, and a take rate on paid engagements. The first release keeps payments manual to avoid gateway complexity.

**Q: Why will students use it?**  
They leave with a portable, verifiable credential and real startup work — not another certificate with nothing behind it.

**Q: What is the moat?**  
The evidence schema, the GitHub-native workflow, the institution reporting layer, and the trust surface (verification + revocation + audit), not a single UI feature.

---

## Appendix C — Slide Design Rules

- One idea per slide; one headline that states the argument.
- Use the product itself as the visual: report, PR review, swimlane, matrix.
- Keep body copy at 18–24 pt; citations at 10–12 pt.
- Use one accent color only for “evidence captured / verified”.
- No stock photos of people at laptops.
- Every number must be traceable to the live product or a cited source.
- Rehearse to 6 minutes; leave 1 minute for questions.
