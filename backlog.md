# ATS + Resume Builder — Backend Development Backlog

**Stack:** Node.js + TypeScript + Express + PostgreSQL + Prisma + Redis + Kafka + Elasticsearch. Domain-based module structure.

Tickets are ordered so each epic's dependencies are satisfied by the epics above it. Work top to bottom within an epic unless a ticket says otherwise.

---

## EPIC 0: Project Foundations

### TICKET-001: Initialize Node.js + TypeScript project
- Scaffold with `npm init`, TypeScript, `express`, `ts-node-dev`, `eslint` + `prettier`
- Set up `src/` with domain folders: `user`, `job`, `application`, `resume`, `matching`, `common`
- **Acceptance:** app boots locally with `npm run dev`, connects to local Postgres

### TICKET-002: Environment configuration
- Create `.env`, `.env.development`, `.env.production` loaded via `dotenv`
- Externalize DB credentials and secrets via env vars, no secrets committed (add to `.gitignore`)
- Add a typed config module (`src/config.ts`) that validates required env vars on boot
- **Acceptance:** app runs against the dev environment without hardcoded secrets

### TICKET-003: Prisma schema and migrations
- Define Prisma schema for core models (users + role profiles, organizations, job postings, applications, resumes + resume versions, match results, interviews)
- **Acceptance:** `npx prisma migrate dev` runs clean on a fresh DB; schema matches entity design doc

### TICKET-004: Prisma client + repository layer
- Generate the Prisma client (`npx prisma generate`); wrap each domain's queries in a repository module so services never call Prisma directly
- Enforce string enums, UUID primary keys, and explicit `include`/`select` on all relations
- **Acceptance:** app starts and a smoke-test query succeeds against the migrated schema, no mismatches

### TICKET-005: CI pipeline skeleton
- GitHub Actions: run `npm run lint` + `npm test` on every push/PR
- **Acceptance:** pipeline fails on broken build/tests, passes on clean build

### TICKET-006: Seed data script
- `prisma/seed.ts` (run via `npx prisma db seed`, dev environment only) seeding a few candidates, recruiters, and job postings
- **Acceptance:** fresh dev DB has query-able sample data after running the seed script

---

## EPIC 1: Auth & User Management

### TICKET-101: User registration endpoint
- `POST /auth/register` — email, password, role, full name
- Password hashing (`bcrypt`), uniqueness validation on email
- **Acceptance:** duplicate email rejected with clear error; valid request creates a User with `PENDING_VERIFICATION` status

### TICKET-102: Login + JWT issuance
- `POST /auth/login` — issues a JWT (`jsonwebtoken`) with user id + role claim
- **Acceptance:** valid credentials return a token; invalid credentials return 401, no user enumeration leak

### TICKET-103: Role-based route protection
- Express middleware (`requireAuth`, `requireRole`) enforcing access per endpoint (`CANDIDATE`, `RECRUITER`, `ADMIN`)
- **Acceptance:** each role can only hit its authorized endpoints; verified via integration tests per role

### TICKET-104: Candidate/Recruiter profile CRUD
- `CandidateProfile`, `RecruiterProfile` create/read/update endpoints, tied 1:1 to `User`
- **Acceptance:** profile created on first access if missing; update endpoint validates ownership (user can only edit own profile)

### TICKET-105: Organization model for recruiters
- `Organization` model; `RecruiterProfile` belongs to an `Organization`
- `POST /organizations` — create org, assign creator as org admin
- **Acceptance:** recruiter can only post jobs under their own organization

---

## EPIC 2: Job Postings & Applications

### TICKET-201: Job posting CRUD
- `POST`/`GET`/`PATCH /job-postings` — title, description, required skills, seniority, location, status (`DRAFT`/`PUBLISHED`/`CLOSED`)
- **Acceptance:** only the owning organization's recruiters can edit a posting; candidates can only read `PUBLISHED` postings

### TICKET-202: Job posting listing + filters
- `GET /job-postings?location=&seniority=&skill=` — basic filter support via Prisma query builder (ahead of the Elasticsearch epic)
- **Acceptance:** filters combine with AND logic; pagination included

### TICKET-203: Application submission endpoint
- `POST /applications` — links Candidate + Resume version + JobPosting
- **Acceptance:** duplicate application (same candidate + posting) rejected with clear error

### TICKET-204: Application status pipeline
- `PATCH /applications/:id/status` — `SUBMITTED` → `SCREENING` → `INTERVIEW` → `OFFER` / `REJECTED`
- **Acceptance:** illegal transitions (e.g. `OFFER` → `SUBMITTED`) rejected; full transition history stored

