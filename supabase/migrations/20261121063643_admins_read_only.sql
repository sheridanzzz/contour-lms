-- Admins oversee consultations; only students book and manage them.
-- One rule for every client: admins read everything and write nothing.
-- (A user promoted to admin also loses write access to their own old bookings.)

drop policy "Students book consultations for themselves" on public.consultations;
create policy "Students book consultations for themselves"
  on public.consultations for insert to authenticated
  with check (student_id = (select auth.uid()) and not (select public.is_admin()));

drop policy "Students update their own consultations" on public.consultations;
create policy "Students update their own consultations"
  on public.consultations for update to authenticated
  using (student_id = (select auth.uid()) and not (select public.is_admin()))
  with check (student_id = (select auth.uid()) and not (select public.is_admin()));
