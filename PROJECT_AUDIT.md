# Profile2Resume Project Audit

Audit date: 2026-11-12

This audit covers the checked-out project source, configuration, dependency
manifests, documentation, and tests. The populated `.env` file was not read.
Existing local changes were preserved and are not included in the audit commits.

## Milestone 01 — Existing architecture

### Frontend

- `code.html` is the static Google Stitch document and browser entry point. It
  contains the visual design, inline page behavior, hash-based navigation, and
  calls to the same-origin API. The page includes the Three.js hero and editor
  interactions. Its Tailwind, Three.js, fonts, and some images are loaded from
  external CDNs.
- `DESIGN.md` records the Stitch visual tokens. The audit did not modify the UI.

### Backend and API

- The backend is TypeScript on Node's native HTTP server. `src/server/main.ts`
  loads environment configuration and starts the server; `src/server/app.ts`
  dispatches authentication and API requests to feature handlers.
- API areas include profile editing, GitHub import and project overrides,
  LinkedIn PDF import, LeetCode statistics, evidence and claims, job analysis,
  bullet generation and clarification, resume editing/versioning/preview/PDF
  export, and account integration disconnect/deletion.
- API handlers use shared JSON envelopes and Zod validation. `/health` is
  public; `/api` requests require a session and are scoped to the authenticated
  user.

### Authentication and data

- Authentication is GitHub OAuth. OAuth state and session values are signed;
  sessions use HttpOnly, SameSite cookies and are Secure in production.
- GitHub access tokens are encrypted server-side before persistence. User,
  integration, profile, import, evidence, claim, analysis, bullet, project
  override, clarification, resume, and resume-version data use Mongoose models.
- MongoDB is the configured persistence layer. The connection is created
  lazily for API operations and uses a cached connection. Model schemas define
  ownership references and indexes.

### Configuration, dependencies, and deployment

- `package.json` and `package-lock.json` define an npm/TypeScript toolchain:
  TypeScript, ESLint, Prettier, Vitest, esbuild, Mongoose, Zod, and PDF
  generation/parsing libraries.
- `.env.example` documents server settings. `.gitignore` excludes `.env`,
  dependencies, build output, coverage, and logs while allowing
  `.env.example`.
- The Render service configuration builds with `npm ci && npm run build`,
  starts with `npm start`, and checks `/health`. `README.md` documents local
  setup and deployment.

### Existing validation

The following checks passed against the inspected worktree:

| Command            | Result                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| `npm run check`    | Typecheck, lint, formatting, 28 Vitest files / 60 tests, and one Node smoke test passed |
| `npm run build`    | Typecheck and production bundle succeeded                                               |
| `npm run test:e2e` | One workflow test and the Node smoke test passed                                        |
| `npm ls --depth=0` | Installed direct dependencies resolved                                                  |

This records the existing architecture and baseline only. Verified issues and
the implementation roadmap are recorded in Milestone 02 below.

## Milestone 02 — Verified issues and implementation roadmap

The findings below are based on the checked-out source and the commands listed
above. No application behavior was changed as part of this audit.

### Findings

