# LMS Backend Architecture Design (Frontend-Aligned)

## 1) Purpose

This document defines a secure, scalable, and optimized NestJS backend that matches the existing React LMS frontend structure.

Primary goals:
- Align backend domains with current frontend modules and workflows.
- Replace `localStorage`-driven data flows with real APIs.
- Enforce strong authentication, role-based authorization, and auditability.
- Support scale for high read traffic (dashboards/reports) and write-heavy flows (attendance, submissions, grading).

---

## 2) Frontend Analysis Summary

### 2.1 Role Portals and Navigation

Current React routing maps to three role portals:
- `admin`: dashboard, create-class, students, teachers, fee, communication, planner, attendance, leave-requests, announcements, reports
- `teacher`: dashboard, classes, gradebook, assignments, attendance, timetable, createQuiz, checkQuizzes, leave, communication, announcements
- `student`: dashboard, courses, grades, attendance, assignments, quizzes, timetable, announcements, profile, leave

### 2.2 Current Client-Side Data Sources (to replace with APIs)

The frontend currently persists core state in `localStorage` keys:
- `students`, `teachers`, `announcements`
- `fee-transactions`, `audit-logs`, `planner-allocations`, `custom-classes`, `class-subjects`
- `teacher-attendance`
- `teacher-quizzes`, `quiz-submissions`
- `teacher-gradebook-entries`
- `admin-announcements` (password reset requests)

### 2.3 Observed Domain Objects

From frontend types/components, the backend must support:
- Users and profiles (admin/teacher/student, guardian contacts)
- Classes, subjects, timetable allocations
- Attendance sessions + per-student attendance entries
- Assignments + submissions + grading feedback
- Quizzes + questions/options + submissions + review
- Gradebook entries (assessment-level marks)
- Fee ledger and transactions
- Leaves (student + teacher)
- Announcements and notifications
- Parent communication logs (channel + recipients + template/custom messages)
- Audit logs for sensitive actions

---

## 3) Target Architecture

## 3.1 Style

Use a **modular monolith** in NestJS first (single deployable), designed for later service extraction.

Why this fits now:
- Faster development and simpler operations.
- Strong transactional consistency across academic workflows.
- Clear module boundaries allow future split into microservices if needed.

### 3.2 High-Level Layers

- **API Layer**: Controllers, DTO validation, auth guards, serialization.
- **Application Layer**: Use-case services, orchestration, policy checks.
- **Domain Layer**: Entities/value rules (status transitions, grade validation).
- **Infrastructure Layer**: ORM repositories, cache, queue, storage adapters, external gateways.

### 3.3 Proposed NestJS Module Map

- `auth` (login, refresh, password reset requests)
- `users` (base identity + role metadata)
- `students`
- `teachers`
- `classes` (class groups, subject mapping, enrollment)
- `attendance` (teacher submissions, admin review/update)
- `assignments` (teacher create, student submit, teacher mark)
- `quizzes` (teacher create, student attempt, teacher review)
- `gradebook` (teacher entries, student views)
- `fees` (dues, transactions, receipts)
- `announcements` (global/class-targeted)
- `leaves` (student/teacher requests, approvals)
- `communication` (parent messaging campaign logs)
- `reports` (aggregations for admin dashboard)
- `audit` (immutable event trail)
- `notifications` (in-app and optional external channels)
- `health` (liveness/readiness)
- `common` (guards, interceptors, exceptions, utilities)

---

## 4) Security Architecture

### 4.1 Authentication

- JWT access token (short TTL, e.g., 15m) + refresh token (rotated, revocable).
- Passwords hashed with Argon2.
- Login by email/ID depending on role policy.
- Session metadata table for device/session control.

### 4.2 Authorization

Use **RBAC + scope checks**:
- Roles: `ADMIN`, `TEACHER`, `STUDENT`.
- Scope constraints:
  - Teacher can only access assigned classes/students.
  - Student can only access own records/submissions.
  - Admin full school scope.

Implement with:
- `RolesGuard` for role-level enforcement.
- `PolicyGuard` for resource ownership/class membership checks.

### 4.3 Data Protection

