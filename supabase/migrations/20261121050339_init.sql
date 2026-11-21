-- =============================================================================
-- Mini-LMS: roles, consultations, row level security.
--
-- Security model
--   * The Supabase URL and publishable key ship to the browser, so the Data API
--     is reachable directly. RLS is therefore the primary authorization layer;
--     the Next.js API adds input validation and HTTP semantics on top.
--   * Roles live in public.profiles (source of truth). Nobody can change a role
--     through the Data API: there is no insert/update/delete grant on profiles.
--   * Business rules (future dates, status transitions) are enforced by a
--     trigger so they hold no matter which client writes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('student', 'admin');

-- booked <-> completed, booked -> cancelled (final).
create type public.consultation_status as enum ('booked', 'completed', 'cancelled');

-- -----------------------------------------------------------------------------
-- Profiles: one row per auth user, holds the role
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Assigned only by SQL or seed. No grant or policy lets a user change it.';

-- Every new auth user gets a profile, always as a student.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Single role check used by RLS policies and by the API (via rpc).
-- security definer so it can read profiles without recursing into RLS.
-- Reads the table on every call, so demoting an admin takes effect at once.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Consultations
-- -----------------------------------------------------------------------------
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  -- Defaults to the caller; RLS rejects any other value.
  student_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  scheduled_at timestamptz not null,
  status public.consultation_status not null default 'booked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Student dashboard: own rows ordered by time.
create index consultations_student_id_scheduled_at_idx
  on public.consultations (student_id, scheduled_at);
-- Admin view: all rows ordered by time, paginated.
create index consultations_scheduled_at_idx
  on public.consultations (scheduled_at);

-- Business rules. Custom SQLSTATEs map to HTTP codes in the API, and PostgREST
-- uses PTxxx codes as the HTTP status for clients that call it directly.
--   PT400: invalid input (date not in the future)
--   PT409: invalid status transition
create function public.enforce_consultation_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.scheduled_at <= now() then
      raise exception 'Consultation must be scheduled in the future'
        using errcode = 'PT400';
    end if;
    return new;
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled consultations cannot be changed'
      using errcode = 'PT409';
  end if;

  if new.scheduled_at is distinct from old.scheduled_at then
    if old.status <> 'booked' then
      raise exception 'Only booked consultations can be rescheduled'
        using errcode = 'PT409';
    end if;
    if new.scheduled_at <= now() then
      raise exception 'Consultation must be scheduled in the future'
        using errcode = 'PT400';
    end if;
  end if;

  if new.status = 'cancelled' and old.status <> 'booked' then
    raise exception 'Only booked consultations can be cancelled'
      using errcode = 'PT409';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger consultations_enforce_rules
  before insert or update on public.consultations
  for each row execute function public.enforce_consultation_rules();

-- -----------------------------------------------------------------------------
-- Privileges: least privilege on top of Supabase's broad default grants
-- -----------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
revoke all on public.consultations from anon, authenticated;

grant select on public.profiles to authenticated;

grant select on public.consultations to authenticated;
-- Owner, status and timestamps are never client-settable on insert.
grant insert (first_name, last_name, reason, scheduled_at)
  on public.consultations to authenticated;
-- Students may only reschedule or change status. No deletes: cancel is a status.
grant update (scheduled_at, status) on public.consultations to authenticated;

-- -----------------------------------------------------------------------------
-- Row level security
-- (select ...) wrappers let Postgres evaluate each helper once per query.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

create policy "Users read their own profile, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Students read their own consultations, admins read all"
  on public.consultations for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy "Students book consultations for themselves"
  on public.consultations for insert to authenticated
  with check (student_id = (select auth.uid()));

-- Admins have no update policy: the admin view is read-only.
create policy "Students update their own consultations"
  on public.consultations for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