### TICKET-205: Recruiter application review endpoints
- `GET /job-postings/:id/applications` — list + filter applications for a posting
- **Acceptance:** only recruiters from the owning organization can view

---

## EPIC 3: Resume Builder

### TICKET-301: Resume schema definition
- Design `Resume` + `ResumeSection` + `ResumeEntry` JSON schema (summary, experience, education, skills, projects), validated at runtime with `zod`
- **Acceptance:** schema documented; validated against 3 sample resumes covering different structures

### TICKET-302: Resume CRUD endpoints
- `POST`/`GET`/`PATCH /resumes` — create/update a candidate's resume in structured form
- **Acceptance:** candidate can only edit their own resume; malformed section data rejected with validation errors

### TICKET-303: Resume versioning
- `POST /resumes/:id/versions` — snapshot current resume state as an immutable `ResumeVersion` row
- **Acceptance:** editing a resume after submitting an application does not change the version the application references

### TICKET-304: Resume template system
- Define 2–3 templates (layout + styling) as React/HTML components that render from the same Resume schema
- **Acceptance:** same resume data renders correctly across all templates, only visual differences

### TICKET-305: PDF generation service
- `POST /resumes/:versionId/pdf` — render a `ResumeVersion` + chosen template to a downloadable PDF via `puppeteer` (HTML → PDF) or `pdf-lib`
- **Acceptance:** generated PDF opens correctly, includes all populated sections, gracefully handles empty optional sections

---

## EPIC 4: Resume Parsing & Matching Engine

### TICKET-401: External resume upload + text extraction
- `POST /resumes/upload` — accept PDF/DOCX via `multer`, extract raw text with `pdf-parse` (PDF) and `mammoth` (DOCX)
- **Acceptance:** both file types produce non-empty extracted text; unsupported types rejected with 415

### TICKET-402: Structured extraction from raw text
- Parse extracted text into skills, years of experience, and education entries, mapped into the Resume schema from EPIC 3
- **Acceptance:** extractor tested against at least 10 real-world resume samples with varied formatting

### TICKET-403: Matching engine interface
- Define a `MatchScorer` interface (TypeScript interface + strategy implementations); `MatchResult` model (score, breakdown, computedAt)
- **Acceptance:** interface allows swapping scoring implementations without touching calling code

### TICKET-404: Baseline keyword/skill overlap scorer
- Implement weighted overlap scoring between JobPosting required skills and Resume skills
- **Acceptance:** score breakdown lists which required skills matched and which didn't

### TICKET-405: Match recomputation trigger
- Recompute `MatchResult` when the referenced Resume version or JobPosting changes
- **Acceptance:** stale MatchResults never served; recompute completes within acceptable latency for typical resume size

---

## EPIC 5: Caching

### TICKET-501: Redis setup
- `docker-compose` service for Redis; `ioredis` client config
- **Acceptance:** app connects to Redis on boot, fails fast with a clear error if unavailable

### TICKET-502: Job listing cache
- Cache-aside for `GET /job-postings` list/filter results, TTL-based
- **Acceptance:** cached response served on repeat identical query within TTL window; cache miss falls through to DB

### TICKET-503: Cache invalidation on job posting edits
- Evict/refresh relevant cache entries on `POST`/`PATCH` to `/job-postings`
- **Acceptance:** edited posting reflects immediately in the listing endpoint, no stale read within test window

### TICKET-504: Idempotency keys for application submission
- Client-supplied idempotency key stored in Redis with short TTL on `POST /applications`
- **Acceptance:** duplicate request with same key returns the original result, does not create a second Application

---

## EPIC 6: Logging & Observability

### TICKET-601: Structured logging with correlation IDs
- `pino` JSON logger; correlation ID generated per request (middleware), propagated through async/event processing
- **Acceptance:** a single correlation ID traceable across submit → parse → score log lines

### TICKET-602: Ship logs to Loki or ELK
- `docker-compose` stack; app configured to ship logs
- **Acceptance:** logs queryable by correlation ID in the chosen log UI

### TICKET-603: Business metrics via prom-client
- `prom-client` counters/histograms for application-to-interview conversion rate, average time-to-match, resume parse failure rate
- **Acceptance:** metrics exposed on `/metrics`, scraped successfully by local Prometheus

### TICKET-604: Grafana dashboard
- Build a dashboard visualizing the TICKET-603 metrics
- **Acceptance:** dashboard reflects real values after generating test traffic

---

## EPIC 7: Event-Driven Architecture

### TICKET-701: Kafka/RabbitMQ setup
- `docker-compose` service, topic/queue provisioning via `kafkajs` (or `amqplib` for RabbitMQ) for application lifecycle events
- **Acceptance:** producer/consumer smoke test round-trips a message successfully

