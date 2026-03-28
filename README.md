# Formation Continue Platform

A full-stack training management platform for continuous professional education.

This repository contains:
- `backend/`: FastAPI + SQLAlchemy async API, role-based workflows, and business logic.
- `frontend/`: Next.js App Router web app for public pages and role-specific dashboards.
- `complementary.md`: feature specification for the post-results cohort training phase.

This README reflects the codebase as currently implemented, including what has been completed from `complementary.md` and what remains.

## 1. Project Overview

The platform supports a call-for-applicants lifecycle:
1. Coordinators publish calls.
2. Companies apply.
3. Employees submit documents.
4. Coordinators review and publish results.
5. Training execution is organized through cohorts.

Implemented roles include:
- `admin`
- `coordinator`
- `staff`
- `professor`
- `company`
- `employee`

## 2. Tech Stack

### Backend
- Python, FastAPI, Uvicorn
- SQLAlchemy 2 (async), Alembic
- PostgreSQL (asyncpg/psycopg2-binary)
- Redis
- Celery
- fastapi-mail / aiosmtplib

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lucide React icons

## 3. Repository Structure

```text
formation-continue/
  backend/
    app/
      api/
      db/
      services/
      schemas/
      core/
      main.py
    migrations/
    requirements.txt
  frontend/
    app/
    components/
    contexts/
    hooks/
    lib/
    types/
    package.json
  complementary.md
```

## 4. Cohort Training Phase (from complementary.md)

`complementary.md` requested a full "post-results training execution" flow centered on cohorts and explicitly asked to avoid manual migration generation.

### 4.1 Coverage Matrix

- `[x]` Step 1: Create Cohort
  - Coordinator UI page exists: `/coordinator/cohorts`.
  - Backend APIs exist for listing/form-options/creation.
  - Training margin fields are enforced (start/end date + daily start/end hours).

- `[x]` Step 2: Assign Professors
  - Coordinator can fetch available professors and assign one or more to a cohort.
  - Assignment is persisted through `cohort_professor_assignments`.

- `[x]` Step 3: Professor Session Scheduling
  - Professors can list assigned cohorts and create/update/delete sessions.
  - Validation is implemented in backend service to reject sessions outside cohort date/hour margins.

- `[x]` Step 4: Employee Dynamic Training Calendar
  - Employee page `/employee/training` displays session calendar from cohort sessions.
  - Data is loaded dynamically from API and updates when sessions are changed.

- `[x]` Step 5: Course Materials Access in Training View
  - Professors can upload course materials.
  - Employees can view/download materials on `/employee/training`.
  - Current implementation links materials by course and exposes them in cohort training context.

- `[ ]` Step 6: Attendance
  - No active attendance model/API/UI in current runtime code.
  - Attendance appears only in legacy/old model artifacts, not in the active cohort workflow.

- `[~]` Step 7: Coordinator Monitoring (partial)
  - Coordinator can view cohorts and assigned professors.
  - Full monitoring panel for session list, attendance stats, and enrolled employees per cohort is not fully implemented as a dedicated feature set.

### 4.2 What Was Explicitly Considered from complementary.md

- Cohort as central post-results entity: implemented.
- Margin-constrained session scheduling: implemented (frontend validation + backend authoritative validation).
- End-to-end website visibility (not backend-only): implemented for cohort creation, assignment, professor scheduling, employee training calendar/materials.
- Attendance and full coordinator monitoring: not completed yet.

## 5. Backend Details

### 5.1 Main API Router Prefix
- Base prefix: `/api/v1`

### 5.2 Important API Groups
- `/auth`: authentication, verification, token refresh/logout.
- `/calls`, `/applications`, `/submissions`: call and review workflow.
- `/coordinator`: coordinator dashboards and cohort management.
- `/professor`: professor dashboard, courses, materials, cohort sessions.
- `/employee/training`: employee training calendar and materials.
- `/materials`: material listing/download access.

### 5.3 Cohort-Related Endpoints

