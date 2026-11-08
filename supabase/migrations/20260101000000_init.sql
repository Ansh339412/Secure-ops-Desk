-- SecureOps Desk: initial schema.
-- Every organization-owned table carries organization_id and is protected by Row Level Security.
-- Requires PostgreSQL 15+ (ON DELETE SET NULL (column)); Supabase projects satisfy this.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'analyst', 'viewer');
create type public.asset_type as enum ('laptop', 'server', 'website', 'network', 'other');
create type public.asset_status as enum ('active', 'maintenance', 'retired');
create type public.severity as enum ('low', 'medium', 'high', 'critical');
create type public.vuln_status as enum ('open', 'in_progress', 'resolved', 'accepted');
create type public.incident_status as enum ('open', 'investigating', 'resolved', 'closed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  type public.asset_type not null default 'other',
  operating_system text check (char_length(operating_system) <= 80),
  owner_name text check (char_length(owner_name) <= 80),
  status public.asset_status not null default 'active',
  is_critical boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets child tables prove an asset belongs to the same organization
  unique (id, organization_id)
);

create table public.vulnerabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid not null,
  title text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 4000),
  severity public.severity not null default 'medium',
  status public.vuln_status not null default 'open',
  cve_id text check (cve_id ~* '^CVE-[0-9]{4}-[0-9]{4,}$'),
  due_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- composite FK: a vulnerability can only point at an asset in its own organization
  foreign key (asset_id, organization_id) references public.assets (id, organization_id) on delete cascade
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid,
  title text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 4000),
  severity public.severity not null default 'medium',
  status public.incident_status not null default 'open',
  reported_by uuid references public.profiles (id) on delete set null,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (id, organization_id),
  -- deleting an asset keeps its incidents, just unlinked
  foreign key (asset_id, organization_id) references public.assets (id, organization_id)
    on delete set null (asset_id),
  -- the assignee must be a member of the same organization
  foreign key (organization_id, assigned_to) references public.memberships (org_id, user_id)
    on delete set null (assigned_to)
);

create table public.incident_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  incident_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (incident_id, organization_id) references public.incidents (id, organization_id) on delete cascade
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys and the filters the UI uses)
-- ---------------------------------------------------------------------------
create index assets_org_status_idx on public.assets (organization_id, status);
create index assets_org_created_idx on public.assets (organization_id, created_at desc);
create index vulns_org_status_sev_idx on public.vulnerabilities (organization_id, status, severity);
create index vulns_asset_idx on public.vulnerabilities (asset_id);
create index incidents_org_status_idx on public.incidents (organization_id, status);
create index incidents_asset_idx on public.incidents (asset_id);
create index incidents_assigned_idx on public.incidents (assigned_to);
create index comments_incident_idx on public.incident_comments (incident_id, created_at);
create index audit_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so they can read memberships without recursing into RLS)
-- ---------------------------------------------------------------------------
create function public.org_role(org uuid)
returns public.member_role
language sql stable security definer set search_path = ''
as $$
  select m.role from public.memberships m
  where m.org_id = org and m.user_id = (select auth.uid())
$$;

create function public.is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = org and m.user_id = (select auth.uid())
  )
$$;

create function public.can_write(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.org_role(org) in ('admin', 'analyst'), false)
$$;

create function public.is_org_admin(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.org_role(org) = 'admin', false)
$$;

create function public.shares_org_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers: profile bootstrap, timestamps, resolved_at, last-admin guard, audit log
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create function public.set_resolved_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status::text in ('resolved', 'closed') then
    new.resolved_at := case when tg_op = 'UPDATE' then coalesce(old.resolved_at, now()) else now() end;
  else
    new.resolved_at := null;
  end if;
  return new;
end
$$;

create trigger assets_updated before update on public.assets
  for each row execute function public.set_updated_at();
create trigger vulns_updated before update on public.vulnerabilities
  for each row execute function public.set_updated_at();
create trigger incidents_updated before update on public.incidents
  for each row execute function public.set_updated_at();
create trigger vulns_resolved before insert or update on public.vulnerabilities
  for each row execute function public.set_resolved_at();
create trigger incidents_resolved before insert or update on public.incidents
  for each row execute function public.set_resolved_at();

create function public.protect_last_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    if not exists (
      select 1 from public.memberships m
      where m.org_id = old.org_id and m.role = 'admin' and m.user_id <> old.user_id
    ) then
      raise exception 'An organization must keep at least one admin';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger memberships_last_admin before update or delete on public.memberships
  for each row execute function public.protect_last_admin();

