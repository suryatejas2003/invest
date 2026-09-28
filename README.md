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


































# BUILD DOORKEY — END-TO-END WEB APP

You are building **Doorkey**, a production-quality investor–entrepreneur networking web application.

Do not just provide architecture, mockups, pseudocode, or a roadmap. **Actually build the application end-to-end in the repository.**

You are acting as the senior full-stack engineer, UI/UX designer, database architect, and product engineer.

Your goal is to deliver a **fully functional, polished web application**, not a demo with fake buttons.

---

# 1. PRODUCT

## Doorkey

Doorkey connects:

* Entrepreneurs with investors
* Investors with startups
* Founders with relevant business connections
* Users with potential introductions and opportunities

The core concept is:

> **Open the right doors to the right people.**

Doorkey should feel like a serious professional networking platform rather than a dating app or generic social network.

The target audiences are:

### Entrepreneurs

People looking for:

* Investors
* Funding
* Mentorship
* Strategic connections
* Partnerships
* Introductions

### Investors

People looking for:

* Startups
* Founders
* Investment opportunities
* Relevant sectors
* Relevant funding stages
* Deal flow

---

# 2. IMPORTANT — ACTUALLY BUILD IT

Do NOT respond with:

* "Here's how you could build it"
* "You should implement..."
* Pseudocode
* Placeholder architecture
* Fake API implementations
* Static HTML pretending to be functional

Instead:

1. Inspect the existing repository.
2. Determine the current stack.
3. Reuse good existing code where appropriate.
4. Install required dependencies.
5. Create the database.
6. Implement authentication.
7. Implement backend functionality.
8. Implement frontend functionality.
9. Implement API/server functionality.
10. Implement validation.
11. Implement security.
12. Implement responsive UI.
13. Implement seed data.
14. Implement tests.
15. Run the application.
16. Fix errors.
17. Continue until the core product actually works.

If the repository is empty, initialize the project.

---

# 3. PREFERRED STACK

Use this stack unless the existing project already has a strong equivalent architecture:

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Modern component architecture

### Backend

Use Next.js server functionality/API routes/server actions where appropriate.

Do not create a separate backend unless it provides a genuine benefit.

### Database

* PostgreSQL
* Prisma ORM

### Authentication

Use a secure production-ready authentication solution.

Support:

* Email/password
* Google OAuth if practical

### Validation

Use Zod or an equivalent type-safe validation library.

### Storage

Use an S3-compatible abstraction for uploaded images/files.

### Email

Create an email service abstraction so a transactional email provider can be connected.

### AI

Create a server-side AI service abstraction.

Never expose API keys to the browser.

---

# 4. DESIGN DIRECTION

The website must look **premium, modern, trustworthy, and professional**.

Do NOT make it look like:

* A generic SaaS dashboard
* A dating app
* A crypto website
* A flashy AI startup
* A template copied from another product

The visual identity should work for both:

### Experienced investors

They should see:

* Credibility
* Structured information
* Professionalism
* Trust
* Signal over noise

### Younger founders

They should see:

* Modern design
* Simplicity
* Approachability
* Energy
* Ease of use

Use:

* Strong typography
* Generous spacing
* Clean cards
* Subtle borders
* Excellent hierarchy
* Restrained animations
* Professional navigation
* Excellent responsive behavior

Avoid excessive gradients and unnecessary animations.

---

# 5. PUBLIC WEBSITE

Build a polished landing page.

## Navbar

Include:

* Doorkey logo/name
* How it works
* For Entrepreneurs
* For Investors
* Sign in
* Get started

## Hero

Core message should communicate that Doorkey helps users discover the right investors, founders and opportunities.

Include:

* Primary CTA
* Secondary CTA
* Visual representation of the network/matching concept

## How it works

Show:

1. Create your profile
2. Discover relevant people
3. Connect
4. Open opportunities

## Entrepreneur section

Explain how founders can:

* Discover investors
* Find relevant connections
* Present their startup
* Request introductions

## Investor section

Explain how investors can:

* Discover startups
* Filter opportunities
* Find relevant founders
* Build deal flow