- DTO validation via `class-validator` + global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`).
- NoSQL injection protection via strict DTO validation, allow-listed query filters, and disallowing raw Mongo operators from client input.
- Helmet, strict CORS allow-list, request size limits.
- Sensitive field masking in logs (phone/email/token/guardian details when needed).

### 4.4 Abuse & Integrity Controls

- Rate limits on auth and write-heavy endpoints.
- Idempotency keys for critical write paths (fees, attendance submit, quiz submit).
- Optimistic concurrency/version checks for grade/attendance edits.
- Immutable audit events for high-risk actions:
  - fee operations
  - marks changes
  - attendance edits
  - leave status changes
  - announcement publish/delete

---

## 5) Data Model (Document, MongoDB Atlas)

Suggested core collections (minimum):

- `users` (_id, role, email, passwordHash, status, lastLoginAt)
- `students` (_id, userId ref, admissionNo, guardian, classRef, profile)
- `teachers` (_id, userId ref, employeeNo, qualification, classes[], profile)
- `classes` (_id, grade, section, academicYear)
- `subjects` (_id, name, code)
- `teacherClassSubjects` (_id, teacherId, classId, subjectId)
- `enrollments` (_id, studentId, classId, status, startDate)

- `announcements` (_id, title, content, priority, authorId, scopeType, publishedAt, targets[])

- `attendanceSessions` (_id, classId, teacherId, date, time, classType, roomMode, entries[])

- `assignments` (_id, teacherId, subjectId, classId, title, instructions, dueAt, totalMarks, targets[])
- `assignmentSubmissions` (_id, assignmentId, studentId, submittedAt, files[], status, grade)

- `quizzes` (_id, teacherId, subjectId, classId, title, dueAt, description, questions[])
- `quizSubmissions` (_id, quizId, studentId, submittedAt, answers[], score, total, checked, feedback)

- `gradebookEntries` (_id, teacherId, classId, subjectId, term, assessment, totalMarks, marks[])

- `feeInvoices` (_id, studentId, period, amountDue, status)
- `feeTransactions` (_id, invoiceId, amount, method, collectorId, receiptNo, paidAt)

- `leaveRequests` (_id, requesterUserId, requesterRole, type, fromDate, toDate, reason, status, reviewedBy)

- `communicationLogs` (_id, senderId, channel, templateType, recipientsCount, payloadMeta, sentAt)

- `auditLogs` (_id, actorId, module, action, entityType, entityId, beforeJson, afterJson, createdAt)

### 5.1 MongoDB Modeling Notes

- Embed bounded subdocuments for write-together data (`questions[]`, `options[]`, `attendance entries[]`, `gradebook marks[]`).
- Use references for large/independently queried data (`users`, `students`, `teachers`, `assignments`, `quizzes`).
- Use MongoDB transactions (session-based) for critical multi-document consistency (fee posting, grading updates + audit log).

### 5.2 Critical Indexes

- `attendanceSessions`: `{ classId: 1, date: -1 }`
- `attendanceSessions.entries.studentId` (multikey)
- `quizSubmissions`: `{ studentId: 1, submittedAt: -1 }`
- `assignmentSubmissions`: unique compound `{ studentId: 1, assignmentId: 1 }`
- `feeTransactions`: unique `{ receiptNo: 1 }`
- `announcements`: `{ publishedAt: -1, priority: 1 }`
- `auditLogs`: `{ createdAt: -1, module: 1 }`

---

## 6) API Design (v1)

Base path: `/api/v1`

### 6.1 Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password-reset-requests`

### 6.2 Users/Profiles
- `GET /me`
- `PATCH /me/profile`
- `GET /users/:id` (admin)

### 6.3 Admin-Student-Teacher Management
- `GET /students` (filter by class/status/search)
- `POST /students`
- `PATCH /students/:id`
- `GET /teachers`
- `POST /teachers`
- `PATCH /teachers/:id`

### 6.4 Classes & Planning
- `GET /classes`
- `POST /classes`
- `DELETE /classes/:id`
- `POST /classes/:id/subjects`
- `DELETE /classes/:id/subjects/:subjectId`
- `GET /planner/allocations`
- `POST /planner/allocations`
- `DELETE /planner/allocations/:id`

### 6.5 Attendance
- `POST /attendance/sessions` (teacher submit)
- `GET /attendance/sessions` (admin/teacher)
- `GET /attendance/students/:studentId`
- `PATCH /attendance/entries/:entryId` (admin correction)

### 6.6 Assignments
- `POST /assignments` (teacher)
- `GET /assignments` (teacher/student scoped)
- `GET /assignments/:id`
- `POST /assignments/:id/submissions` (student)
- `PATCH /assignments/submissions/:submissionId/grade` (teacher)

### 6.7 Quizzes
- `POST /quizzes` (teacher)
- `GET /quizzes` (teacher/student scoped)
- `GET /quizzes/:id`
- `POST /quizzes/:id/submissions` (student)
- `PATCH /quizzes/submissions/:submissionId/review` (teacher)

### 6.8 Gradebook
- `POST /gradebook/entries` (teacher)
- `GET /gradebook/entries` (teacher/admin)
- `GET /gradebook/students/:studentId` (student/admin)

### 6.9 Fees
- `GET /fees/students/:studentId/summary`
- `POST /fees/transactions`
- `GET /fees/transactions`
- `GET /fees/reports/dues`

### 6.10 Leaves
- `POST /leaves`
- `GET /leaves`
- `PATCH /leaves/:id/status` (teacher/admin based on policy)

### 6.11 Announcements & Notifications
- `GET /announcements`
- `POST /announcements`
- `DELETE /announcements/:id`
- `GET /notifications`
- `PATCH /notifications/:id/read`

