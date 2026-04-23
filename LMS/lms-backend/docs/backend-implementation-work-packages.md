# LMS Backend Implementation Work Packages (Small, Manageable Pieces)

## 1) Goal

This document breaks backend implementation into small packages you can build, test, and merge safely.

Target stack:
- NestJS
- MongoDB Atlas (`@nestjs/mongoose`)
- Cloudinary (images + PDFs)
- Redis/BullMQ (later packages)

---

## 2) Working Rules (Keep Pieces Small)

- One package = 1 focused outcome.
- Keep each package to ~1 day of work.
- PR size target: under 400 changed lines when possible.
- Every package must include:
  - Code
  - Validation
  - Minimal test(s)
  - Short README note update (if behavior changed)

### Definition of Done for each package

- Build passes: `npm run build`
- Lint passes: `npm run lint`
- Tests pass for touched module(s)
- Endpoints documented (DTO + sample request/response)

---

## 3) Package Template (Use for Every Slice)

Use this mini template while executing each package:

1. Scope (what is included, what is excluded)
2. Files/modules to create/update
3. Endpoint(s) or service API
4. Validation + auth rules
5. Test cases
6. Rollback plan

---

## 4) Execution Plan (Atomic Work Packages)

## Package 00 — Project Baseline

**Objective**
- Prepare backend foundation for modular work.

**Tasks**
- Add environment config module (`dotenv` + validation schema).
- Add global `ValidationPipe`, CORS allow-list, `helmet`.
- Add request ID interceptor + basic logger format.
- Add `/health` endpoint.

**Deliverable**
- App boots with secure defaults and health check.

**Acceptance**
- `GET /health` returns `ok`.

---

## Package 01 — MongoDB Atlas Connection

**Objective**
- Connect NestJS to MongoDB Atlas safely.

**Tasks**
- Install and configure `@nestjs/mongoose` + `mongoose`.
- Add connection retry strategy and timeout config.
- Add startup check log for DB connectivity.

**Deliverable**
- Stable DB connection through env vars.

**Acceptance**
- App starts only when DB config is valid.
- Connection failure returns clear startup error.

---

## Package 02 — Auth Core (Login + JWT)

**Objective**
- Enable secure authentication for admin/teacher/student.

**Tasks**
- Create `auth` module with `login`, `refresh`, `logout`.
- Add JWT strategy + role enum.
- Add password hashing with Argon2.
- Add refresh token rotation model.

**Deliverable**
- Token-based auth flows operational.

**Acceptance**
- Valid credentials return access + refresh tokens.
- Invalid credentials return standardized error.

---

## Package 03 — Authorization Guards

**Objective**
- Enforce RBAC and scope checks.

**Tasks**
- Build `RolesGuard` and `PolicyGuard`.
- Add decorators: `@Roles()`, `@CurrentUser()`.
- Add class-level scope checks for teacher/student resources.

**Deliverable**
- Role and ownership access control in place.

**Acceptance**
- Teacher cannot access unrelated class/student records.
- Student cannot access other student data.

---

## Package 04 — Users Module

**Objective**
- Store base user identity/profile data.

**Tasks**
- Create `users` schema/service/controller.
- Add `GET /me`, `PATCH /me/profile`.
- Add secure serialization (exclude sensitive fields).

**Deliverable**
- Identity/profile endpoints working.

**Acceptance**
- Response never exposes password hash or refresh secrets.

---

## Package 05 — Students Module (Read + Create + Update)

**Objective**
- Implement student management for admin flows.

**Tasks**
- Create `students` schema with guardian + class refs.
- Add `GET /students`, `POST /students`, `PATCH /students/:id`.
- Add filter support: class/status/search.

**Deliverable**
- Admin can manage students from API.

**Acceptance**
- Filters return correct subsets.
- Validation rejects malformed guardian/contact payloads.

---

## Package 06 — Teachers Module (Read + Create + Update)

**Objective**
- Implement teacher management.

**Tasks**
- Create `teachers` schema.
- Add `GET /teachers`, `POST /teachers`, `PATCH /teachers/:id`.
- Include classes + subject assignment fields.

**Deliverable**
- Admin teacher management APIs aligned with frontend.

**Acceptance**
- Teacher class/subject mapping persists and retrieves correctly.

---

## Package 07 — Classes Module

**Objective**
- Manage classes and class-subject relationships.

**Tasks**
- Add class schema and subject mapping schema.
- Add endpoints:
  - `GET /classes`
  - `POST /classes`
  - `DELETE /classes/:id`
  - `POST /classes/:id/subjects`
  - `DELETE /classes/:id/subjects/:subjectId`

**Deliverable**
- Class administration complete for admin portal basics.

**Acceptance**
- Duplicate class/subject mapping prevented.

---

## Package 08 — Attendance Module

**Objective**
- Replace `teacher-attendance` local storage flow.

**Tasks**
- Create `attendanceSessions` schema with embedded `entries[]`.
- Endpoints:
  - `POST /attendance/sessions`
  - `GET /attendance/sessions`
  - `GET /attendance/students/:studentId`
  - `PATCH /attendance/entries/:entryId`
- Add idempotency key for session submit.

**Deliverable**
- Teacher submit + admin review/correction flow.

**Acceptance**
- Duplicate submissions with same idempotency key are ignored safely.

