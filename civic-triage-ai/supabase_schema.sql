-- 1. Enable PostGIS extension for spatial queries
create extension if not exists postgis with schema extensions;

-- Drop existing tables so you can run this script cleanly
drop table if exists public.area_assignments cascade;
drop table if exists public.reports cascade;
drop table if exists public.citizens cascade;
drop table if exists public.officials cascade;

-- ============================================================
-- 2. CITIZENS TABLE
-- ============================================================
create table public.citizens (
    id uuid default gen_random_uuid() primary key,
    aadhar_number text unique not null,
    password_hash text not null,
    is_aadhar_verified boolean default false not null,
    state text,
    city text,
    preferred_language text default 'en',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- 3. OFFICIALS TABLE (email/password + ID card verification)
-- ============================================================
create table public.officials (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text unique not null,
    password_hash text not null,
    state text not null,
    city text not null,
    id_card_url text not null,
    verification_status text default 'pending' not null
        check (verification_status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- 4. AREA ASSIGNMENTS TABLE (PIN code → official mapping)
-- ============================================================
create table public.area_assignments (
    id uuid default gen_random_uuid() primary key,
    pin_code text unique not null,
    official_id uuid references public.officials(id) not null,
    city text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- 5. REPORTS TABLE
-- ============================================================
create table public.reports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Citizen Link
    citizen_id uuid references public.citizens(id),

    -- Spatial data
    location geography(POINT) not null,
    lat double precision not null,
    lng double precision not null,
    
    -- Report details
    image_url text not null,
    description text,
    
    -- Multilingual support
    original_language text default 'en',
    description_translated text,
    official_reply text,
    official_reply_translated text,

    -- AI Generated Fields
    ai_category text,
    ai_severity integer,
    ai_confidence double precision,
    ai_justification text,
    ai_suggested_department text,
    ai_estimated_complexity text,
    
    -- Emergency escalation
    is_emergency boolean default false,
    emergency_type text,
    emergency_notified_at timestamp with time zone,

    -- Status and deduplication
    status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'duplicate', 'rejected')),
    merged_into_id uuid references public.reports(id),

    -- Resolution (Before/After + Field Ops)
    resolved_image_url text,
    resolved_at timestamp with time zone,
    field_notes text,

    -- PIN-code routing
    pin_code text,
    assigned_to uuid references public.officials(id)
);

-- 6. Create spatial index for fast distance queries
create index reports_geo_index on public.reports using gist (location);

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================
alter table public.reports enable row level security;
alter table public.citizens enable row level security;
alter table public.officials enable row level security;
alter table public.area_assignments enable row level security;

create policy "Allow public read access" on public.reports for select to public using (true);
create policy "Allow public insert" on public.reports for insert to public with check (true);
create policy "Allow public update" on public.reports for update to public using (true);

create policy "Allow public read citizens" on public.citizens for select to public using (true);
create policy "Allow public insert citizens" on public.citizens for insert to public with check (true);

create policy "Allow public read officials" on public.officials for select to public using (true);
create policy "Allow public insert officials" on public.officials for insert to public with check (true);

create policy "Allow public read area_assignments" on public.area_assignments for select to public using (true);
create policy "Allow public insert area_assignments" on public.area_assignments for insert to public with check (true);

-- ============================================================
-- 8. RPC: Find reports within a radius
-- ============================================================
create or replace function get_reports_within_radius(
  query_lat double precision,
  query_lng double precision,
  radius_meters double precision
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  image_url text,
  ai_category text,
  ai_severity integer,
  status text,
  distance_meters double precision
)
language sql
as $$
  select
    id,
    lat,
    lng,
    image_url,
    ai_category,
    ai_severity,
    status,
    st_distance(location, st_point(query_lng, query_lat)::geography) as distance_meters
  from
    public.reports
  where
    status = 'open'
    and st_dwithin(location, st_point(query_lng, query_lat)::geography, radius_meters)
  order by
    distance_meters asc;
$$;

-- ============================================================
-- 9. STORAGE BUCKETS
-- ============================================================
-- Report images bucket
insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do nothing;

-- Official ID cards bucket
insert into storage.buckets (id, name, public)
values ('official-id-cards', 'official-id-cards', false)
on conflict (id) do nothing;

-- Storage policies for report-images
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Access' and tablename = 'objects') then
    create policy "Public Access" on storage.objects for select to public using ( bucket_id = 'report-images' );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Insert' and tablename = 'objects') then
    create policy "Public Insert" on storage.objects for insert to public with check ( bucket_id = 'report-images' );
  end if;
end $$;

-- Storage policies for official-id-cards (insert only, no public read)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Official ID Insert' and tablename = 'objects') then
    create policy "Official ID Insert" on storage.objects for insert to public with check ( bucket_id = 'official-id-cards' );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Official ID Read' and tablename = 'objects') then
    create policy "Official ID Read" on storage.objects for select to public using ( bucket_id = 'official-id-cards' );
  end if;
end $$;

-- ============================================================
-- 10. SEED DATA: Default approved admin + sample area assignments
-- ============================================================
-- Password is 'admin123' hashed with bcrypt (10 rounds)
insert into public.officials (name, email, password_hash, state, city, id_card_url, verification_status)
values (
  'City Admin',
  'admin@civictriage.gov.in',
  '$2a$10$XQxBj6SZio/rL3R8mRqKNeVB8WgNiaKWjVMwSJ3Kx5RzxFCjXO9Wy',
  'Maharashtra',
  'Mumbai',
  'seeded-admin',
  'approved'
) on conflict (email) do nothing;
