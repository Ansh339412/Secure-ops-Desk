-- OPTIONAL sample data for screenshots and demos. Not needed to run the app.
-- 1. Register, create an organization in the app.
-- 2. Paste this file into the Supabase SQL editor and run it (it runs as the project owner).
-- It fills the OLDEST organization in the project. Every record is prefixed "Demo -".
do $$
declare
  org uuid;
  creator uuid;
  web uuid;
  db uuid;
  laptop uuid;
  site uuid;
  inc uuid;
begin
  select id, created_by into org, creator from public.organizations order by created_at asc limit 1;
  if org is null then
    raise exception 'Create an organization in the app first';
  end if;

  insert into public.assets (organization_id, name, type, operating_system, owner_name, is_critical, created_by)
  values (org, 'Demo - Payroll database server', 'server', 'Ubuntu 22.04', 'Infrastructure team', true, creator)
  returning id into db;
  insert into public.assets (organization_id, name, type, operating_system, owner_name, is_critical, created_by)
  values (org, 'Demo - Public website', 'website', 'Debian 12 (nginx)', 'Web team', true, creator)
  returning id into web;
  insert into public.assets (organization_id, name, type, operating_system, owner_name, created_by)
  values (org, 'Demo - Finance laptop 14', 'laptop', 'Windows 11 23H2', 'Finance office', creator)
  returning id into laptop;
  insert into public.assets (organization_id, name, type, operating_system, owner_name, created_by)
  values (org, 'Demo - Campus Wi-Fi controller', 'network', 'Vendor firmware 8.2', 'Network team', creator)
  returning id into site;

  insert into public.vulnerabilities (organization_id, asset_id, title, description, severity, status, cve_id, due_date, created_by)
  values
    (org, db, 'Demo - Database port reachable from the guest network', 'Firewall rule allows 5432 from VLAN 30.', 'critical', 'open', null, current_date - 5, creator),
    (org, db, 'Demo - Unpatched PostgreSQL minor version', null, 'high', 'in_progress', null, current_date + 10, creator),
    (org, web, 'Demo - Outdated TLS configuration', 'TLS 1.0 still enabled on the load balancer.', 'high', 'open', null, current_date + 3, creator),
    (org, web, 'Demo - Missing security headers', null, 'medium', 'resolved', null, current_date - 20, creator),
    (org, laptop, 'Demo - Disk encryption not enabled', null, 'medium', 'open', null, current_date + 30, creator),
    (org, site, 'Demo - Default admin credentials on controller', null, 'critical', 'in_progress', null, current_date + 2, creator);

  insert into public.incidents (organization_id, asset_id, title, description, severity, status, reported_by, assigned_to)
  values (org, laptop, 'Demo - Suspicious login to finance mailbox', 'Login from an unfamiliar country at 03:10.', 'high', 'investigating', creator, creator)
  returning id into inc;
  insert into public.incident_comments (organization_id, incident_id, author_id, body)
  values (org, inc, creator, 'Forced a password reset and revoked active sessions.');

  insert into public.incidents (organization_id, asset_id, title, severity, status, reported_by)
  values (org, web, 'Demo - Spike of failed admin logins', 'medium', 'open', creator);
end $$;
