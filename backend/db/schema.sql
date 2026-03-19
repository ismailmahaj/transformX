-- Fitness transformation app schema (PostgreSQL)
-- Note: Keep this file as the single source of truth for tables.

BEGIN;

-- Enable UUID generation (available in Supabase and most Postgres installs).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- nullable to support future OAuth if desired
  name TEXT,
  height_cm INTEGER,
  weight_start_kg NUMERIC(5,2),
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- WORKOUTS (program template)
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 180),
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 3),
  goal_type TEXT NOT NULL DEFAULT 'crossfit' CHECK (goal_type IN ('crossfit', 'muscle', 'mixed')),
  name TEXT NOT NULL,
  is_rest_day BOOLEAN NOT NULL DEFAULT FALSE,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_number, goal_type)
);

-- Compatibilité avec les DB existantes
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS goal_type TEXT NOT NULL DEFAULT 'crossfit'
CHECK (goal_type IN ('crossfit', 'muscle', 'mixed'));

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_day_number_key;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_day_goal_unique;
ALTER TABLE workouts ADD CONSTRAINT workouts_day_goal_unique UNIQUE (day_number, goal_type);

-- MEALS (daily plan template)
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 180),
  type TEXT NOT NULL CHECK (type IN ('breakfast','lunch','dinner','snack')),
  name TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_number, type)
);

-- ENRICHISSEMENT RECETTES / MACROS
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Facile',
ADD COLUMN IF NOT EXISTS macros JSONB DEFAULT '{}'::jsonb;

-- USER PROGRESS (daily logs)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb, -- { chest_cm, waist_cm, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- PROGRESS PHOTOS (Cloudinary)
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, cloudinary_public_id)
);

-- OPTIONAL: stockage d'une note et d'un résultat d'analyse (IA)
ALTER TABLE progress_photos
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS analysis JSONB NOT NULL DEFAULT '{}'::jsonb;

-- USER LOGS (daily completion + xp)
CREATE TABLE IF NOT EXISTS user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 180),
  date DATE NOT NULL,
  workout_done BOOLEAN NOT NULL DEFAULT FALSE,
  meals_done BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- STREAKS (derived but stored for quick reads)
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_log_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NUTRITION LOGS (food entries per meal)
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('petit-dejeuner','dejeuner','diner','collation')),
  food_name TEXT NOT NULL,
  quantity_g INTEGER NOT NULL CHECK (quantity_g > 0),
  calories INTEGER NOT NULL CHECK (calories >= 0),
  proteins_g NUMERIC(5,1) NOT NULL CHECK (proteins_g >= 0),
  carbs_g NUMERIC(5,1) NOT NULL CHECK (carbs_g >= 0),
  fats_g NUMERIC(5,1) NOT NULL CHECK (fats_g >= 0),
  water_ml INTEGER NOT NULL DEFAULT 0 CHECK (water_ml >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BADGES (config for achievements, managed by admin)
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT NOT NULL DEFAULT '🏆',
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('workouts_done', 'streak', 'day_reached', 'xp_total')),
  threshold INTEGER NOT NULL CHECK (threshold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DAILY TARGETS (training day flag + water logged)
CREATE TABLE IF NOT EXISTS daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_training_day BOOLEAN NOT NULL DEFAULT FALSE,
  water_ml_logged INTEGER NOT NULL DEFAULT 0 CHECK (water_ml_logged >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

COMMIT;
