-- CivicWorks database schema for Supabase (PostgreSQL).
-- Run the whole file in Supabase Dashboard -> SQL Editor.
-- Security principle: public reads project records; ward officers can edit only their assigned ward; admins can edit all wards.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'resident' check (role in ('resident', 'officer', 'admin')),
  ward text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  status text not null default 'planned' check (status in ('planned', 'ongoing', 'delayed', 'completed')),
  department text not null,
  ward text not null,
  contractor text,
  responsible_officer text,
  description text not null default '',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  planned_start date,
  actual_start date,
  planned_end date,
  actual_end date,
  work_start_time time,
  work_end_time time,
  progress smallint not null default 0 check (progress between 0 and 100),
  estimated_cost numeric(14,2) check (estimated_cost is null or estimated_cost >= 0),
  spent_to_date numeric(14,2) check (spent_to_date is null or spent_to_date >= 0),
  materials text,
  quality_notes text,
  affected_residents text,
  impacts text[] not null default '{}',
  safety text[] not null default '{}',
  traffic_plan text,
  delay_reason text,
  source_label text not null default 'Official ward record',
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  detail text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  title text not null,
  category text not null,
  description text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'resolved', 'rejected')),
  response text,
  contact text,
  ward text not null,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.projects add column if not exists work_start_time time;
alter table public.projects add column if not exists work_end_time time;
alter table public.reports add column if not exists attachment_path text;
alter table public.reports add column if not exists ward text;
update public.reports set ward = 'Unassigned' where ward is null;
alter table public.reports alter column ward set default 'Unassigned';
alter table public.reports alter column ward set not null;

create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_ward_idx on public.projects(ward);
create index if not exists projects_location_idx on public.projects(latitude, longitude);
create index if not exists project_updates_project_idx on public.project_updates(project_id, created_at desc);
create index if not exists reports_created_idx on public.reports(created_at desc);

-- Add a resident profile for every new Supabase Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'resident')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Security-definer helper avoids recursive RLS checks when looking up the signed-in user's role.
create or replace function public.is_ward_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('officer', 'admin')
  );
$$;

create or replace function public.can_manage_ward(ward_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.role = 'officer' and p.ward is not null
          and pg_catalog.lower(pg_catalog.trim(p.ward)) = pg_catalog.lower(pg_catalog.trim(ward_name)))
      )
  );
$$;

create or replace function public.can_access_report_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (p.role = 'officer' and p.ward is not null
          and pg_catalog.trim(both '-' from pg_catalog.lower(pg_catalog.regexp_replace(p.ward, '[^a-zA-Z0-9]+', '-', 'g'))) = pg_catalog.split_part(object_name, '/', 2))
      )
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects
for each row execute procedure public.touch_updated_at();
drop trigger if exists reports_touch_updated_at on public.reports;
create trigger reports_touch_updated_at before update on public.reports
for each row execute procedure public.touch_updated_at();

-- A public, minimal status lookup. It deliberately does not return the reporter's contact details.
create or replace function public.get_report_status(lookup_ticket text)
returns table (
  ticket_code text,
  title text,
  category text,
  description text,
  latitude double precision,
  longitude double precision,
  status text,
  response text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.ticket_code, r.title, r.category, r.description, r.latitude, r.longitude, r.status, r.response, r.created_at
  from public.reports r
  where pg_catalog.upper(r.ticket_code) = pg_catalog.upper(pg_catalog.trim(lookup_ticket))
  limit 1;
$$;

-- Row Level Security: permissions are enforced in the database, not just by hiding UI buttons.
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects" on public.projects
for select to anon, authenticated using (true);
drop policy if exists "Officers can create projects" on public.projects;
create policy "Officers can create projects" on public.projects
for insert to authenticated with check (public.can_manage_ward(ward));
drop policy if exists "Officers can update projects" on public.projects;
create policy "Officers can update projects" on public.projects
for update to authenticated using (public.can_manage_ward(ward)) with check (public.can_manage_ward(ward));
drop policy if exists "Officers can delete projects" on public.projects;
create policy "Officers can delete projects" on public.projects
for delete to authenticated using (public.can_manage_ward(ward));

drop policy if exists "Public can read project updates" on public.project_updates;
create policy "Public can read project updates" on public.project_updates
for select to anon, authenticated using (true);
drop policy if exists "Officers can add project updates" on public.project_updates;
create policy "Officers can add project updates" on public.project_updates
for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and public.can_manage_ward(p.ward)));

drop policy if exists "Anyone can submit a report" on public.reports;
create policy "Anyone can submit a report" on public.reports
for insert to anon, authenticated with check (status = 'submitted' and response is null and reviewed_by is null and length(trim(ward)) > 0 and ward <> 'Unassigned');
drop policy if exists "Officers can read reports" on public.reports;
create policy "Officers can read reports" on public.reports
for select to authenticated using (public.can_manage_ward(ward));
drop policy if exists "Officers can update reports" on public.reports;
create policy "Officers can update reports" on public.reports
for update to authenticated using (public.can_manage_ward(ward)) with check (public.can_manage_ward(ward));

-- Private evidence bucket: citizens can upload an image, but only officers can read it.
-- The public ticket lookup never returns this path or any contact information.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-attachments', 'report-attachments', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Anyone can upload report evidence" on storage.objects;
create policy "Anyone can upload report evidence" on storage.objects
for insert to anon, authenticated with check (bucket_id = 'report-attachments');
drop policy if exists "Officers can view report evidence" on storage.objects;
create policy "Officers can view report evidence" on storage.objects
for select to authenticated using (bucket_id = 'report-attachments' and public.can_access_report_evidence(name));
drop policy if exists "Officers can delete report evidence" on storage.objects;
create policy "Officers can delete report evidence" on storage.objects
for delete to authenticated using (bucket_id = 'report-attachments' and public.can_access_report_evidence(name));

grant usage on schema public to anon, authenticated;
grant select on public.projects, public.project_updates to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert on public.project_updates to authenticated;
grant insert on public.reports to anon, authenticated;
grant select, update on public.reports to authenticated;
grant select on public.profiles to authenticated;
revoke all on function public.is_ward_officer() from public;
grant execute on function public.is_ward_officer() to authenticated;
revoke all on function public.can_manage_ward(text) from public;
grant execute on function public.can_manage_ward(text) to authenticated;
revoke all on function public.can_access_report_evidence(text) from public;
grant execute on function public.can_access_report_evidence(text) to authenticated;
revoke all on function public.get_report_status(text) from public;
grant execute on function public.get_report_status(text) to anon, authenticated;

-- IMPORTANT: officer accounts are created/invited by the project administrator in Supabase Auth.
-- Then assign an officer role and the exact ward name using the SQL Editor, replacing the email and ward:
-- update public.profiles
-- set role = 'officer', full_name = 'Ward Officer Name', ward = 'Ward 12'
-- where id = (select id from auth.users where email = 'officer@example.gov.in');
-- Never give residents officer/admin roles. Never put a Supabase service_role key in a VITE_ environment variable.
