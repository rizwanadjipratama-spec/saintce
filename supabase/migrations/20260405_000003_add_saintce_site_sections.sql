begin;

create table if not exists public.site_content_sections (
  section_key text primary key,
  heading text,
  subheading text,
  body text,
  primary_label text,
  secondary_label text,
  items jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists site_content_sections_set_updated_at on public.site_content_sections;
create trigger site_content_sections_set_updated_at
before update on public.site_content_sections
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.site_content_sections enable row level security;

drop policy if exists "site_content_sections_public_read" on public.site_content_sections;
create policy "site_content_sections_public_read"
on public.site_content_sections
for select
to anon, authenticated
using (true);

drop policy if exists "site_content_sections_admin_manage" on public.site_content_sections;
create policy "site_content_sections_admin_manage"
on public.site_content_sections
for all
to authenticated
using (public.is_saintce_admin())
with check (public.is_saintce_admin());

insert into public.site_content_sections (section_key, heading, subheading, body, primary_label, secondary_label, items, meta)
values
  (
    'hero',
    'Skeuomorphic control surface for modern operations',
    'Build the system. Control the surface.',
    'Saintce turns marketing, client delivery, and internal admin operations into one polished control layer with premium performance and disciplined architecture.',
    'Launch a Build',
    'Open Saintce Control',
    '[{"label":"Admin Coverage","value":"Clients, CMS, Ops"},{"label":"Performance","value":"GPU-safe motion, cleaned timers, controlled subscriptions."},{"label":"Architecture","value":"Centralized data access with less duplication and cleaner state flow."}]'::jsonb,
    '{"panelEyebrow":"Command Surface","panelTitle":"Clients, CMS, Ops","footerLeft":"Saintce Control","footerRight":"Edition 2026"}'::jsonb
  ),
  (
    'process',
    'Process',
    'Built like a control system, not a landing page.',
    null,
    null,
    null,
    '[{"number":"01","title":"Map the system","description":"We collapse goals, permissions, content flows, and entities into one operating model before visuals or code fan out."},{"number":"02","title":"Shape the surface","description":"Navigation, panels, forms, and actions are designed as tactile control hardware so the interface feels deliberate, not generic."},{"number":"03","title":"Engineer the runtime","description":"We centralize data access, remove duplicate state paths, and keep motion cheap enough for Chrome inspection and real use."},{"number":"04","title":"Expand the console","description":"Once the core is reliable, new modules can grow into CRM, ERP, and internal operations without rewriting the shell."}]'::jsonb,
    '{}'::jsonb
  ),
  (
    'metrics',
    null,
    null,
    null,
    null,
    null,
    '[{"value":1,"suffix":"","label":"Unified admin shell"},{"value":0,"suffix":"","label":"Known timer leaks"},{"value":2,"suffix":"","label":"Live CMS domains"},{"value":100,"suffix":"%","label":"Brand consistency target"}]'::jsonb,
    '{}'::jsonb
  ),
  (
    'cta',
    'Contact',
    'Build the public face and the internal machine together.',
    'Saintce is now structured so the website and admin control layer can evolve as one product instead of two disconnected builds.',
    'Start a Saintce Build',
    null,
    '[]'::jsonb,
    '{}'::jsonb
  ),
  (
    'footer',
    null,
    null,
    'Premium control surfaces for operations, delivery, and modern enterprise websites.',
    'Copyright 2026 Saintce Systems. All rights reserved.',
    null,
    '[]'::jsonb,
    '{}'::jsonb
  )
on conflict (section_key) do nothing;

commit;