## Trust section

Explain:

* Profile verification
* Structured profiles
* Privacy
* User control

## Footer

Include:

* Product
* Company
* Legal
* Privacy
* Terms
* Contact

Make the landing page fully responsive.

---

# 6. AUTHENTICATION

Implement real authentication.

Pages:

* `/login`
* `/signup`
* `/forgot-password`
* `/reset-password`
* `/verify-email`

Support:

* Email/password
* Google OAuth if configured

Implement:

* Password hashing
* Secure sessions
* Email verification
* Password reset
* Logout
* Session expiration
* Authorization
* Rate limiting

Never store plaintext passwords.

---

# 7. USER ROLES

Support:

```text
ENTREPRENEUR
INVESTOR
ADMIN
```

Users select their primary role during onboarding.

Authorization must happen server-side.

Never rely on frontend role checks for security.

---

# 8. ONBOARDING

After signup, send users through onboarding.

Do not make it feel like a giant form.

Use a multi-step flow with progress.

---

# 9. ENTREPRENEUR ONBOARDING

Collect:

## Founder

* Name
* Profile photo
* Location
* Short bio
* LinkedIn
* Website

## Startup

* Startup name
* Logo
* One-line description
* Description
* Industry
* Sector
* Location
* Founded year
* Team size
* Website

## Funding

* Current stage
* Amount raised
* Amount seeking
* Currency
* Previous funding

## Traction

Optional:

* Revenue
* Users
* Customers
* Growth
* Other traction

## Goals

Allow founder to select:

* Funding
* Mentorship
* Strategic partnerships
* Introductions
* Hiring
* Other

---

# 10. INVESTOR ONBOARDING

Collect:

## Investor

* Name
* Photo
* Bio
* Location
* LinkedIn
* Website
* Organization/fund
* Investor type

## Investment preferences

* Industries
* Sectors
* Geography
* Startup stages
* Minimum cheque
* Maximum cheque
* Currency
* Investment thesis

## Expertise

* Areas of expertise
* Portfolio
* Previous investments

---

# 11. PROFILE PAGES

Build beautiful public-facing profiles.

## Entrepreneur profile

Display:

* Founder
* Startup
* Startup description
* Industry
* Stage
* Location
* Team
* Traction
* Funding
* What they are looking for
* Links
* Verification
* Relevant connections

## Investor profile

Display:

* Investor
* Organization
* Investment thesis
* Sectors
* Geography
* Stage
* Cheque range
* Portfolio
* Expertise
* Verification
* Relevant information

Do not expose private information.

---

# 12. DASHBOARD

Create separate dashboards.

## Entrepreneur dashboard

Show:

### Recommended investors

Cards containing:

* Investor
* Organization
* Relevant sectors
* Stage
* Cheque range
* Why they're relevant
* Connect button

### Profile completion

Example:

> Your profile is 80% complete.

### Connection activity

* Pending requests
* Accepted requests

### Messages

Recent conversations.

### Next steps

Useful actions rather than meaningless statistics.

---

## Investor dashboard

Show:

### Recommended startups

Cards containing:

* Startup
* Founder
* Sector
* Stage
* Funding requirement
* Traction
* Why relevant
* Connect

### New opportunities

### Connections

### Messages

### Saved startups

---

# 13. DISCOVERY

Create:

`/discover`

Discovery should adapt to the user's role.

## Entrepreneur

Discover investors.

Filters:

* Investor type
* Sector
* Industry
* Stage
* Geography
* Minimum cheque
* Maximum cheque

## Investor

Discover startups.

Filters:

* Sector
* Industry
* Stage
* Geography
* Funding requirement
* Business model
* Traction

Implement:

* Search
* Filtering
* Sorting
* Pagination
* Empty states
* Loading states

---

# 14. MATCHING ENGINE

Implement a real initial matching system.

Do not use AI for the first version.

Use a transparent weighted algorithm.

For example:

```text
sector compatibility        30%
stage compatibility         20%
geography compatibility     15%
cheque/funding compatibility 20%
thesis/interest compatibility 15%
```

