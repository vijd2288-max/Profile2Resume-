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

| Command | Result |
|---|---|
| `npm run check` | Typecheck, lint, formatting, 28 Vitest files / 60 tests, and one Node smoke test passed |
| `npm run build` | Typecheck and production bundle succeeded |
| `npm run test:e2e` | One workflow test and the Node smoke test passed |
| `npm ls --depth=0` | Installed direct dependencies resolved |

This records the existing architecture and baseline only. Verified issues and
the implementation roadmap are recorded in Milestone 02 below.
