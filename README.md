# Profile2Resume

Profile2Resume is an evidence-backed developer resume builder. It uses a native
Node.js HTTP server, MongoDB/Mongoose, a static Google Stitch frontend, and
server-side AI integrations.

## Local development

1. Install Node.js 20+ and MongoDB.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and set a random `API_SECRET_KEY` (at least
   32 characters), `MONGODB_URI`, and the GitHub OAuth values.
4. Run `npm run typecheck` while editing.
5. Run `npm run test` for the unit/integration suite.
6. Run `npm run build && npm start` for the production-shaped server.

The browser entry point is [code.html](./code.html). The API listens on
`PORT` (default `3000`).

## Configuration

`.env.example` documents every supported setting. Secrets must stay in the
hosting provider's environment configuration; never commit `.env` files.
`AI_API_KEY` is only read by the server. `MONGODB_URI` should point to a
private MongoDB Atlas or managed MongoDB deployment in production.

GitHub OAuth requires a callback URL matching `GITHUB_CALLBACK_URL`. The
application signs HttpOnly session cookies with `API_SECRET_KEY`. Production
cookies are marked `Secure`.

## API areas

- `/auth/github`, `/auth/github/callback`, `/auth/logout`
- `/api/profile`, `/api/github`, `/api/linkedin/import`
- `/api/leetcode/statistics`, `/api/evidence`
- `/api/job-analysis`, `/api/bullets`, `/api/clarifications`
- `/api/resumes`, `/api/resumes/:id/versions`
- `/api/resumes/:id/preview`, `/api/resumes/:id/export/pdf`
- `/api/account/integrations/:provider/disconnect`
- `/api/account/delete`
- `/health` (unauthenticated deployment health check)

All `/api` operations require authentication and scope database queries to the
authenticated user. LinkedIn PDF files are parsed in memory, are limited to
10 MB, and are not persisted.

## Data deletion

Disconnecting an integration revokes the stored token and keeps imported data
unless `deleteImportedData: true` is explicitly supplied. Account deletion
requires the exact JSON confirmation `{ "confirmation": "DELETE" }` and removes
the user's profile, integrations, imports, evidence, AI records, resumes, and
resume versions. The session cookie is cleared after successful deletion.

## Deployment

The included `render.yaml` targets a Node web service on Render without
auto-deploy. Set all required environment variables in the service dashboard,
provision MongoDB separately, and verify `/health` before enabling traffic.
The same `npm ci && npm run build` and `npm start` commands work on other Node
hosts. This repository does not deploy or push automatically.

## Security and known limitations

Requests have bounded body sizes, security headers, timeouts, and in-memory
rate limits. For multiple production instances, put a shared rate limiter at
the edge or replace the in-memory limiter with a shared store. Run
`npm audit` during release review; dependency advisories must be triaged before
production rollout.

The current frontend remains a static Stitch document and the Three.js hero is
decorative. Resume PDF export includes only approved, supported or
user-confirmed bullets; users must review and approve imported and generated
content.
