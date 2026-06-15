# Supabase Setup

## 1. Create the tables

Run this SQL in the Supabase SQL Editor (Database → SQL Editor → New query):

```sql
-- Stories table
create table stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  story_id uuid references stories(id) on delete cascade not null,
  title text,
  body text,
  type text default 'idea' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Row Level Security: users only see their own data
alter table stories enable row level security;
alter table notes enable row level security;

create policy "Users manage own stories" on stories for all using (auth.uid() = user_id);
create policy "Users manage own notes" on notes for all using (auth.uid() = user_id);
```

## 2. Enable Email Auth

Go to Authentication → Providers → Email and make sure it's enabled.

## 3. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

- `VITE_SUPABASE_URL` — from Supabase Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — from Supabase Settings → API → anon/public key

## 4. Enable GitHub Pages

Go to your GitHub repo → Settings → Pages:
- Source: **GitHub Actions**

## 5. Local development

Copy `.env.example` to `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then: `npm run dev`
