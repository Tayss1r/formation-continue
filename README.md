# Formation Continue Platform

Web-based training and cohort management platform for continuous professional education, built for institutions that manage calls for applications, candidate selection, training delivery, and post-selection cohort execution.

## Table of Contents

- [Project Title and Description](#project-title-and-description)
- [Problem and Solution](#problem-and-solution)
- [Target Users and Purpose](#target-users-and-purpose)
- [Feature Set](#feature-set)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Database Design](#database-design)
- [Repository Structure](#repository-structure)
- [Installation and Setup](#installation-and-setup)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Deployment (AWS EC2 Demo)](#deployment-aws-ec2-demo)
- [Screenshots and UI Overview](#screenshots-and-ui-overview)
- [Challenges and Solutions](#challenges-and-solutions)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

## Project Title and Description

`Formation Continue` is a full-stack, role-based training management platform designed to run the complete lifecycle of professional training programs:

1. Publish calls for applications.
2. Receive and review company and employee submissions.
3. Publish results and organize accepted participants into cohorts.
4. Deliver training through professor-led sessions and course materials.
5. Provide dashboards and operational visibility for each role.

It includes two major applications:

- `backend/`: FastAPI + SQLAlchemy async API implementing business rules, role-aware authorization, and data workflows.
- `frontend/`: Next.js App Router client implementing public pages and role-specific dashboards for coordinator, professor, employee, and admin/staff support flows.

## Problem and Solution

### Problem

Training programs are often managed with fragmented tools (email, spreadsheets, messaging), creating operational issues:

- No single source of truth for calls, applications, and cohort planning.
- Slow coordinator workflow for validation, assignment, and scheduling.
- Low visibility for employees on their schedules and training documents.
- Difficult governance around permissions, status transitions, and auditing.

### Solution

This platform centralizes the entire process in one system:

- Structured call-for-application workflow from publishing to final decisions.
- Cohort-centered execution after results publication.
- Role-specific interfaces and APIs for coordinators, professors, and employees.
- Date/hour-constrained session management to maintain planning integrity.
- Secure material upload/download with controlled access.
- Dashboard-oriented workflows to monitor operations.

## Target Users and Purpose

### Who this platform is for

- `Coordinators`: define calls, manage applications, create cohorts, assign professors, supervise training flow.
- `Professors`: manage assigned cohort sessions, publish training materials, and follow delivery plans.
- `Employees`: follow accepted training schedules, access learning materials, and track training progress.
- `Admin/Staff`: support account governance, operational oversight, and administrative control.

### Why it exists

The platform exists to reduce manual process overhead, enforce business rules, and provide a reliable training execution backbone for continuous education programs.

## Feature Set

> Implementation status is shown where relevant to match the current runtime code.

### Coordinator Features

- Call management:
  - Create and publish calls.
  - Manage lifecycle and visibility of calls.
- Application review flow:
  - View applications and related submissions.
  - Drive acceptance and rejection pipelines.
- Cohort creation and management:
  - Create cohorts linked to call and course context.
  - Define training margins:
    - Start and end dates.
    - Daily training time windows (start hour/end hour).
- Professor assignment:
  - View available professors per cohort context.
  - Assign one or more professors through assignment table persistence.
- Monitoring and analytics:
  - Dashboard-level visibility exists.
  - Dedicated advanced cohort monitoring (sessions + attendance KPIs + participant analytics) is partially implemented and planned for expansion.

### Professor Features

- Assigned cohort management:
  - List assigned cohorts.
  - Access cohort-level session plans.
- Session scheduling:
  - Create, update, and delete cohort sessions.
  - Validation rejects sessions outside cohort margins.
- Material management:
  - Upload training materials.
  - Attach content to course/cohort learning context.
- Attendance tracking:
  - Functional target in product scope.
  - End-to-end active attendance module is currently pending completion in runtime flow.

### Employee Features

- Training calendar:
  - Dynamic calendar view of sessions from assigned cohorts.
  - Real-time reflection of professor scheduling changes.
- Material access:
  - View and download course materials relevant to training path.
- Attendance visibility:
  - Planned feature for attendance history and status feedback.
- Dashboard analytics:
  - Role-specific dashboard and training-oriented overview capabilities.

### Cross-Cutting Features

- Authentication and verification flows.
- Role-based route and API access control.
- File upload and secure material download endpoints.
- Async backend architecture with migration-managed schema evolution.

## System Architecture

### High-Level Architecture

```text
Client (Next.js App Router)
    |
    | HTTPS / JSON (JWT-based auth)
    v
API Layer (FastAPI)
    |
    | Async ORM operations
    v
PostgreSQL (primary relational store)

Supporting services:
- Redis (cache / task broker)
- Celery worker (background jobs)
- Mail service (verification and notifications)
- Local upload storage served by backend (`/uploads`)
```

### Request Flow (Typical)

1. User authenticates from frontend.
2. Frontend stores token (or session context) and calls protected APIs.
3. FastAPI dependency layer resolves authenticated user and role.
4. Service layer validates business rules.
5. SQLAlchemy async repositories persist/retrieve data from PostgreSQL.
6. API returns DTO/schema payload to frontend.
7. Frontend updates role dashboard and feature views.

### Cohort Session Scheduling Flow

1. Coordinator creates cohort with date/hour boundaries.
2. Coordinator assigns professor(s) to cohort.
3. Professor creates session.
4. Backend validates:
   - Professor belongs to assigned cohort.
   - Session date is inside cohort date range.
   - Session time is inside allowed daily margin.
5. If valid, session is stored and becomes visible in employee training calendar.

### Material Download Flow

1. Professor uploads material.
2. Metadata is stored in database, file is stored in server upload directory.
3. Employee requests material list from training endpoint.
4. Employee calls protected download route with material ID.
5. Backend verifies access and serves file stream.

## Technology Stack

### Frontend

- `Next.js 16 (App Router)`:
  - Chosen for route-based architecture, good DX, and scalable UI composition.
- `React 19`:
  - Component-driven UI for role-specific screens and reusable modules.
- `TypeScript`:
  - Static typing for API contracts, domain models, and maintainability.
- `Tailwind CSS 4`:
  - Utility-first styling for rapid dashboard UI iteration.
- `Framer Motion`:
  - Controlled UI transitions and micro-interactions.
- `Lucide React`:
  - Consistent iconography in dashboards and form actions.

### Backend

- `Python + FastAPI`:
  - High-performance async APIs with clear dependency injection patterns.
- `Uvicorn`:
  - ASGI server for development and production serving.
- `SQLAlchemy 2 (async)`:
  - Strong ORM + async support for complex relational workflows.
- `Alembic`:
  - Versioned schema migration control.
- `Redis`:
  - Broker/cache support for asynchronous and stateful operations.
- `Celery`:
  - Background task execution (notifications, deferred processing).
- `fastapi-mail / aiosmtplib`:
  - Email verification and transactional communication.

### Database

- `PostgreSQL`:
  - Chosen for relational integrity, indexing, transactional guarantees, and fit for normalized business entities (users, calls, cohorts, sessions, materials).

### Deployment

- `AWS EC2 (demo setup)`:
  - Cost-effective and flexible environment for full-stack deployment demonstrations.

## Database Design

This project follows a relational model centered on users, calls, applications, cohorts, and training execution artifacts.

### Core Entities

- `User`:
  - Authentication identity and role (`admin`, `coordinator`, `staff`, `professor`, `company`, `employee`).
- `Call`:
  - Training call metadata, timelines, and publication state.
- `Application`:
  - Company/employee submission and evaluation state linked to call.
- `Course`:
  - Course definition used in training and cohort planning.
- `Cohort`:
  - Post-results grouping for accepted participants and execution boundaries.
- `CohortProfessorAssignment`:
  - Join entity for many-to-many relation between cohorts and professors.
- `CohortSession`:
  - Scheduled instructional units linked to cohort and professor.
- `Attendance`:
  - Target entity for present/absent/late tracking (roadmap and partial artifacts; active runtime rollout in progress).
- `Material`:
  - Uploaded training files and metadata; linked to course/professor/cohort context based on feature path.

### Relationship Overview

- One `Call` can have many `Applications`.
- One `Course` can be referenced by many `Cohorts`.
- One `Cohort` can have many `CohortSessions`.
- One `Cohort` can have many assigned `Professors` through `CohortProfessorAssignment`.
- One `Professor` can upload many `Materials`.
- One `Employee` can consume sessions/materials from assigned cohort path.

## Testing (Pytest)

Pytest tests are located in `tests/` at the project root.

Run tests:

```bash
source backend/venvpire/bin/activate
pip install -r backend/requirements-dev.txt
pytest
```

Current baseline tests include:

- API smoke tests (`/openapi.json`, `/docs`, 404 behavior)
- Auth password-reset route registration checks

## Docker Setup

Docker configuration has been added for:

- `backend` (FastAPI)
- `frontend` (Next.js)
- `db` (PostgreSQL)
- `redis`

Main files:

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

Start the full stack:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- `Attendance` is designed to connect `Employee` to `CohortSession` with status + audit metadata.

## Repository Structure

```text
formation-continue/
  backend/
    app/
      api/            # Route modules grouped by role/domain
      core/           # Config, security, startup settings
      db/             # ORM models, session management
      schemas/        # Pydantic request/response schemas
      services/       # Business logic and validation rules
      main.py         # FastAPI app entry point
    migrations/       # Alembic migration chain
    requirements.txt
  frontend/
    app/              # App Router pages and route groups
    components/       # Shared and role-specific React components
    contexts/         # Global state/context providers
    hooks/            # Reusable frontend hooks
    lib/              # API clients and domain helpers
    types/            # Shared TypeScript domain types
    package.json
```

## Installation and Setup

### Prerequisites

- `Python 3.11+` (recommended)
- `Node.js 20+` and `npm`
- `PostgreSQL 14+`
- `Redis 6+`
- Git

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd formation-continue
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
database_url=postgresql+asyncpg://<user>:<password>@localhost:5432/<db_name>
JWT_SECRET=<your-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRY=60
REFRESH_TOKEN_EXPIRY_DAYS=7
REDIS_URL=redis://localhost:6379/0
MAIL_USERNAME=<mail-user>
MAIL_PASSWORD=<mail-password>
MAIL_FROM=<mail-from>
MAIL_PORT=587
MAIL_SERVER=<smtp-host>
MAIL_FROM_NAME=Formation Continue
MAIL_STARTTLS=true
MAIL_SSL_TLS=false
DOMAIN=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

Run database migrations:

```bash
alembic upgrade head
```

Start API server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional background worker:

```bash
celery -A app.celery_tasks.celery_app worker --loglevel=info
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_UPLOADS_URL=http://localhost:8000
```

Start frontend dev server:

```bash
npm run dev
```

### 4. Validate Local Environment

1. Confirm backend is reachable at `http://localhost:8000/docs`.
2. Confirm frontend is reachable at `http://localhost:3000`.
3. Log in with test accounts for coordinator/professor/employee.
4. Create a cohort and verify session visibility in employee training page.

## Usage Guide

### Scenario A: Coordinator Runs a New Training Cycle

1. Coordinator creates/publishes a new call.
2. Applications and submissions are reviewed.
3. Accepted track is finalized.
4. Coordinator creates cohort with date/time margins.
5. Coordinator assigns professors to the cohort.
6. Coordinator monitors execution and adjusts planning if needed.

### Scenario B: Professor Delivers Training

1. Professor opens assigned cohorts.
2. Professor creates session schedule within cohort boundaries.
3. Professor updates or deletes sessions when changes are required.
4. Professor uploads course materials for participants.
5. Participants consume updates in their training view.

### Scenario C: Employee Follows Training Plan

1. Employee opens `My Training`.
2. Calendar displays upcoming sessions for cohort context.
3. Employee downloads and studies shared materials.
4. Employee tracks progress and attendance visibility (when attendance module is enabled end-to-end).

## API Documentation

Base path: `/api/v1`

Interactive docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user and issue tokens. |
| `POST` | `/auth/refresh` | Refresh access token. |
| `POST` | `/auth/logout` | Invalidate session/token context. |
| `POST` | `/auth/verify-email` | Email verification flow. |

### Calls / Applications / Submissions

| Method | Route | Description |
|---|---|---|
| `GET` | `/calls` | List available calls. |
| `POST` | `/calls` | Create new call (privileged role). |
| `GET` | `/applications` | List applications with filters. |
| `POST` | `/applications` | Submit application. |
| `GET` | `/submissions` | List document submissions. |

### Coordinator - Cohorts

| Method | Route | Description |
|---|---|---|
| `GET` | `/coordinator/cohorts` | List cohorts for coordinator view. |
| `GET` | `/coordinator/cohorts/form-options` | Get data required for cohort creation forms. |
| `POST` | `/coordinator/cohorts` | Create cohort with schedule margins. |
| `GET` | `/coordinator/cohorts/{cohort_id}/available-professors` | List assignable professors for a cohort. |
| `PUT` | `/coordinator/cohorts/{cohort_id}/professors` | Assign professors to cohort. |

### Professor - Cohorts and Sessions

| Method | Route | Description |
|---|---|---|
| `GET` | `/professor/my-cohorts` | List cohorts assigned to authenticated professor. |
| `GET` | `/professor/my-cohorts/{cohort_id}/sessions` | List sessions for one assigned cohort. |
| `POST` | `/professor/my-cohorts/{cohort_id}/sessions` | Create session with boundary validation. |
| `PUT` | `/professor/my-cohorts/{cohort_id}/sessions/{session_id}` | Update session details. |
| `DELETE` | `/professor/my-cohorts/{cohort_id}/sessions/{session_id}` | Remove a session. |

### Employee - Training

| Method | Route | Description |
|---|---|---|
| `GET` | `/employee/training/calendar` | Return employee training calendar events. |
| `GET` | `/employee/training/materials` | Return accessible training materials. |

### Materials

| Method | Route | Description |
|---|---|---|
| `GET` | `/materials/download/{material_id}` | Download material if role authorization passes. |

## Deployment (AWS EC2 Demo)

This project is currently deployed as a demo architecture on AWS EC2.

### Deployment Topology (Demo)

- `EC2 instance` hosts backend and frontend processes.
- `Nginx` acts as reverse proxy and static edge for domain routing.
- `Uvicorn` serves FastAPI app.
- `Next.js` runs in production mode (`next start`).
- `PostgreSQL` and `Redis` run either on EC2 or adjacent managed/self-hosted nodes depending on environment.
- `systemd` services keep backend/worker/frontend processes alive.

### Typical Deployment Steps

1. Provision EC2 instance and open required ports (`22`, `80`, `443`).
2. Install runtime dependencies (`python`, `node`, `nginx`, `postgresql`/remote DB client, `redis` if local).
3. Pull source code and create backend/frontend env files.
4. Install backend dependencies and run `alembic upgrade head`.
5. Build frontend with `npm run build`.
6. Configure `systemd` services for:
   - FastAPI app.
   - Celery worker.
   - Next.js production server.
7. Configure Nginx reverse proxy:
   - `/api/*` -> FastAPI service.
   - `/` -> Next.js service.
8. Attach domain and TLS certificate (for example using Let's Encrypt).
9. Verify uploads path permissions and availability.

### Upload Storage Note

Current upload implementation stores files on local server disk and serves them through backend routes.

- Advantage:
  - Simple for local development and demo deployments.
- Limitation:
  - Not ideal for horizontal scaling or ephemeral instance replacement.
- Recommended production upgrade:
  - Move to object storage (for example Amazon S3) with signed URL strategy and lifecycle policies.

## Screenshots and UI Overview

Add real screenshots before final publication.

- Public Landing Page: `docs/screenshots/landing.png`
- Coordinator Dashboard: `docs/screenshots/coordinator-dashboard.png`
- Cohort Creation Page: `docs/screenshots/coordinator-cohorts.png`
- Professor Session Management: `docs/screenshots/professor-sessions.png`
- Employee Training Calendar: `docs/screenshots/employee-training.png`
- Material Download View: `docs/screenshots/employee-materials.png`

Example markdown for embedding:

```markdown
![Coordinator Cohorts](docs/screenshots/coordinator-cohorts.png)
```

## Challenges and Solutions

### 1. Enforcing Session Boundaries Reliably

- Challenge:
  - Prevent professors from scheduling outside allowed cohort dates and daily time windows.
- Solution:
  - Added strict backend validation in service layer.
  - Kept frontend checks for immediate UX feedback but treated backend as source of truth.

### 2. Role-Consistent Professor Assignment

- Challenge:
  - Inconsistent role/profile data can cause assignment and listing anomalies.
- Solution:
  - Filter assignment candidates using professor profile + account status + contextual constraints.
  - Keep role checks at API access and service query level.

### 3. Keeping Employee Calendar in Sync

- Challenge:
  - Session updates by professors must quickly appear for employees.
- Solution:
  - Training calendar endpoint reads directly from active session state and grouped cohort context.
  - Frontend fetch paths are aligned with role-specific pages.

### 4. Material Access Control

- Challenge:
  - Uploaded files must be downloadable only by authorized roles.
- Solution:
  - Added role-aware authorization checks in download API before file response.

## Future Improvements
4. Improve scalability:
   - Containerized deployment, autoscaling strategy, and managed database/cache services.
5. Strengthen security posture:
   - Secret rotation, stricter CORS/CSRF strategy, audit logs, and rate limiting.
6. Improve observability:
   - Structured logs, traces, metrics dashboards, and alerting.
7. Expand automated testing:
   - More integration tests for role workflows and cohort lifecycle guarantees.

## Contributing

Contributions are welcome for bug fixes, refactors, tests, and feature extensions.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/<short-name>`.
3. Commit changes with clear messages.
4. Ensure local tests/linting pass.
5. Open a pull request with:
   - Problem statement.
   - Technical approach.
   - Test evidence.
   - Screenshots for UI changes.

Recommended PR checklist:

- No secrets committed.
- Migrations reviewed.
- API schema updates reflected in frontend types.
- Backward compatibility considered.

## License

This repository currently has no explicit open-source license file.

- Unless a `LICENSE` file is added, treat the code as `All Rights Reserved`.
- If you intend public/open reuse, add a license (for example MIT, Apache-2.0, or GPL) in the repository root.
