# Innoverse — Slide-Only Copy

> Paste these into the deck. Speaker notes, references, and Q&A are in `docs/ppt-content.md`.

---

## Cover

**Innoverse**  
**Proof, not promises.**  
Proof-of-work hiring for students, startups, and universities.

`GitHub-native` · `Verifiable reports` · `Built for students, startups, and universities`

---

## 1. Problem Statement

**Students can build. Hiring still can’t see it.**

Two applicants can look identical on paper. One has shipped a real feature. The other has only watched tutorials.

- **Students:** “I have projects, but no one can tell what I actually built or how I work in a team.”
- **Startups:** “Every application has the same skills list. We don’t have time to audit every GitHub profile.”
- **Institutions:** “We can report grades and attendance, not what students actually shipped.”

**A familiar scenario:**  
A second-year student has three real projects, applies to dozens of internships, and hears nothing. A founder has a stack of applications and no quick way to tell who can ship. Both sides lose.

**Bottom line:**  
Hiring falls back to resumes, referrals, and who interviews well. Ability gets filtered out before it gets tested.

*Visual: two identical resumes. Behind one: a merged PR, review thread, completed milestone. Behind the other: an empty outline.*

---

## 2. Solution

**Innoverse turns real startup work into proof you can check.**

Startups post scoped work. Students ship it on GitHub. Innoverse captures what happened and turns it into a report anyone can verify.

- **Real work, not practice tests** — challenges come from startups.
- **GitHub-native proof** — merged PRs, commits, active days, reviews, milestones.
- **Explainable report** — weighted rubric + confidence score with printed reasons.
- **One shared record for three sides** — student, startup, institution.

**Core artifact:** the **Proof-of-Work Report**. The certificate is the display layer; the shipped work behind it is the product.

*Visual: report preview with merged PRs, rubric, confidence, QR.*

---

## 3. Flow of Solution

**One loop. Three sides. One shared record.**

```
STARTUP     Post challenge → Review proposal → Approve → Review PRs → Sign off
STUDENT     Discover → Apply → Sign agreement → Fork / PR → Deliver milestones
PLATFORM    Link repo → Capture GitHub evidence → Apply rubric → Report + QR
INSTITUTION Create cohort → Track participation → Read reports → Export outcomes
```

**Captured:** merged PRs · authored commits · active days · review comments · milestones · founder rubric · confidence + reasons.

**Frozen at sign-off.** Later repo changes do not rewrite history.

*Visual: swimlane with GitHub as the system of record.*

---

## 4. Tech Stack

**A small, reliable stack — with evidence integrity in the middle.**

```
Next.js 16 / React 19 / TypeScript
  ├── API routes + Zod
  ├── MongoDB / Mongoose
  ├── GitHub OAuth + GitHub App tokens
  ├── Vercel Blob (private uploads)
  ├── Redis pub/sub + SSE
  └── pdf-lib (reports)
Deploy: Vercel · Tests: Vitest
```

- Tokens encrypted at rest (AES-256-GCM), never sent to the browser.
- Object-level authorization, rate limits, audit trail.
- Private file routes; magic-byte upload checks.
- SHA-256 certificate fingerprint + public revocation.
- Typecheck, tests, and production build pass.

*Visual: architecture diagram with GitHub and MongoDB as anchors.*

---

## 5. Unique Selling Proposition

**The moat is the evidence, not the dashboard.**

1. **Proof over profile** — merged code + attribution + rubric, not self-reported skills.
2. **Explainable, not a black box** — every score has printed reasons.
3. **GitHub-native** — students keep their existing fork/PR workflow.
4. **Three-sided network** — student, startup, institution share one record.
5. **Full loop** — discover → prove → verify → hire → pay.

| Typical platform | Innoverse |
|---|---|
| “I know React.” | Merged PRs, commits, reviews, rubric. |
| Test ranking. | Confidence with reasons. |
| Profile + application. | Report + QR + revocation. |
| One side. | Three sides, one record. |

**Positioning:** LinkedIn shows who you say you are. Innoverse shows what you shipped.

*Visual: claim vs. evidence, side by side.*

---

## 6. Feasibility and Competitors

**Feasible now. Differentiated where it matters.**

**Built:** challenge marketplace, proposals, agreements, GitHub PR review, milestones, reports, QR verification, cohorts, engagements.

**Why it ships:** serverless deploy, low marginal cost, GitHub-native, no payment gateway dependency, automated tests + build.

| Risk | Mitigation |
|---|---|
| GitHub API/permission changes | Server-side tokens, GitHub App, public fork-only default, org repo path |
| Cold start | University cohorts + hackathons as the wedge |
| Fake evidence | Frozen snapshot, attribution, SHA-256, revocation, audit |
| Token privacy | Encrypted at rest, never in browser, scoped access |
| Rubric trust | Printed per-item scores and reasons |

| | Real work | Verified GitHub evidence | Explainable score | Institution layer | Paid engagements |
|---|---:|---:|---:|---:|---:|
| LinkedIn / Handshake | ✕ | ✕ | ✕ | Partial | ✕ |
| GitHub | ✓ | ✓ | ✕ | ✕ | ✕ |
| HackerRank / Codility | ✕ | ✕ | Partial | Partial | ✕ |
| Riipen / Forage | ✓ | Partial | ✕ | ✓ | Partial |
| **Innoverse** | **✓** | **✓** | **✓** | **✓** | **✓** |

*Visual: competitor matrix with Innoverse column dominant.*

---

## 7. Research and References

**Research says work samples predict performance. We built the missing proof.**

- Work-sample tests are among the strongest predictors of job performance.  
  *Schmidt & Hunter (1998), Psychological Bulletin.*
- Skills are changing fast; analytical thinking and AI literacy are rising.  
  *WEF, Future of Jobs Report 2025.*
- Employers value problem-solving, teamwork, and communication.  
  *NACE Job Outlook.*
- Fork + pull request is the standard collaboration model.  
  *GitHub Docs / Octoverse.*

**References**

1. Schmidt & Hunter (1998). *The validity and utility of selection methods in personnel psychology.* https://doi.org/10.1037/0033-2909.124.2.262
2. WEF. *Future of Jobs Report 2025.* https://www.weforum.org/publications/the-future-of-jobs-report-2025/
3. NACE. *Job Outlook.* https://www.naceweb.org/research/reports/
4. GitHub Docs. *About forks*; *Add a repository collaborator.* https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks
5. GitHub. *Octoverse 2025.* https://octoverse.github.com/
6. GitHub Docs. *GitHub Apps.* https://docs.github.com/en/apps
7. Next.js, MongoDB, Vercel, pdf-lib, Zod, Vitest docs.

**Still validating:** conversion to paid engagements, pricing, cohort retention, fraud resistance at scale.

*Visual: three arrows from research → product decision; full citations in appendix.*

---

## Closing

**Your next hire should be able to prove it.**

The ask: 3–5 startup design partners, 1–2 university cohorts, and introductions to early-career hiring leaders.