Normalize the result internally.

The exact weights should be stored centrally so they can be changed later.

The matching service should return:

```typescript
{
  score: number,
  reasons: string[]
}
```

Example reasons:

* "Invests in your sector"
* "Invests at your startup stage"
* "Your funding requirement fits their typical range"
* "Interested in your geography"

Do not present the raw numerical score unless there is a good UX reason.

Present it as:

> Why this connection may be relevant

---

# 15. CONNECTION SYSTEM

Implement real connection requests.

States:

```text
PENDING
ACCEPTED
DECLINED
WITHDRAWN
BLOCKED
```

Users can:

* Send request
* Accept
* Decline
* Withdraw
* Remove connection
* Block
* Report

Prevent duplicate requests.

Prevent users from connecting with themselves.

Implement rate limiting.

---

# 16. MESSAGING

Implement real one-to-one messaging.

Only allow messaging between connected users.

Build:

`/messages`

Features:

* Conversation list
* Conversation view
* Send message
* Read/unread
* Timestamps
* Empty state
* Loading state

Prevent unauthorized users from accessing conversations.

Messages must be fetched server-side with authorization checks.

---

# 17. INTRODUCTION SYSTEM

Implement a basic introduction-request workflow.

A user can click:

> Request introduction

Then:

* Write optional message
* Submit request
* Recipient sees request
* Recipient accepts/declines
* If accepted, establish the connection/conversation

Design the database so mutual introductions can be supported later.

---

# 18. SAVED PROFILES

Allow users to save:

* Investors
* Startups

Implement:

* Save
* Unsave
* Saved list

---

# 19. NOTIFICATIONS

Build an in-app notification system.

Notifications for:

* Connection request
* Connection accepted
* New message
* Introduction request
* Introduction accepted
* New relevant recommendation
* Verification updates

Add unread count.

Create:

`/notifications`

---

# 20. SEARCH

Implement structured search.

Search:

* People
* Startups
* Organizations

Support:

* Keyword search
* Filters
* Pagination

Start with PostgreSQL search.

Do not introduce Elasticsearch unless necessary.

---

# 21. AI FEATURES

Create a clean server-side AI abstraction.

Do not make AI the core dependency of the MVP.

Implement useful AI features.

## AI Profile Assistant

Allow a user to paste rough information and generate:

* Short bio
* Startup description
* One-line pitch
* Investment thesis

The user must approve generated content.

Never automatically overwrite profile information.

---

## AI Introduction Assistant

Allow users to generate a personalized connection message based on:

* Their profile
* Recipient profile
* Context

The generated message must be editable before sending.

---

## AI Startup Summary

For investors, allow an AI-generated summary of startup information.

Clearly distinguish:

* User-provided facts
* AI-generated interpretation

Never fabricate facts.

---

# 22. DATABASE

Create a proper Prisma schema.

At minimum support:

```text
User
Profile
EntrepreneurProfile
InvestorProfile
Organization
Startup
Founder
Industry
Sector
FundingPreference
PortfolioCompany
Connection
ConnectionRequest
Conversation
ConversationParticipant
Message
IntroductionRequest
SavedProfile
Recommendation
Notification
Verification
Report
AuditLog
AIRequest
```

Use:

* UUIDs
* timestamps
* foreign keys
* indexes
* unique constraints
* enums
* appropriate cascading behavior

Do not create redundant tables.

Use relational design properly.

---

# 23. PRIVACY

Every user should control profile visibility.

Support appropriate visibility states.

Private information must never accidentally appear in public APIs.

Separate:

```text
PUBLIC
CONNECTION_ONLY
PRIVATE
```

where appropriate.

---

# 24. VERIFICATION

Build a verification foundation.

Verification types:

* Email verified
* Identity verified
* Organization verified
* Investor profile reviewed
* Startup reviewed

Do not falsely claim users are verified.

Admin should be able to change verification status.

Display appropriate badges.

---

# 25. REPORTING AND BLOCKING

Implement:

* Report user
* Report startup/profile
* Block user

Report categories:

