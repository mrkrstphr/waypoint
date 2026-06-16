create table if not exists stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  story_id uuid references stories(id) on delete cascade not null,
  title text,
  body text,
  type text default 'idea' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table stories enable row level security;
alter table notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'stories' and policyname = 'Users manage own stories') then
    create policy "Users manage own stories" on stories for all using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notes' and policyname = 'Users manage own notes') then
    create policy "Users manage own notes" on notes for all using (auth.uid() = user_id);
  end if;
end $$;
