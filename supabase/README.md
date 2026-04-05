# Supabase Setup

This project now includes two SQL paths:

1. Incremental baseline:
- `supabase/migrations/20260405_000001_create_saintce_core.sql`

2. Full destructive rebuild:
- `supabase/migrations/20260405_000002_reset_saintce_core_production.sql`

The destructive rebuild is the recommended path if you want to throw away the old schema and recreate Saintce from a clean production-focused base.

It includes:

- `clients`
- `about_section`
- `admin_users`
- `audit_logs`
- enums for status and role
- `updated_at` triggers
- audit triggers
- RLS policies
- realtime publication for live tables

Apply it with the Supabase CLI from the project root:

```bash
supabase db push
```

If you prefer the dashboard SQL editor, run:

- [`supabase/migrations/20260405_000001_create_saintce_core.sql`](C:/Users/Administrator/OneDrive/Desktop/ajcorp/supabase/migrations/20260405_000001_create_saintce_core.sql)
- [`supabase/migrations/20260405_000002_reset_saintce_core_production.sql`](C:/Users/Administrator/OneDrive/Desktop/ajcorp/supabase/migrations/20260405_000002_reset_saintce_core_production.sql)

Notes:

- The destructive rebuild drops old tables before recreating them.
- Admin authorization in SQL is now based on `public.admin_users`, which is more scalable than a hardcoded email check.
- Public users can read non-archived clients and the about section.
- After applying the destructive rebuild, add your auth user into `public.admin_users` before using admin write flows.

Bootstrap your first owner:

```sql
insert into public.admin_users (user_id, email, full_name, role, is_active)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'name', email),
  'owner'::public.app_role,
  true
from auth.users
where email = 'rizwanadjipratama@gmail.com'
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active;
```