### TICKET-702: Outbox pattern for ApplicationSubmitted
- Outbox table + relay process publishing `ApplicationSubmitted` after commit
- **Acceptance:** killing the app mid-transaction never results in a committed Application with no published event, or vice versa

### TICKET-703: ResumeParsed and MatchScored event producers
- Publish `ResumeParsed` and `MatchScored` events at each stage of the async matching pipeline
- **Acceptance:** full event trail visible for a single application from submission to scored match

### TICKET-704: RecruiterNotified consumer
- Consume `MatchScored`, trigger recruiter notification (email/in-app) off the request path
- **Acceptance:** application submission response returns before notification is sent; notification still arrives

### TICKET-705: Dead-letter queue handling
- Route events failing processing after N retries to a DLQ; alert/log on DLQ writes
- **Acceptance:** a deliberately malformed event lands in the DLQ instead of retrying indefinitely

---

## EPIC 8: Search

### TICKET-801: Elasticsearch/OpenSearch setup
- `docker-compose` service, index mapping for JobPosting via `@elastic/elasticsearch` client
- **Acceptance:** manual document indexed and retrievable via a test query

### TICKET-802: JobPosting index sync
- Consume JobPosting change events (from EPIC 7) to keep the index in sync
- **Acceptance:** editing a posting reflects in search results within a defined sync window, verified by test

### TICKET-803: Faceted job search endpoint
- `GET /search/job-postings?location=&seniority=&skills=` backed by Elasticsearch
- **Acceptance:** results ranked by relevance, facets return accurate counts

---

## EPIC 9: Scaling & Load Balancing

### TICKET-901: Containerize the backend service
- Dockerfile, multi-stage build (compile TypeScript, then run the compiled JS in a slim Node image)
- **Acceptance:** image builds and runs the app with no source mounted, connecting to external Postgres/Redis/Kafka

### TICKET-902: Multi-instance local setup
- `docker-compose` running 2–3 app instances
- **Acceptance:** all instances boot and connect to shared dependencies without port conflicts

### TICKET-903: Load balancer configuration
- Nginx/Traefik round robin in front of the instances
- **Acceptance:** repeated requests visibly distributed across instances (verified via per-instance logs/headers)

### TICKET-904: Health check wiring
- `GET /health` endpoint (checks DB/Redis connectivity) wired into load balancer health checks
- **Acceptance:** load balancer stops routing to an instance that fails its health check

### TICKET-905: Statelessness audit
- Review and remove any in-memory session/cache state incompatible with multi-instance deployment
- **Acceptance:** a request can be served correctly regardless of which instance handles it

### TICKET-906: Graceful shutdown
- Handle `SIGTERM` to stop accepting new connections and let in-flight requests (e.g. PDF generation) complete before exit
- **Acceptance:** a request started just before the shutdown signal completes successfully

---

## EPIC 10: CI/CD & Deployment

### TICKET-1001: Full CI pipeline
- Extend the CI skeleton: lint, test, type-check, build Docker image
- **Acceptance:** pipeline produces a tagged image artifact on successful build

### TICKET-1002: Image registry push
- Push built images to a container registry on merge to `main`
- **Acceptance:** image pullable from registry with the correct tag

### TICKET-1003: Staging environment
- Provision staging (Render/Railway/DigitalOcean), auto-deploy from a `staging` branch
- **Acceptance:** staging reflects the latest staging-branch build within a defined window

### TICKET-1004: Production deployment
- Provision production environment, deploy step gated by manual approval or `main`-branch merge
- **Acceptance:** production deploy completes without manual server access

### TICKET-1005: Rolling deploy
- Zero-downtime deploy strategy using the TICKET-904 health checks
- **Acceptance:** a deploy completes with no failed requests observed during the rollout window

---

## EPIC 11: Security & Hardening

### TICKET-1101: Rate limiting
- Rate limit `/resumes/upload` and `/applications` via `express-rate-limit` or at the Nginx level
- **Acceptance:** requests beyond threshold return 429, legitimate traffic unaffected

### TICKET-1102: File upload hardening
- Validate file type/size server-side, store uploads in object storage (S3-compatible), not local disk
- **Acceptance:** disallowed file types rejected before storage; oversized files rejected with a clear error

### TICKET-1103: Secrets management audit
- Move all secrets to env vars/secrets manager; scan git history for committed credentials
- **Acceptance:** no secrets present in repository history or source files

### TICKET-1104: PII handling and retention policy
- Document what candidate data is retained, for how long, and per-role visibility
- **Acceptance:** policy reviewed and endpoints cross-checked against it (no field returned to an unauthorized role)