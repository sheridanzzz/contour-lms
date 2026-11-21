-- Local demo data. Runs on `supabase db reset`. Never use these accounts outside local dev.
--   admin@example.com / Password123!  (admin)
--   alice@example.com / Password123!  (student)
--   bob@example.com   / Password123!  (student)

with seed_users (id, email) as (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@example.com'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'alice@example.com'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'bob@example.com')
),
inserted_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  from seed_users
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from inserted_users;

-- Profiles were created as students by the on_auth_user_created trigger.
update public.profiles set role = 'admin'
where id = '00000000-0000-4000-a000-000000000001';

-- Consultations must be booked in the future (trigger rule), so seed future
-- dates and then move some through valid transitions. Times are UTC, chosen to
-- land in Melbourne business hours (AEDT, UTC+11) on the 30-minute booking slots.
insert into public.consultations (id, student_id, first_name, last_name, reason, scheduled_at)
values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'Alice', 'Nguyen', 'Methods unit 3 revision', date_trunc('day', now()) + interval '1 day 23 hours'),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', 'Alice', 'Nguyen', 'Essay feedback for English', date_trunc('day', now()) + interval '3 days 3 hours'),
  ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000002', 'Alice', 'Nguyen', 'Chemistry practice exam', date_trunc('day', now()) + interval '4 days 23 hours 30 minutes'),
  ('10000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003', 'Bob', 'Smith', 'Physics SAC preparation', date_trunc('day', now()) + interval '2 days 5 hours'),
  ('10000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000003', 'Bob', 'Smith', 'Study plan check-in', date_trunc('day', now()) + interval '5 days 1 hour');

update public.consultations set status = 'completed' where id = '10000000-0000-4000-a000-000000000002';
update public.consultations set status = 'cancelled' where id = '10000000-0000-4000-a000-000000000005';
