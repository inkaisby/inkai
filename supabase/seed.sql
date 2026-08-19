-- Local development seed. This file is run by `supabase db reset` / `supabase start`
-- AFTER all migrations. It is NOT applied by `supabase db push`, so nothing here
-- affects the hosted (production) database.
--
-- Why this is needed:
-- In this local stack the default privileges only grant TRUNCATE/REFERENCES/TRIGGER
-- to the standard Supabase roles, so the app's admin client (service_role) and the
-- browser client (authenticated/anon) get "permission denied" on the base and
-- hierarchy tables (profiles, menus, ranting, cabang, events, ...). In the hosted
-- project these grants were applied manually. We recreate them here for local dev.
-- Row-level security (enabled by the migrations on the relevant tables) still governs
-- which rows each role can see.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Keep future tables/sequences/functions accessible too (defensive; harmless locally).
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Demo organisation hierarchy (provinsi -> cabang -> ranting) so dropdowns and the
-- Ranting page have content out of the box. Local dev only; idempotent.
insert into public.provinsi (id, nama, province_id)
values ('11111111-1111-1111-1111-111111111111', 'Jawa Timur', 35)
on conflict (id) do nothing;

insert into public.cabang (id, nama, provinsi_id, regency_id)
values ('22222222-2222-2222-2222-222222222222', 'Kota Surabaya',
        '11111111-1111-1111-1111-111111111111', 3578)
on conflict (id) do nothing;

insert into public.ranting (id, nama, aktif, cabang_id, province_id, regency_id, district_id)
values ('33333333-3333-3333-3333-333333333333', 'Dojo INKAI Surabaya Pusat', true,
        '22222222-2222-2222-2222-222222222222', 35, 3578, 357801)
on conflict (id) do nothing;