* Spam
* Fraud
* Harassment
* Misrepresentation
* Other

Admin can review reports.

---

# 26. ADMIN PANEL

Create:

`/admin`

Admin features:

### Dashboard

* Total users
* Entrepreneurs
* Investors
* Startups
* Connections
* Messages
* Reports

### Users

* Search
* View
* Suspend
* Restore

### Verification

* Pending verification
* Approve
* Reject

### Reports

* Review
* Resolve
* Dismiss

### Content

* Manage profiles
* Manage industries/sectors

### Audit logs

Record important administrative actions.

---

# 27. DATA MODEL QUALITY

Use controlled vocabularies for:

* Industries
* Sectors
* Startup stages
* Investor types
* Currencies
* Geographies

Seed these values.

Do not make everything free-text.

---

# 28. SEED DATA

Create realistic fictional seed data.

Include:

### Investors

At least 15 fictional investors.

### Startups

At least 20 fictional startups.

### Entrepreneurs

At least 20 fictional founders.

Create varied:

* Industries
* Stages
* Geographies
* Funding requirements
* Investment preferences

Make it obvious that these are demo accounts.

Do NOT fabricate real investor relationships.

---

# 29. RESPONSIVE DESIGN

The application must work properly on:

* Desktop
* Laptop
* Tablet
* Mobile

Do not simply shrink desktop UI.

Create proper mobile navigation.

---

# 30. ACCESSIBILITY

Implement:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Accessible forms
* Labels
* Error messages
* Appropriate ARIA where needed
* Good contrast

---

# 31. ERROR HANDLING

Every important action needs:

* Loading state
* Success state
* Error state
* Empty state

Never leave users staring at a broken page.

Use useful error messages.

Do not expose internal server errors.

---

# 32. SECURITY

Implement:

* Server-side authorization
* Input validation
* Password hashing
* CSRF protection where applicable
* XSS protection
* SQL injection protection
* Rate limiting
* Secure cookies
* Secure headers
* File validation
* Upload limits
* API abuse prevention

Never trust client-side permissions.

Never expose secrets.

---

# 33. PERFORMANCE

Optimize:

* Database queries
* Images
* Server rendering
* Client bundles
* Pagination
* API calls

Avoid N+1 database queries.

Use indexes where needed.

Do not prematurely optimize irrelevant areas.

---

# 34. ANALYTICS

Implement an internal event system for:

* Signup
* Onboarding completed
* Profile completed
* Startup created
* Investor discovered
* Startup discovered
* Profile viewed
* Connection request sent
* Connection accepted
* Message sent
* Introduction requested
* Introduction accepted
* AI feature used

Keep analytics privacy-conscious.

---

# 35. EMAIL ARCHITECTURE

Create email service functions for:

* Welcome email
* Email verification
* Password reset
* Connection request
* Connection accepted
* Introduction request
* Important notifications

If no provider credentials exist, create a development email implementation/logging mechanism rather than pretending emails were sent.

---

# 36. FILE UPLOADS

Support:

* Profile photo
* Startup logo

Create secure upload validation:

* File type
* File size
* Filename handling
* Storage permissions

Do not allow arbitrary executable files.

---

# 37. SETTINGS

Create:

`/settings`

Sections:

* Profile
* Account
* Privacy
* Notifications
* Security

Allow:

* Edit profile
* Change password
* Notification preferences
* Privacy settings
* Logout
* Delete account

---

# 38. LEGAL PAGES

Create:

* `/privacy`
* `/terms`

Use clear placeholder legal content where professional legal review is required.

Do not pretend it is legal advice.

---

# 39. PROJECT STRUCTURE

Use a maintainable structure appropriate to the selected framework.

Separate:

* UI components
* Features
* Server logic
* Database
* Validation
* Services
* Authentication
* AI
* Matching
* Utilities

Keep business logic out of presentation components.

---

# 40. TESTING

Implement meaningful tests.

Test:

### Authentication

* Signup
* Login
* Authorization

### Profiles

* Creation
* Editing
* Visibility

### Matching

