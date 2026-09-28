# Doorkey

Open the right doors to the right people.

Doorkey introduces founders and investors who are genuinely relevant to each
other, and shows the reasoning behind every suggestion. It is a working
Next.js application with a real database, real authentication and a real
matching engine — not a prototype with mocked data behind it.

---

## Running it

You need Node 20.9+ and either Docker or a PostgreSQL 14+ server.

```bash
npm install                 # install dependencies
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npm run db:up               # start PostgreSQL in Docker (skip if you have your own)
npm run setup               # prisma generate + push schema + seed demo data
npm run dev                 # http://localhost:3000
```

`AUTH_SECRET` can be generated with `openssl rand -base64 32`.

### Signing in to the seeded data

Every demo account uses the password **`OpenDoors2026!`**.

| Account                            | Role        |
| ---------------------------------- | ----------- |
| `amara.okonjo@demo.doorkey.app`    | Founder     |
| `priya.raghavan@demo.doorkey.app`  | Investor    |
| `admin@demo.doorkey.app`           | Admin       |

The seed creates 16 investors, 22 startups with 22 founders, the controlled
vocabularies, four live connections with conversations and two pending
requests. Every seeded account is flagged `isDemo` and carries a visible
"Demo account" tag. No real people, funds or investments are represented.

---

## What is required and what is optional

Only two environment variables are required: `DATABASE_URL` and `AUTH_SECRET`.
Every integration degrades to a local driver rather than breaking:

| Feature          | Without configuration                                                     | With configuration                |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Email            | Written to `./.mail/` and logged. Reported as **not delivered**, never as sent. | Resend                       |
| File uploads     | Written to `./uploads/`                                                    | Any S3-compatible bucket          |
| Writing assistant| A local provider that only tidies text you supplied — it invents nothing   | Anthropic API                     |
| Google sign-in   | Hidden; email and password only                                            | Google OAuth                      |

---

## Commands

```bash
npm run dev          # development server
npm run build        # prisma generate + production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # unit tests (vitest) — 84 tests, no database needed
npm run test:e2e     # Playwright journey test — needs a running app and database
npm run db:seed      # reseed demo data
npm run db:studio    # browse the database
npm run db:reset     # drop, recreate, reseed
```

---

## How it is put together

```
prisma/schema.prisma      29 models, 18 enums
prisma/seed.ts            demo data and controlled vocabularies

src/lib/
  matching/               the scoring engine (pure, no database)
  connections/rules.ts    the connection state machine (pure, no database)
  auth/                   passwords, sessions, tokens, rate limits, CSRF, Google
  validation/schemas.ts   every Zod schema in one place
  services/               email, storage, ai, analytics, audit, notifications
  config/                 match weights, vocabulary labels

src/server/               business logic — profiles, discovery, connections,
                          messages, introductions, saved, reports, admin
src/server/actions/       server actions that forms post to

src/components/           presentation only, no business logic
src/app/                  routes
```

Business logic lives in `src/server` and `src/lib`; components render what they
are given. The two pieces with the most rules — matching and the connection
state machine — are pure functions with no database access, which is why they
are the most heavily tested parts of the codebase.

### The matching engine

Weights live in `src/lib/config/matching.ts` and are the only place to change
them:

| Dimension  | Weight |
| ---------- | ------ |
| Sector     | 30%    |
| Stage      | 20%    |
| Funding    | 20%    |
| Geography  | 15%    |
| Thesis     | 15%    |

`scoreMatch()` returns `{ score, reasons, breakdown }`. The score orders
results; **the number is never shown in the interface**. What users see is the
reasons list under "Why this may be relevant", phrased from their own side of
the table — `scoreMatchForInvestor()` produces the same score with the wording
inverted.

The engine is deliberately not AI. It is a transparent weighted sum, so a
founder can see that an investor covers their sector, invests at their stage
and writes cheques their round fits, rather than being told a model likes them.

### Security

Authorisation is always server-side. Session cookies are `httpOnly`,
`SameSite=Lax`, and `Secure` in production; sessions live in the database so
they can be revoked. Passwords are bcrypt at 12 rounds. Reset and verification
tokens are random 32-byte values stored only as SHA-256 hashes. Origin is
checked on state-changing requests. Rate limits cover sign-in, signup, resets,
connection requests, messages, introductions, reports and AI calls. Uploads are
validated by magic number rather than the declared MIME type, capped at 4 MB,
and restricted to JPEG, PNG and WebP. Security headers including a CSP are set
in `next.config.ts`.

Profile visibility (`PUBLIC` / `CONNECTION_ONLY` / `PRIVATE`) is enforced in
`getViewableProfile()` at the data layer, so no route can leak a private field
by forgetting to check. Messaging requires an accepted connection, verified on
every send.

### Privacy in the analytics

Events record a name, an optional user id, and an allow-listed set of
properties (`role`, `stage`, `sector`, and so on). Message bodies, search terms
and IP addresses are never written to the event log.

---

## Testing

`npm test` runs 84 unit tests with no database:

- **Matching** — sector, stage, geography and funding compatibility; currency
  conversion; weights summing to 1; reason generation; banding.
- **Connections** — duplicate prevention, self-connection, who may accept,
  decline, withdraw and remove, and re-requesting after a decline.
- **Validation** — every schema, including the cheque-range cross-field rule.
- **Auth** — hashing, verification, salt uniqueness, token hashing, timing-safe
  comparison.
- **Formatting** — money and number presentation.

`e2e/journey.spec.ts` covers the journey the brief asks for — signup →
onboarding → profile → discover → view → connect → accept → message — plus two
authorisation checks. It needs a running app, a seeded database and
`npx playwright install`.

---

## Two things that were done in a restricted sandbox

This was built in an environment with a firewalled network, and two steps
could not run here. Both work normally on a machine with internet access:

1. **`prisma generate`** could not fetch its engine binaries
   (`binaries.prisma.sh` was blocked). The schema was validated with Prisma's
   WASM parser and the client's **type definitions** were generated from the
   validated DMMF, so the whole codebase is genuinely typechecked against the
   real schema. But you must run `npx prisma generate` (or `npm run setup`,
   which includes it) before the app will execute.

2. **Google Fonts** could not be fetched, so `next build` was verified with the
   font import temporarily stubbed. It compiled cleanly and produced all 32
   routes. With network access the fonts resolve normally.

Everything else was run for real: `tsc --noEmit` passes with no errors,
`next lint` reports none, `next build` completes, and all 84 unit tests pass.

---

## What is placeholder

`/privacy` and `/terms` contain plainly-labelled placeholder wording. They are
not legal advice and have not been reviewed by a lawyer. Replace them before
Doorkey touches real users or real data.
