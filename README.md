# Team Collaboration Microservice System

A full-stack microservice application for managing teams and tasks, built with React, Node.js/Express, and PostgreSQL.

---

## Project Structure

```
team-collab/
├── api-gateway/                  # Port 5000 — entry point for all requests
│   ├── app.js
│   ├── package.json
│   └── .env
│
├── auth-service/                 # Port 5001 — registration, login, JWT
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   ├── .env
│   └── routes/
│       └── authRoutes.js
│
├── collaboration-service/        # Port 5002 — teams and tasks
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   ├── .env
│   ├── middleware/
│   │   └── authenticate.js
│   └── routes/
│       ├── teamRoutes.js
│       └── taskRoutes.js
│
└── frontend/                     # Port 3000 — React UI
    ├── package.json
    └── src/
        └── App.js
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm

---

## 1. PostgreSQL Setup

Open `psql` and run:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE collab_db;
```

Then apply the schema to each database:

```bash
psql -d auth_db  -f auth-service/init.sql
psql -d collab_db -f collaboration-service/init.sql
```

---

## 2. Environment Variables

Copy each `.env.example` file to `.env` in the same folder, then set your local values. **Do not commit `.env` files.** Use a long random `JWT_SECRET`, and use the same value in `auth-service` and `collaboration-service`.

### api-gateway/.env.example
```
PORT=5000
FRONTEND_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:5001
COLLAB_SERVICE_URL=http://localhost:5002
```

### auth-service/.env.example
```
PORT=5001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_a_long_random_secret_used_by_all_services
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=replace_with_your_local_database_password
```

### collaboration-service/.env.example
```
PORT=5002
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_the_same_long_random_secret_as_auth_service
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collab_db
DB_USER=postgres
DB_PASSWORD=replace_with_your_local_database_password
```

> **Important:** `JWT_SECRET` must be identical in both `auth-service` and `collaboration-service`.

---

## 3. Install Dependencies

Run in each folder:

```bash
cd api-gateway           && npm install && cd ..
cd auth-service          && npm install && cd ..
cd collaboration-service && npm install && cd ..
cd frontend              && npm install && cd ..
```

---

## 4. Start All Services

Open **4 separate terminals**:

```bash
# Terminal 1
cd auth-service && npm start

# Terminal 2
cd collaboration-service && npm start

# Terminal 3
cd api-gateway && npm start

# Terminal 4
cd frontend && npm start
```

Then open **http://localhost:3000** in your browser.

---

## 5. API Reference

All requests go through the **API Gateway on port 5000**.

### Auth Endpoints

| Method | Path              | Auth | Description          |
|--------|-------------------|------|----------------------|
| POST   | /auth/register    | No   | Register a new user  |
| POST   | /auth/login       | No   | Login, returns JWT   |
| GET    | /auth/me          | Yes  | Get current user     |
| GET    | /auth/users       | Yes  | List users for team role assignment |

### Platform Endpoints

| Method | Path     | Auth | Description                    |
|--------|----------|------|--------------------------------|
| GET    | /health  | No   | Service health check           |
| GET    | /metrics | No   | Prometheus-style text metrics  |

**Register body:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Login response:**
```json
{ "token": "<jwt>", "userId": "<uuid>", "email": "user@example.com" }
```

---

### Team Endpoints

| Method | Path                       | Auth | Description                          |
|--------|----------------------------|------|--------------------------------------|
| GET    | /teams                     | Yes  | Get all teams the user belongs to    |
| POST   | /teams                     | Yes  | Create a team (creator becomes admin)|
| GET    | /teams/:teamId             | Yes  | Get a single team                    |
| DELETE | /teams/:teamId             | Yes  | Delete a team (owner only)           |
| GET    | /teams/:teamId/members     | Yes  | List team members and their roles    |
| POST   | /teams/:teamId/members     | Yes  | Add a member to a team (admin only)  |

**Create team body:**
```json
{ "name": "Frontend Squad", "description": "Handles all UI work" }
```

**Add or update team member body:**
```json
{ "userId": "<auth-user-uuid>", "role": "member" }
```

Valid team roles are `admin` and `member`. Roles are assigned per team, not globally. A registered account has no team role until it creates a team or is added to one. The user who creates a team automatically becomes that team's `admin`.

---

### Task Endpoints

| Method | Path                              | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| GET    | /teams/:teamId/tasks              | Yes  | Get visible tasks for the current user |
| POST   | /teams/:teamId/tasks              | Yes  | Create and assign a task             |
| PATCH  | /teams/:teamId/tasks/:taskId      | Yes  | Update or reassign a task            |
| DELETE | /teams/:teamId/tasks/:taskId      | Yes  | Delete a task (creator or admin)     |

