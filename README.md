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

Edit the `.env` file in each service folder. **Change `DB_PASSWORD` and `JWT_SECRET` before running.**

### api-gateway/.env
```
PORT=5000
AUTH_SERVICE_URL=http://localhost:5001
COLLAB_SERVICE_URL=http://localhost:5002
```

### auth-service/.env
```
PORT=5001
JWT_SECRET=changeme_use_a_long_random_string
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=yourpassword
```

### collaboration-service/.env
```
PORT=5002
JWT_SECRET=changeme_use_a_long_random_string
DB_HOST=localhost
DB_PORT=5432
DB_NAME=collab_db
DB_USER=postgres
DB_PASSWORD=yourpassword
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
| POST   | /teams/:teamId/members     | Yes  | Add a member to a team (admin only)  |

**Create team body:**
```json
{ "name": "Frontend Squad", "description": "Handles all UI work" }
```

---

### Task Endpoints

| Method | Path                              | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| GET    | /teams/:teamId/tasks              | Yes  | Get all tasks for a team             |
| POST   | /teams/:teamId/tasks              | Yes  | Create a task                        |
| PATCH  | /teams/:teamId/tasks/:taskId      | Yes  | Update a task (creator or admin)     |
| DELETE | /teams/:teamId/tasks/:taskId      | Yes  | Delete a task (creator or admin)     |

**Create task body:**
```json
{ "title": "Fix login bug", "description": "Optional detail", "status": "todo" }
```

**Valid status values:** `todo` · `in_progress` · `done`

---

## 6. Security Features

| Feature          | Where                                      |
|------------------|--------------------------------------------|
| Password hashing | Auth Service — bcrypt (10 rounds)          |
| JWT auth         | Auth Service issues, Collaboration verifies|
| Role checks      | Collaboration Service (admin / member)     |
| Input validation | express-validator in both services         |
| Rate limiting    | API Gateway — 100 req/15min general, 5 login|
| Request logging  | Morgan in all services                     |

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