* Sector compatibility
* Stage compatibility
* Geography
* Funding compatibility

### Connections

* Request
* Accept
* Decline
* Duplicate prevention

### Messaging

* Authorization
* Sending
* Reading

### Admin

* Authorization
* User moderation

### End-to-end

Test the main journey:

```text
Signup
→ onboarding
→ create profile
→ discover
→ view profile
→ send connection
→ accept
→ message
```

---

# 41. DEVELOPMENT PROCESS

Follow this sequence.

## STEP 1

Inspect the repository and existing code.

Do not destroy working functionality.

## STEP 2

Set up:

* Dependencies
* Environment variables
* Database
* Prisma
* Authentication
* Base UI system

## STEP 3

Build:

```text
Landing
→ Signup/Login
→ Onboarding
→ Dashboard
```

## STEP 4

Build:

```text
Profiles
→ Startups
→ Investors
```

## STEP 5

Build:

```text
Discovery
→ Search
→ Filters
→ Profile pages
```

## STEP 6

Build:

```text
Connections
→ Notifications
→ Messaging
```

## STEP 7

Build:

```text
Matching
→ Recommendations
→ Why this match
```

## STEP 8

Build:

```text
Introduction requests
→ Saved profiles
→ Reporting
→ Blocking
```

## STEP 9

Build:

```text
AI features
```

## STEP 10

Build:

```text
Admin
→ Verification
→ Moderation
→ Analytics
```

## STEP 11

Testing, security, performance, polish.

---

# 42. DO NOT STOP AT THE FIRST ERROR

When implementing:

1. Run the code.
2. Read the error.
3. Identify the root cause.
4. Fix it.
5. Run again.
6. Check related functionality.
7. Continue.

Do not leave known TypeScript errors.

Do not leave broken imports.

Do not leave missing environment variables without documenting them.

Do not leave placeholder functionality where real functionality is expected.

---

# 43. ENVIRONMENT VARIABLES

Create `.env.example`.

Include only required variables such as:

```env
DATABASE_URL=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AI_API_KEY=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
EMAIL_API_KEY=
```

Never put actual secrets in source control.

---

# 44. DEMO MODE

Make local development easy.

The application should be usable with seed data.

Create a development seed command.

Example:

```bash
npm run db:seed
```

The developer should be able to:

```bash
npm install
npm run dev
```

and then access the application after configuring the required environment variables.

Document the setup clearly.

---

# 45. FINAL QUALITY BAR

Before considering the application complete, verify:

### Product

* Landing page works
* Authentication works
* Onboarding works
* Profiles work
* Startup profiles work
* Investor profiles work
* Discovery works
* Search works
* Matching works
* Connections work
* Messaging works
* Notifications work
* Introduction requests work
* Saved profiles work
* Reporting works
* Blocking works
* Admin works

### Technical

* TypeScript passes
* Lint passes
* Tests pass
* Database migrations work
* Seed works
* No broken imports
* No obvious security vulnerabilities
* No exposed secrets
* No unauthorized API access

### UX

* Responsive
* Accessible
* Loading states
* Error states
* Empty states
* Good mobile experience
* Consistent design

### AI

* AI runs server-side
* User data is protected
* Outputs are validated
* Users approve generated content
* No fabricated facts

---

# 46. IMPORTANT PRODUCT PRINCIPLE

The central experience is NOT:

> "Here is a database of investors."

It is:

> **"Tell Doorkey who you are and what you're looking for, and help me find the people who are genuinely relevant."**

Build the product around **quality of connections**, not quantity of profiles.

---

# 47. START NOW

Begin by inspecting the repository.

Then:

1. Determine the existing stack.
2. Identify what already exists.
3. Create an implementation plan based on the current codebase.
4. Begin implementing the application.
5. Do not wait for me to manually approve every small implementation decision.
6. Make sensible engineering decisions yourself.
7. Keep me informed of major architectural decisions.
8. Actually modify/create the files.
9. Run tests/build/type-checking as you go.
10. Fix issues before proceeding.

**Do not merely tell me how to build Doorkey. Build Doorkey.**