create function public.log_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  org uuid;
begin
  org := coalesce((rec ->> 'organization_id')::uuid, (rec ->> 'org_id')::uuid);
  if org is null then
    return null;
  end if;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, details)
  values (
    org,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'user_id')::uuid,
    jsonb_strip_nulls(jsonb_build_object(
      'title', coalesce(rec ->> 'title', rec ->> 'name'),
      'status', rec ->> 'status',
      'severity', rec ->> 'severity',
      'role', rec ->> 'role'
    ))
  );
  return null;
end
$$;

create trigger assets_audit after insert or update or delete on public.assets
  for each row execute function public.log_audit();
create trigger vulns_audit after insert or update or delete on public.vulnerabilities
  for each row execute function public.log_audit();
create trigger incidents_audit after insert or update or delete on public.incidents
  for each row execute function public.log_audit();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- RPC functions (the only way to create an organization or add a member)
-- ---------------------------------------------------------------------------
create function public.create_organization(org_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(trim(org_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;
  insert into public.organizations (name, created_by) values (trim(org_name), uid) returning id into new_id;
  insert into public.memberships (org_id, user_id, role) values (new_id, uid, 'admin');
  return new_id;
end
$$;

create function public.add_member_by_email(org uuid, member_email text, member_role public.member_role)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
begin
  if not public.is_org_admin(org) then
    raise exception 'Only admins can add members';
  end if;
  select p.id into target from public.profiles p where lower(p.email) = lower(trim(member_email));
  if target is null then
    raise exception 'No registered user with that email';
  end if;
  if exists (select 1 from public.memberships m where m.org_id = org and m.user_id = target) then
    raise exception 'That user is already a member';
  end if;
  insert into public.memberships (org_id, user_id, role) values (org, target, member_role);
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing is public by default
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from public, anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function
  public.org_role(uuid), public.is_org_member(uuid), public.can_write(uuid),
  public.is_org_admin(uuid), public.shares_org_with(uuid),
  public.create_organization(text), public.add_member_by_email(uuid, text, public.member_role)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.assets enable row level security;
alter table public.vulnerabilities enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_comments enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: your own row, plus people you share an organization with
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- organizations: members read, admins rename. Creation goes through create_organization().
create policy orgs_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy orgs_update on public.organizations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- memberships: members read, admins manage. Adding goes through add_member_by_email().
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_org_member(org_id));
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_org_admin(org_id));

-- assets
create policy assets_select on public.assets for select to authenticated
  using (public.is_org_member(organization_id));
create policy assets_insert on public.assets for insert to authenticated
  with check (public.can_write(organization_id));
create policy assets_update on public.assets for update to authenticated
  using (public.can_write(organization_id)) with check (public.can_write(organization_id));
create policy assets_delete on public.assets for delete to authenticated
  using (public.is_org_admin(organization_id));

-- vulnerabilities
create policy vulns_select on public.vulnerabilities for select to authenticated
  using (public.is_org_member(organization_id));
create policy vulns_insert on public.vulnerabilities for insert to authenticated
  with check (public.can_write(organization_id));
create policy vulns_update on public.vulnerabilities for update to authenticated
  using (public.can_write(organization_id)) with check (public.can_write(organization_id));
create policy vulns_delete on public.vulnerabilities for delete to authenticated
  using (public.is_org_admin(organization_id));

-- incidents: any member can report one (as themselves, unassigned and open); analysts and admins manage them
create policy incidents_select on public.incidents for select to authenticated
  using (public.is_org_member(organization_id));
create policy incidents_insert on public.incidents for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and reported_by = (select auth.uid())
    and (public.can_write(organization_id) or (status = 'open' and assigned_to is null))
  );
create policy incidents_update on public.incidents for update to authenticated
  using (public.can_write(organization_id)) with check (public.can_write(organization_id));
create policy incidents_delete on public.incidents for delete to authenticated
  using (public.is_org_admin(organization_id));

-- incident comments: any member can add one as themselves; notes are immutable
create policy comments_select on public.incident_comments for select to authenticated
  using (public.is_org_member(organization_id));
create policy comments_insert on public.incident_comments for insert to authenticated
  with check (public.is_org_member(organization_id) and author_id = (select auth.uid()));

-- audit logs: admins read; rows are written only by triggers
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_org_admin(organization_id));
