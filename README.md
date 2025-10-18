EvalGuard — AI Agent Evaluation Dashboard
========================================

Overview
--------
EvalGuard is a Vite + React + TypeScript dashboard for logging and visualizing AI evaluation events. It uses Supabase for auth, data storage, and an Edge Function for ingesting evaluations with configurable sampling and daily limits.

Tech Stack
----------
- React 18, Vite, TypeScript, TailwindCSS
- Supabase (Auth, Postgres, RLS, Edge Functions)
- Recharts, Radix UI

Local Setup
-----------
1) Prerequisites
- Node 18+
- pnpm/npm/yarn
- Supabase CLI (`npm i -g supabase`)

2) Install deps
```bash
npm install
```

3) Start Supabase locally
```bash
supabase start
```

4) Apply migrations and seed (optional)
Migrations run automatically on `supabase start`. To re-run:
```bash
supabase db reset
```

5) Create a test user
Use the app sign-up flow or the Supabase dashboard (Auth → Users). The schema includes a trigger that auto-creates `profiles`, `eval_configs`, and a default `user` role for new users.

6) Run the web app
```bash
npm run dev
```

Environment Variables
---------------------
Create an `.env` file in the project root for local development:
```bash
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # used by seed script only
```

Note: The current `src/integrations/supabase/client.ts` is generated and uses hardcoded values. For production, switch it to use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`, then set these in your hosting provider (Vercel → Project Settings → Environment Variables).

Database Schema (Summary)
-------------------------
Tables
- `profiles (id uuid pk ↦ auth.users.id, email text, full_name text, created_at, updated_at)`
- `user_roles (id uuid pk, user_id uuid ↦ auth.users.id, role app_role, unique (user_id, role))`
- `eval_configs (id uuid pk, user_id uuid unique ↦ auth.users.id, run_policy text in ['always','sampled'], sample_rate_pct int 0..100, obfuscate_pii bool, max_eval_per_day int > 0, created_at, updated_at)`
- `evaluations (id uuid pk, user_id uuid ↦ auth.users.id, interaction_id text, prompt text, response text, score numeric(3,2) 0..1, latency_ms int ≥ 0, flags text[], pii_tokens_redacted int, created_at)`

Enums
- `app_role = ('admin','user')`

Functions & Triggers
- `has_role(user_id, role)` returns boolean
- `handle_new_user()` trigger on `auth.users` insert to create `profiles`, default `eval_configs`, and `user_roles(user)`
- `update_updated_at_column()` used by `profiles` and `eval_configs` BEFORE UPDATE triggers

Row Level Security (RLS)
-----------------------
- `profiles`: users can SELECT/INSERT/UPDATE only their own row (`auth.uid() = id`)
- `eval_configs`: users can SELECT/INSERT/UPDATE only their config (`auth.uid() = user_id`)
- `evaluations`: users can SELECT/INSERT only their evaluations (`auth.uid() = user_id`)

Edge Function: ingest-eval
--------------------------
Endpoint: `supabase/functions/ingest-eval`
- Auth: expects `Authorization: Bearer <access_token>` of the user creating the evaluation
- Logic: checks `eval_configs` for sampling policy and daily limit, then inserts into `evaluations`
- Env: uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

Seeding Sample Data
-------------------
The app provides multiple options for generating synthetic data for testing and development:

### Basic Seeding
```bash
# Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run seed
```
The script `scripts/seed.ts`:
- Uses service role to list users and target the first one
- Inserts 50 `evaluations` across the last 30 days with varied scores/latency/flags

### Advanced Synthetic Data Generation
```bash
# Realistic data (50 records, 30 days)
npm run seed:realistic

# Stress testing data (200 records with edge cases)
npm run seed:stress

# Edge cases testing (100 records with problematic data)
npm run seed:edge-cases

# Performance testing (100 records, 7 days, high scores)
npm run seed:performance
```

### Bulk Data Generation
```bash
# Generate 1000 records in batches of 100
npm run seed:bulk

# Generate 10000 records in batches of 500 (for performance testing)
npm run seed:bulk-large
```

### Data Cleanup
```bash
# Show database statistics
npm run cleanup:stats

# Clean up old data (older than 7 days, keep 100 newest)
npm run cleanup:old

# Preview reset all data (dry run)
npm run cleanup:reset

# Actually reset all data
npm run cleanup reset-all
```

### Custom Data Generation
```bash
# Generate custom amounts with specific scenarios
tsx scripts/generate-synthetic-data.ts <scenario> <count> <days>
tsx scripts/bulk-generate.ts <total-count> <batch-size> <days>
tsx scripts/cleanup.ts <command> [options]
```

### Available Scenarios
- `realistic`: Normal distribution with high-quality data
- `stress-test`: Wide range of values for stress testing
- `edge-cases`: Problematic data for edge case testing
- `performance-test`: High-quality data for performance testing

### SQL-based Seeding (Legacy)
Option A: SQL-based function (migration `20251017111016_...`)
This migration defines `public.generate_sample_evaluations()` and calls it. It targets the first user in `auth.users` and inserts 50 randomized rows.

Deployment
----------
Vercel
- `vercel.json` is included with SPA rewrite to `index.html`
- Build Command: `npm run build`
- Output Directory: `dist`
- Env: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend; never expose service role in the client

Supabase Edge Functions
- Deploy with `supabase functions deploy ingest-eval`
- Set function env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Invoke from your app/backend with a user access token in the Authorization header

AI Tools Used
-------------
- Cursor: assisted with repository setup, Vercel config, seed script creation, and README drafting

Security Notes
--------------
- Keep `SUPABASE_SERVICE_ROLE_KEY` strictly server-side (seed scripts, Edge Functions). Do not expose it to the browser.
- RLS policies restrict data access to the owning user. Admin operations should go through secure server contexts or Postgres functions marked `SECURITY DEFINER` when appropriate.

License
-------
MIT

