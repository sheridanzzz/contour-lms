-- Proves the security model and business rules at the database layer.
-- Run: npm run test:db   (supabase test db)
begin;
select plan(26);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres): one admin, two students, one consultation each
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-a000-000000000001', 'admin@test.local'),
  ('aaaaaaaa-0000-4000-a000-000000000002', 'student-a@test.local'),
  ('aaaaaaaa-0000-4000-a000-000000000003', 'student-b@test.local');

update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-4000-a000-000000000001';

insert into public.consultations (id, student_id, first_name, last_name, reason, scheduled_at) values
  ('bbbbbbbb-0000-4000-a000-000000000002', 'aaaaaaaa-0000-4000-a000-000000000002', 'Ann', 'A', 'Maths', now() + interval '1 day'),
  ('bbbbbbbb-0000-4000-a000-000000000003', 'aaaaaaaa-0000-4000-a000-000000000003', 'Ben', 'B', 'English', now() + interval '2 days');

-- ---------------------------------------------------------------------------
-- Schema guarantees
-- ---------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS enabled on profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.consultations'::regclass), 'RLS enabled on consultations');
select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-4000-a000-000000000002'), 'student', 'new users get the student role');

-- ---------------------------------------------------------------------------
-- Anonymous: no access at all
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select * from public.consultations $$, '42501', null, 'anon cannot read consultations');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
reset role;

-- ---------------------------------------------------------------------------
-- Student A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-a000-000000000002","role":"authenticated"}';

select results_eq($$ select id from public.consultations $$,
  $$ values ('bbbbbbbb-0000-4000-a000-000000000002'::uuid) $$,
  'student sees only their own consultations');
select is((select count(*) from public.profiles), 1::bigint, 'student sees only their own profile');
select is(public.is_admin(), false, 'is_admin() is false for a student');

select throws_ok($$ update public.profiles set role = 'admin' $$, '42501', null, 'student cannot change roles');
select throws_ok($$ insert into public.consultations (student_id, first_name, last_name, reason, scheduled_at)
  values ('aaaaaaaa-0000-4000-a000-000000000003', 'X', 'Y', 'Z', now() + interval '1 day') $$,
  '42501', null, 'student cannot set the owner on insert');
select throws_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at, status)
  values ('X', 'Y', 'Z', now() + interval '1 day', 'completed') $$,
  '42501', null, 'student cannot set the status on insert');
select throws_ok($$ delete from public.consultations $$, '42501', null, 'student cannot delete');

select is_empty($$ update public.consultations set status = 'cancelled'
  where id = 'bbbbbbbb-0000-4000-a000-000000000003' returning id $$,
  'student cannot update another student''s consultation');

select lives_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
  values ('Ann', 'A', 'Physics', now() + interval '3 days') $$, 'student can book a future consultation');
select throws_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
  values ('Ann', 'A', 'Past', now() - interval '1 hour') $$,
  'PT400', null, 'booking in the past is rejected');
select throws_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
  values (' ', 'A', 'Blank', now() + interval '1 day') $$,
  '23514', null, 'blank names are rejected');
select throws_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
  values ('Ann', 'A', repeat('x', 1001), now() + interval '1 day') $$,
  '23514', null, 'over-long reason is rejected');
select throws_ok($$ update public.consultations set scheduled_at = now() - interval '1 hour'
  where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$,
  'PT400', null, 'rescheduling into the past is rejected');

-- Status rules on student A's consultation
select lives_ok($$ update public.consultations set status = 'completed' where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$, 'booked -> completed');
select throws_ok($$ update public.consultations set scheduled_at = now() + interval '4 days' where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$,
  'PT409', null, 'completed consultations cannot be rescheduled');
select lives_ok($$ update public.consultations set status = 'booked' where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$, 'completed -> booked');
select lives_ok($$ update public.consultations set status = 'cancelled' where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$, 'booked -> cancelled');
select throws_ok($$ update public.consultations set status = 'booked' where id = 'bbbbbbbb-0000-4000-a000-000000000002' $$,
  'PT409', null, 'cancelled is final');
reset role;

-- ---------------------------------------------------------------------------
-- Admin: reads everything, writes nothing
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-a000-000000000001","role":"authenticated"}';

select is((select count(*) from public.consultations
  where student_id in ('aaaaaaaa-0000-4000-a000-000000000002', 'aaaaaaaa-0000-4000-a000-000000000003')),
  3::bigint, 'admin sees every student''s consultations');
select throws_ok($$ insert into public.consultations (first_name, last_name, reason, scheduled_at)
  values ('Ad', 'Min', 'Admins do not book', now() + interval '1 day') $$,
  '42501', null, 'admins cannot book');
select is_empty($$ update public.consultations set status = 'completed'
  where id = 'bbbbbbbb-0000-4000-a000-000000000003' returning id $$,
  'admin view is read-only');
reset role;

select * from finish();
rollback;
