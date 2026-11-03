# Profile2Resume Architecture

## Current frontend architecture

The repository currently contains a single static Stitch export in `code.html` and its design specification in `DESIGN.md`. The browser page owns the document shell, Tailwind CDN configuration, typography imports, navigation markup, landing-page sections, a Three.js hero scene, and a small timeline interaction.

There is no package manifest, bundler, framework, component directory, route module, backend, database client, test runner, or environment loader yet. `screen.png` is a reference capture, not an application asset used by the page.

The visual system is defined inline through Tailwind tokens in `code.html` and documented as YAML-like tokens plus prose in `DESIGN.md`. The design uses Space Grotesk for headings, Inter for body copy, JetBrains Mono for technical metadata, warm ivory surfaces, electric cobalt actions, and restrained paper-like elevation.

## Application routing

The existing header and calls to action advertise these application paths through `data-path` attributes:

- `landing`: the current Stitch landing screen.
- `connect`: profile connection and ingestion entry point.
- `dashboard`: evidence and ingestion overview.
- `analysis`: achievement and impact analysis.
- `studio`: resume composition workspace.
- `preview`: public resume preview.

Phase 1 keeps the current landing content intact and adds a small client-side shell/router. Routes are represented by URL hash values so the page remains deployable as a static file. Until those screens are implemented, navigating to another route preserves the existing landing surface and updates the active route state, making the advertised routes renderable without inventing product content.

## Current dependencies

The current screen loads dependencies from CDNs:

- Tailwind CSS browser build.
- Three.js `r125` from Google AJAX CDN.
- Google Fonts: Space Grotesk, Inter, JetBrains Mono, and Material Symbols.
- Remote image URLs for the supplied Stitch imagery.

Phase 1 adds a Node/TypeScript quality and server-foundation toolchain without moving the visual page into a framework. Runtime backend dependencies are intentionally not added yet.

## Planned backend architecture

The planned backend is a small TypeScript HTTP API with these boundaries:

1. HTTP adapters parse requests, apply request validation, and translate failures into the shared response envelope.
2. Application services coordinate ingestion, evidence normalization, scoring, generation, and export jobs.
3. Provider adapters isolate GitHub, LinkedIn, and LeetCode API clients from application logic.
4. Persistence repositories isolate database access from services.
5. Background workers handle provider sync, evidence analysis, and resume generation asynchronously.

Phase 2 adds server-only MongoDB persistence and GitHub OAuth. The static Stitch page
keeps its existing hash routes; the `Continue with GitHub` action targets the server
OAuth entry point at `/auth/github`.

## Phase 2 setup

1. Copy `.env.example` to `.env` and set `API_SECRET_KEY` to a random value of at
   least 32 characters.
2. Set `MONGODB_URI` and, optionally, `MONGODB_DB_NAME` for the MongoDB deployment.
   The application fails safely when the URI is missing and never logs credentials.
3. Create a GitHub OAuth App. Set its callback URL to the exact
   `GITHUB_CALLBACK_URL` value, then set `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET` in the server environment.
4. Run `npm run build` and `npm test`.

GitHub access tokens are encrypted with an AES-256-GCM key derived from
`API_SECRET_KEY`, selected integration fields are hidden by default, and browser
JavaScript receives only a signed HttpOnly session cookie. Rotate the secret and
invalidate sessions if it is compromised. Never commit `.env` or populated
credentials.

## Database responsibilities

A future relational database should own durable product state:

- User and profile records, once authentication exists.
- Provider connection metadata and encrypted token references.
- Normalized repositories, commits, pull requests, employment records, and problem-solving metrics.
- Evidence claims and immutable provenance links.
- Resume documents, versions, generation status, and export metadata.
- Audit events and job state needed for retries and support.

Raw provider payloads should live in object storage or a short-retention ingestion store when their size or retention policy makes relational storage inappropriate. Secrets must never be stored in frontend state or the database as plaintext.

## Integration flow

The intended flow is:

1. The browser requests a connection session from the API.
2. The provider adapter performs an OAuth flow using server-held credentials.
3. A worker fetches provider data and normalizes it into the evidence model.
4. Analysis services derive impact signals and attach source references.
5. The resume studio requests a generated draft using selected evidence and a target role.
6. The generation service returns structured, source-linked content; the browser renders it.
7. Export creates a PDF artifact and records its version and provenance.

The browser should receive typed, safe JSON envelopes for both success and failure. Provider credentials and AI provider keys remain server-side.

## AI generation flow

AI generation is a constrained transformation, not the source of truth:

1. Select verified evidence and a user-approved target profile.
2. Build a structured prompt containing only normalized evidence and explicit formatting constraints.
3. Ask the model for structured resume content, never opaque HTML or executable code.
4. Validate the model response against a schema.
5. Check every claim against the evidence set and mark unsupported claims for review or rejection.
6. Persist the accepted draft with model/version metadata and evidence references.
7. Let the user review and export the final document.

The service should support provider timeouts, retry limits, redaction, prompt and response size limits, and audit logging. Phase 1 defines the boundary only; it does not call an AI provider.

## Security boundaries

- Public browser code may contain only non-sensitive configuration, such as a future API base URL.
- Server-only environment variables are validated at startup and must not be imported by browser code.
- API handlers validate untrusted path, query, body, and header input before invoking services.
- Error responses expose stable public codes and safe messages, never stack traces, tokens, provider payloads, SQL, or prompt contents.
- Provider OAuth tokens and AI keys are server-held, encrypted at rest, scoped to minimum permissions, and excluded from logs.
- CORS, CSRF protection, rate limiting, request size limits, and authorization checks belong at the HTTP boundary once a server exists.
- Evidence links and generated claims require provenance checks before becoming user-visible output.

## Phase 1 quality boundary

Phase 1 establishes documentation, environment validation, shared API primitives, a reusable browser shell around the existing Stitch content, and baseline quality scripts. It does not implement authentication, provider integrations, persistence, AI calls, or new application screens.