### 6.12 Communication & Audit
- `POST /communications/parent-messages` (log request and delivery metadata)
- `GET /communications/logs`
- `GET /audit/logs`

### 6.13 Reports/Dashboard
- `GET /reports/admin/overview`
- `GET /reports/admin/attendance`
- `GET /reports/admin/fees`
- `GET /reports/admin/academics`

---

## 7) Scalability & Performance Strategy

### 7.1 Caching
- Redis cache for read-heavy endpoints:
  - dashboard aggregates
  - announcements feed
  - student summary cards
- Short TTL (30s–5m), explicit invalidation on writes.

### 7.2 Async Processing
- Queue (BullMQ + Redis) for:
  - notification fan-out
  - report generation
  - email/WhatsApp integrations
  - heavy audit export jobs

### 7.3 Pagination & Filtering
- Enforce pagination defaults and max limits.
- Cursor pagination for activity feeds/logs.
- Server-side filtering/sorting for tables (students, submissions, transactions).

### 7.4 Query Optimization
- Use projection DTOs (avoid over-fetching).
- Add query-level indexes based on admin dashboard/report access patterns.
- Use Atlas replica set read preference tuning (`primary`/`secondaryPreferred`) for report-heavy workloads.

### 7.5 File Handling
- Use Cloudinary for images and PDF/document uploads.
- Persist only Cloudinary metadata in MongoDB (publicId, resourceType, version, bytes, format, secureUrl).
- Prefer signed upload presets and signed delivery URLs for protected files.

---

## 8) Frontend Integration Contract

### 8.1 Migration from localStorage to API

Phase frontend data sources from `localStorage` to API-backed React Query hooks:
- Replace `usePersistentState` in admin with API query/mutation hooks.
- Keep optimistic updates for fast UX on marks/attendance where appropriate.
- Use query keys per module (`students`, `teacher-quizzes`, etc.) and invalidate selectively.

### 8.2 Response Envelope

Standard API response:
- success payload `{ data, meta }`
- error payload `{ code, message, details?, requestId }`

### 8.3 Versioning

- Start with `/api/v1`.
- Maintain backward compatibility per minor frontend release.

---

## 9) Non-Functional Requirements

- Availability target: 99.9% for school hours.
- P95 latency target:
  - Reads: < 250ms
  - Writes: < 400ms
- Audit retention: configurable (e.g., 1–3 years).
- Centralized logs with correlation ID per request.

---

## 10) NestJS Project Structure (Recommended)

```text
src/
  main.ts
  app.module.ts
  common/
    guards/
    interceptors/
    decorators/
    filters/
    pipes/
    dto/
  config/
    configuration.ts
    validation.ts
  database/
    mongoose/
    schemas/
    indexes/
    seed/
  modules/
    auth/
    users/
    students/
    teachers/
    classes/
    attendance/
    assignments/
    quizzes/
    gradebook/
    fees/
    announcements/
    leaves/
    communication/
    notifications/
    reports/
    audit/
    health/
  integrations/
    cloudinary/
    whatsapp/
    email/
```

---

## 11) Suggested Implementation Roadmap

### Phase 1 (Foundation)
- Configure Nest global security middleware (helmet, CORS, validation, rate limit).
- Implement `auth`, `users`, `students`, `teachers`, `classes`.
- Add MongoDB Atlas connection (`@nestjs/mongoose`) + schema/index setup + seed from current mock datasets.

### Phase 2 (Core Academic Workflows)
- Implement `attendance`, `assignments`, `quizzes`, `gradebook` modules.
- Add RBAC + policy guards for teacher/student scope.
- Migrate related frontend screens to API hooks.

### Phase 3 (Admin Ops)
- Implement `fees`, `announcements`, `leaves`, `communication`, `audit`.
- Add dashboard/report endpoints and aggregate caching.

### Phase 4 (Scale & Reliability)
- Add Redis caching + BullMQ workers.
- Add structured logging, metrics, tracing, SLO dashboards.
- Add load tests and query profiling for hot endpoints.

---

## 12) Key Engineering Decisions

1. **Modular monolith first** to optimize delivery speed and maintainability.
2. **MongoDB Atlas as source of truth** with document modeling + indexed query paths for transactional and reporting flows.
3. **JWT + RBAC + policy checks** for strict data access control.
4. **Cache/queue optional at start but designed-in** for scale-ready evolution.
5. **Cloudinary for media/document storage** with metadata-only persistence in MongoDB.
6. **Frontend-aligned API contracts** to minimize migration risk from local storage state.

---

## 13) Immediate Next Step

After document approval, implement backend skeleton in this exact order:
1) `auth + users + students + teachers + classes`
2) `attendance + quizzes`
3) `assignments + gradebook`
4) `fees + leaves + announcements + communication + reports + audit`

This sequence gives quick frontend value while building secure foundations first.