---

## Package 09 — Quizzes Module

**Objective**
- Replace `teacher-quizzes` + `quiz-submissions` local storage flow.

**Tasks**
- Create `quizzes` schema (embedded questions/options).
- Create `quizSubmissions` schema.
- Endpoints:
  - `POST /quizzes`
  - `GET /quizzes`
  - `GET /quizzes/:id`
  - `POST /quizzes/:id/submissions`
  - `PATCH /quizzes/submissions/:submissionId/review`

**Deliverable**
- Teacher create/review and student attempt flow complete.

**Acceptance**
- Student cannot submit quiz outside own class.

---

## Package 10 — Assignments Module

**Objective**
- Implement assignment create/submit/grade lifecycle.

**Tasks**
- Create `assignments` and `assignmentSubmissions` schemas.
- Add target students/classes support.
- Endpoints:
  - `POST /assignments`
  - `GET /assignments`
  - `GET /assignments/:id`
  - `POST /assignments/:id/submissions`
  - `PATCH /assignments/submissions/:submissionId/grade`

**Deliverable**
- Assignment workflow API-ready.

**Acceptance**
- Unique `(studentId, assignmentId)` submission rule enforced.

---

## Package 11 — Cloudinary Integration (Images + PDF)

**Objective**
- Add production-grade media/document storage.

**Tasks**
- Add `cloudinary` integration module/service.
- Add signed upload support for image/pdf.
- Store metadata only in MongoDB (`publicId`, `resourceType`, `format`, `bytes`, `secureUrl`).
- Add endpoints:
  - `POST /files/upload-signature`
  - `POST /files/confirm`

**Deliverable**
- Secure image/PDF handling integrated.

**Acceptance**
- Upload accepts only allowed formats and size limits.
- Sensitive files delivered via signed URLs when required.

---

## Package 12 — Gradebook Module

**Objective**
- Implement marks entry and student grade retrieval.

**Tasks**
- Create `gradebookEntries` schema with embedded marks.
- Endpoints:
  - `POST /gradebook/entries`
  - `GET /gradebook/entries`
  - `GET /gradebook/students/:studentId`
- Add validation (`marks <= totalMarks`).

**Deliverable**
- Teacher gradebook and student view APIs.

**Acceptance**
- Marks outside bounds are rejected with clear errors.

---

## Package 13 — Fees Module

**Objective**
- Implement fee summary and transactions.

**Tasks**
- Create `feeInvoices` + `feeTransactions` schemas.
- Endpoints:
  - `GET /fees/students/:studentId/summary`
  - `POST /fees/transactions`
  - `GET /fees/transactions`
  - `GET /fees/reports/dues`
- Add unique receipt number generation.

**Deliverable**
- Fee operations aligned with admin fee management flow.

**Acceptance**
- Duplicate receipt number is impossible.

---

## Package 14 — Leaves + Announcements + Communication

**Objective**
- Deliver core school communication and leave processes.

**Tasks**
- `leaves` module: create/list/update status.
- `announcements` module: publish/list/delete with scope targets.
- `communication` module: log parent message campaigns.
- Add role-specific approvals and transitions.

**Deliverable**
- Ops and communication modules complete.

**Acceptance**
- Status transitions follow policy (pending -> approved/rejected only).

---

## Package 15 — Audit Logging

**Objective**
- Track sensitive state changes.

**Tasks**
- Create `auditLogs` collection.
- Add reusable `AuditService`.
- Emit logs for fee, grades, attendance edits, leave approvals, announcements.

**Deliverable**
- Immutable action trail available for admin.

**Acceptance**
- Audit record generated for every protected mutation path.

---

## Package 16 — Reports + Caching + Queue

**Objective**
- Optimize performance and async processing.

**Tasks**
- Implement report endpoints:
  - `/reports/admin/overview`
  - `/reports/admin/attendance`
  - `/reports/admin/fees`
  - `/reports/admin/academics`
- Add Redis cache for aggregates.
- Add BullMQ for notification/report jobs.

**Deliverable**
- Fast dashboards and scalable background processing.

**Acceptance**
- Repeat report requests hit cache and reduce query cost.

---

## 5) Suggested Timeline (Manageable Pace)

- Week 1: Packages 00–04
- Week 2: Packages 05–08
- Week 3: Packages 09–12
- Week 4: Packages 13–16

If team size is small (1–2 engineers), do one package per day and keep one day per week for bug-fix/refactor.

---

## 6) Minimal Testing Strategy Per Package

- Unit tests: service logic + validation.
- Integration tests: endpoint + auth guard behavior.
- E2E smoke tests: login, protected route access, one write flow.

Critical E2E path after each week:
- Admin login -> create class -> create student
- Teacher login -> submit attendance -> create quiz
- Student login -> submit quiz -> fetch grades

---

## 7) Risk Control Checklist

- Keep backward-compatible API contracts while frontend migrates from `localStorage`.
- Feature flag new APIs when replacing frontend modules.
- Add indexes before high-volume data import.
- Add pagination from first release for list endpoints.
- Prevent over-fetching with DTO projections.

---

## 8) Next Execution Command

Start with Package 00 and Package 01 only. Do not open new module packages until:
- config is stable,
- MongoDB Atlas connection is production-safe,
- health checks and basic observability are in place.