| Priority        | Finding                                                        | Evidence and impact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High / Critical | Dependency advisories in the resolved dependency tree          | `npm audit` reports 11 vulnerabilities (8 moderate, 1 high, 2 critical). Production dependency `zod@3.25.76` is affected by the high-severity constrained-collection memory-exhaustion advisory. Development dependencies include affected Vitest/`tinypool` versions with critical advisories and `typescript-eslint`/`minimatch` with moderate advisories. The suggested automatic fixes cross major-version boundaries; no force-upgrade was applied.                                                            |
| High            | Legacy user deletion bypasses account cleanup                  | `DELETE /api/users/:id/profile` in `src/server/app.ts` deletes only the `User` document. The documented `POST /api/account/delete` path separately deletes integrations, profiles, imports, evidence, resumes, and related records. Calling the legacy route can therefore leave user-owned records, including encrypted integration tokens, orphaned. The canonical multi-collection deletion also uses independent parallel deletes rather than a transaction, so an operation failure can leave partial cleanup. |
| Medium          | Most advertised hash routes do not have distinct views         | `code.html` advertises `landing`, `connect`, `dashboard`, `analysis`, `studio`, and `preview`. `renderRoute()` only switches between the landing surface and the dashboard editor; the other route values change route/title state but do not select separate screens. `docs/ARCHITECTURE.md` describes this as unfinished routing, so this is a known product-completion gap rather than a newly discovered regression.                                                                                            |
| Medium          | The named end-to-end test is not a running-app end-to-end test | `tests/e2e-workflow.test.ts` exercises resume-preview filtering and PDF generation directly. The smoke test checks static markup. Neither starts the HTTP server, runs a browser journey, nor validates a live MongoDB integration. The standalone command passes, but it does not cover the user journey implied by its name. No tracked GitHub Actions workflow was found to run the project checks automatically.                                                                                                |
| Low             | Database environment configuration is ambiguous                | `DATABASE_URL` is accepted by the environment schema and appears in `.env.example` as a PostgreSQL URL, but application persistence uses `MONGODB_URI`; no application code consumes `DATABASE_URL`. This can lead to configuring a database the application does not use.                                                                                                                                                                                                                                          |
| Low             | Architecture documentation is behind the implementation        | `docs/ARCHITECTURE.md` documents the current UI/backend through the earlier profile and import phases, while the source and `README.md` also include AI, resume, and account lifecycle features. This makes the architecture/roadmap description incomplete.                                                                                                                                                                                                                                                        |

### Validation limits

No live MongoDB, GitHub OAuth callback, AI provider, or deployed Render service
was exercised. The populated `.env` file was intentionally not inspected.
Those integrations require external configuration and are not represented by
the passing local test/build checks.

### Recommended roadmap

1. Resolve the audited dependency advisories with an explicitly reviewed
   upgrade plan; avoid blindly applying the audit tool's breaking major-version
   changes. Re-run the full test, build, and audit commands after upgrading.
2. Retire or redirect the legacy user-delete route to the canonical account
   cleanup flow. Make cleanup safely retryable, define its partial-failure
   behavior, and add tests proving no owned records remain after deletion.
3. Decide the intended content and navigation for `connect`, `analysis`,
   `studio`, and `preview`, then implement those views without replacing the
   Google Stitch design.
4. Add server/API and browser-level journey tests, including a configured test
   database where appropriate, and run the checks in CI.
5. Remove or clearly deprecate unused `DATABASE_URL`, and synchronize the
   architecture document with the current API and UI.

No roadmap item above was implemented in this audit phase.

## Milestone 03 — Development and Git baseline

- The audit started on `main` at `792a565` (`origin/main` matched that commit).
  The working tree already contained local changes, so a separate
  `feature/phase-0-project-audit` branch was created without stashing, resetting,
  or discarding them. No remote branch with that name existed at the pre-push
  check.
- `origin` is configured for both fetch and push to the repository's GitHub
  remote. `main` was not changed.
- `.gitignore` covers `node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*`,
  and `*.log`, with an exception for `.env.example`.
- The existing scripts provide separate typecheck, lint, formatting, unit,
  smoke, workflow, build, start, and aggregate check commands. The Render
  configuration uses the build/start commands documented above.
- The following pre-existing worktree entries were left unchanged and were
  excluded from all audit commits: modified `package.json`,
  `src/server/app.ts`, `src/server/env.ts`, and `tests/env.test.ts`, plus the
  untracked root file named `npm run build`. They remain local and uncommitted;
  the audit push contains only `PROJECT_AUDIT.md`.

The Git baseline and all three milestone commits are limited to audit
documentation. No application source or Google Stitch UI was changed.