**Create task body:**
```json
{
  "title": "Fix login bug",
  "description": "Optional detail",
  "status": "todo",
  "assignedTo": "<team-member-user-uuid>"
}
```

**Valid status values:** `todo` · `in_progress` · `done`

Task assignment is team-scoped. A task can only be assigned to a user who already belongs to that team. Admins can view all team tasks and reassign tasks. Members only receive tasks assigned to their own user ID.

---

## 6. Security Features

| Feature          | Where                                      |
|------------------|--------------------------------------------|
| Password hashing | Auth Service — bcrypt (10 rounds)          |
| JWT auth         | Auth Service issues, Collaboration verifies|
| Role checks      | Collaboration Service (admin / member)     |
| Input validation | express-validator in both services; UUID, role, email, and status checks |
| SQL injection prevention | Parameterized PostgreSQL queries using `$1`, `$2`, etc. |
| XSS reduction | Text input trimming and escaping on write paths |
| Rate limiting    | API Gateway - 100 req/15min general, 5 login |
| Request logging  | Morgan in all services with request IDs and persistent log files |
| Security audit trail | `audit.log` records login, token, role, team, task, and gateway security events |
| Monitoring endpoints | `/health` and `/metrics` expose service status and request counters |
| Gateway hardening | Restricted CORS, security headers, request IDs |
| Account lockout | Auth Service temporarily locks repeated failed login attempts by email and IP |

### Security Patterns Applied

| Pattern | Implementation |
|---------|----------------|
| API Gateway | All frontend requests target the gateway on port 5000. The gateway routes requests to internal services. |
| Authenticator | The auth service validates credentials, hashes passwords with bcrypt, and issues JWTs. |
| Authorization / RBAC | Collaboration endpoints check team membership and admin/member roles before allowing access. Members only see tasks assigned to them. |
| Secure Password Storage | Plaintext passwords are never stored; bcrypt hashes are stored in PostgreSQL. |
| Input Validation | `express-validator` rejects malformed emails, UUIDs, task statuses, and roles before database access. |
| Audit Logging | Morgan logs HTTP traffic and Winston writes application/security events to service logs. |
| Rate Limiting | The gateway limits general traffic and applies stricter limits to login attempts. |
| Security Headers | The gateway adds defensive browser headers such as `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`. |
| Account Lockout | The auth service tracks repeated login failures and temporarily locks repeated attempts. |

### Repository Hygiene

The repository uses a root `.gitignore` to exclude local secrets, dependencies, build output, and runtime logs. Commit the `.env.example` files only; keep real `.env` values local.

### Logging Evidence

Runtime logs are written locally under each service's `logs/` folder:

| File | Purpose |
|------|---------|
| `combined.log` | General service and HTTP request activity |
| `error.log` | Error events |
| `audit.log` | Security-relevant events such as login failures, lockouts, role changes, task assignment, and gateway startup |

These log files are intentionally ignored by Git because they are runtime artifacts.

---

## 7. Database Schema

### auth_db — users
| Column     | Type        | Notes                  |
|------------|-------------|------------------------|
| id         | UUID        | Primary key            |
| email      | VARCHAR     | Unique                 |
| password   | VARCHAR     | bcrypt hash            |
| created_at | TIMESTAMPTZ | Auto set               |

### collab_db — teams
| Column      | Type        | Notes          |
|-------------|-------------|----------------|
| id          | UUID        | Primary key    |
| name        | VARCHAR     |                |
| description | TEXT        | Optional       |
| owner_id    | UUID        | Auth user ID   |
| created_at  | TIMESTAMPTZ | Auto set       |

### collab_db — team_members
| Column    | Type        | Notes                  |
|-----------|-------------|------------------------|
| team_id   | UUID        | FK → teams             |
| user_id   | UUID        | Auth user ID           |
| role      | VARCHAR     | `admin` or `member`    |
| joined_at | TIMESTAMPTZ | Auto set               |

### collab_db — tasks
| Column      | Type        | Notes                            |
|-------------|-------------|----------------------------------|
| id          | UUID        | Primary key                      |
| team_id     | UUID        | FK → teams (cascade delete)      |
| title       | VARCHAR     |                                  |
| description | TEXT        | Optional                         |
| status      | VARCHAR     | `todo`, `in_progress`, `done`    |
| creator_id  | UUID        | Auth user ID                     |
| created_at  | TIMESTAMPTZ | Auto set                         |