Coordinator:
- `GET /api/v1/coordinator/cohorts`
- `GET /api/v1/coordinator/cohorts/form-options`
- `POST /api/v1/coordinator/cohorts`
- `GET /api/v1/coordinator/cohorts/{cohort_id}/available-professors`
- `PUT /api/v1/coordinator/cohorts/{cohort_id}/professors`

Professor:
- `GET /api/v1/professor/my-cohorts`
- `GET /api/v1/professor/my-cohorts/{cohort_id}/sessions`
- `POST /api/v1/professor/my-cohorts/{cohort_id}/sessions`
- `PUT /api/v1/professor/my-cohorts/{cohort_id}/sessions/{session_id}`
- `DELETE /api/v1/professor/my-cohorts/{cohort_id}/sessions/{session_id}`

Employee:
- `GET /api/v1/employee/training/calendar`
- `GET /api/v1/employee/training/materials`

Materials:
- `GET /api/v1/materials/download/{material_id}`

### 5.4 Active Cohort Data Model

Core entities in active model:
- `Cohort`
- `CohortProfessorAssignment`
- `CohortSession`

Relations:
- Cohort -> call, course, professors, sessions.
- Professor assignment is many-to-many via assignment table.
- Sessions belong to a cohort and a professor.

## 6. Frontend Details

### 6.1 Main User-Facing Areas
- Public pages: landing, calls, news, auth.
- Coordinator dashboard and workflows.
- Professor dashboard and workflows.
- Employee dashboard and workflows.

### 6.2 Cohort/Training UI Pages

Coordinator:
- `/coordinator/cohorts`: create cohorts, select calls/courses, define margins, assign professors.

Professor:
- `/professor`: includes assigned cohorts and session management blocks.
- `/professor/sessions`: focused cohort session management view.

Employee:
- `/employee/training`: grouped calendar view + cohort materials + download.

## 7. Environment Variables

### 7.1 Backend (`backend/.env`)
Required by `backend/app/core/config.py`:
- `database_url`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRY`
- `REFRESH_TOKEN_EXPIRY_DAYS`
- `REDIS_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_PORT`
- `MAIL_SERVER`
- `MAIL_FROM_NAME`
- Optional:
  - `MAIL_STARTTLS`
  - `MAIL_SSL_TLS`
  - `DOMAIN`
  - `FRONTEND_URL`
  - upload and file-size related overrides

### 7.2 Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`)
- `NEXT_PUBLIC_UPLOADS_URL` (default: `http://localhost:8000`)

## 8. Local Development Setup

## 8.1 Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Run migrations (autogenerated migration chain):

```bash
alembic upgrade head
```

Run API server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional Celery worker:

```bash
celery -A app.celery_tasks.celery_app worker --loglevel=info
```

## 8.2 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:
- `http://localhost:3000`

## 8.3 End-to-End Local Run

1. Start PostgreSQL and Redis.
2. Start backend at `:8000`.
3. Start frontend at `:3000`.
4. Verify frontend env points to backend API.

## 9. Migrations Policy

`complementary.md` explicitly requested no manual migration generation during the cohort feature implementation.

Current state:
- Cohort runtime code is present in models/services/apis/ui.
- Existing migration history remains in `backend/migrations/versions/`.
- If schema drift exists in your environment, generate migrations from your local final model state only when you are ready.

## 10. Known Gaps and Next Priorities

### 10.1 Not Yet Implemented
- Attendance workflow (present/absent/late recording + employee attendance history).
- Dedicated coordinator cohort monitoring panel with full training execution analytics (sessions + attendance stats + enrolled employees in one place).

### 10.2 Recommended Next Steps
1. Add active attendance model(s), schemas, service, and APIs in current model set.
2. Add professor attendance UI on top of cohort sessions.
3. Add employee attendance history page in `My Training`.
4. Add coordinator monitoring widgets for cohort execution metrics.

## 11. Notes

- The project includes some legacy files (`models_old.py` etc.) not driving the active runtime workflow.
- Material download authorization is role-aware and enforced in backend.
- Upload directories are initialized at app startup and served via `/uploads`.

---

If you want, the next documentation step can be a separate `docs/cohort-workflow.md` with sequence diagrams and test scenarios for each complementary requirement.
