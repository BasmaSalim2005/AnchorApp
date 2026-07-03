-- Anchor schema
-- Run with: npm run migrate

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Case-insensitive lookups for login (username) and registration (email).
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- ---------------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    color           VARCHAR(20)  NOT NULL DEFAULT '#C8102E',
    icon            VARCHAR(40)  NOT NULL DEFAULT 'anchor',

    -- How often the habit should be performed.
    -- 'daily'   -> every day (shows in the Daily checklist)
    -- 'weekly'  -> target_count times per week
    -- 'monthly' -> target_count times per month
    frequency       VARCHAR(10) NOT NULL DEFAULT 'daily'
                    CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    target_count    INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),

    -- Optional measurable goal, e.g. water -> 2000 "ml", running -> 5 "km".
    unit            VARCHAR(30),
    target_quantity NUMERIC(12, 2),

    -- Optional daily reminder.
    reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_time    TIME,            -- local time of day, e.g. 08:30

    archived        BOOLEAN NOT NULL DEFAULT false,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS habits_user_idx ON habits (user_id) WHERE archived = false;

-- ---------------------------------------------------------------------------
-- Habit logs (one row per habit per day it is acted on)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id   UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date   DATE NOT NULL,
    completed  BOOLEAN NOT NULL DEFAULT true,
    quantity   NUMERIC(12, 2),          -- e.g. 1500 (ml of water), 3.2 (km)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS habit_logs_user_date_idx ON habit_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS habit_logs_habit_date_idx ON habit_logs (habit_id, log_date);

-- ---------------------------------------------------------------------------
-- Session store (used by connect-pg-simple)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
    "sid"    VARCHAR NOT NULL COLLATE "default",
    "sess"   JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
