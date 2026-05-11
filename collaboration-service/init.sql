-- Run this once against collab_db
-- psql -d collab_db -f init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: users live in auth_db. We store user IDs as UUID here
-- without a cross-database FK constraint (microservice boundary).

CREATE TABLE IF NOT EXISTS teams (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id    UUID         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  role       VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  creator_id  UUID         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user  ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team         ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator      ON tasks(creator_id);
