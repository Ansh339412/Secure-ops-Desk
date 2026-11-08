-- Row Level Security test suite. Runs in one transaction and rolls back.
-- Each passing scenario prints "PASS: ..."; any failure raises an exception and aborts.
begin;

create schema tests;

create function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute 'set local role authenticated';
end $$;

create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create function tests.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
end $$;

-- true when the statement raises any error (permission denied, RLS violation, FK, trigger...)
create function tests.denied(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- number of rows the statement touched or returned
create function tests.rows(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || stmt || ') t' into n;
  return n;
end $$;

create function tests.affected(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

create function tests.check(name text, ok boolean) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', name; end if;
  raise notice 'PASS: %', name;
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000000a'; -- admin of org A
  bob   uuid := '00000000-0000-0000-0000-00000000000b'; -- admin of org B
  carol uuid := '00000000-0000-0000-0000-00000000000c'; -- viewer in org A
  dave  uuid := '00000000-0000-0000-0000-00000000000d'; -- analyst in org A
  eve   uuid := '00000000-0000-0000-0000-00000000000e'; -- not in any org
  org_a uuid; org_b uuid; asset_a uuid; asset_b uuid; vuln_a uuid; inc_a uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (alice, 'alice@example.com', '{"full_name":"Alice"}'),
    (bob,   'bob@example.com',   '{"full_name":"Bob"}'),
    (carol, 'carol@example.com', '{"full_name":"Carol"}'),
    (dave,  'dave@example.com',  '{"full_name":"Dave"}'),
    (eve,   'eve@example.com',   '{"full_name":"Eve"}');

  -- Organization creation and membership ------------------------------------------------
  perform tests.as_user(alice);
  select public.create_organization('Org A') into org_a;
  perform tests.as_user(bob);
  select public.create_organization('Org B') into org_b;

  perform tests.as_user(alice);
  perform public.add_member_by_email(org_a, 'carol@example.com', 'viewer');
  perform public.add_member_by_email(org_a, 'dave@example.com', 'analyst');

  perform tests.check('creator becomes admin of the new organization',
    (select role from public.memberships where org_id = org_a and user_id = alice) = 'admin');
  perform tests.check('admin sees only their own organization',
    tests.rows('select 1 from public.organizations') = 1);

  perform tests.as_user(carol);
  perform tests.check('viewer cannot add members', tests.denied(
    format('select public.add_member_by_email(%L, %L, %L)', org_a, 'eve@example.com', 'viewer')));
  perform tests.as_user(dave);
  perform tests.check('analyst cannot add members', tests.denied(
    format('select public.add_member_by_email(%L, %L, %L)', org_a, 'eve@example.com', 'viewer')));
  perform tests.as_user(bob);
  perform tests.check('admin of another org cannot add members to org A', tests.denied(
    format('select public.add_member_by_email(%L, %L, %L)', org_a, 'eve@example.com', 'viewer')));
  perform tests.as_anon();
  perform tests.check('unauthenticated caller cannot create an organization', tests.denied(
    'select public.create_organization(''Ghost Org'')'));

  -- Assets -------------------------------------------------------------------------------
  perform tests.as_user(alice);
  insert into public.assets (organization_id, name, type, created_by)
    values (org_a, 'A web server', 'server', alice) returning id into asset_a;
  perform tests.as_user(bob);
  insert into public.assets (organization_id, name, type, created_by)
    values (org_b, 'B laptop', 'laptop', bob) returning id into asset_b;

  perform tests.check('outsider cannot read another organization''s asset by id',
    tests.rows(format('select 1 from public.assets where id = %L', asset_a)) = 0);
  perform tests.check('each admin lists only their own assets',
    tests.rows('select 1 from public.assets') = 1);
  perform tests.check('outsider cannot insert an asset into another organization', tests.denied(
    format('insert into public.assets (organization_id, name) values (%L, %L)', org_a, 'Planted asset')));
  perform tests.check('outsider cannot update another organization''s asset',
    tests.affected(format('update public.assets set name = %L where id = %L', 'Hacked', asset_a)) = 0);
  perform tests.check('outsider cannot delete another organization''s asset',
    tests.affected(format('delete from public.assets where id = %L', asset_a)) = 0);

  perform tests.as_user(carol);
  perform tests.check('viewer can read assets',
    tests.rows(format('select 1 from public.assets where id = %L', asset_a)) = 1);
  perform tests.check('viewer cannot insert assets', tests.denied(
    format('insert into public.assets (organization_id, name) values (%L, %L)', org_a, 'Viewer asset')));
  perform tests.check('viewer cannot update assets',
    tests.affected(format('update public.assets set name = %L where id = %L', 'Nope', asset_a)) = 0);

  perform tests.as_user(dave);
  perform tests.check('analyst can insert assets', not tests.denied(
    format('insert into public.assets (organization_id, name) values (%L, %L)', org_a, 'Analyst laptop')));
  perform tests.check('analyst can update assets',
    tests.affected(format('update public.assets set name = %L where id = %L', 'A web server (edited)', asset_a)) = 1);
  perform tests.check('analyst cannot delete assets',
    tests.affected(format('delete from public.assets where id = %L', asset_a)) = 0);

  perform tests.as_user(alice);
  perform tests.check('admin cannot move an asset into another organization', tests.denied(
    format('update public.assets set organization_id = %L where id = %L', org_b, asset_a)));

  -- Vulnerabilities ----------------------------------------------------------------------
  perform tests.check('vulnerability cannot reference an asset from another organization', tests.denied(
    format('insert into public.vulnerabilities (organization_id, asset_id, title) values (%L, %L, %L)',
      org_a, asset_b, 'Cross-org vuln')));

  perform tests.as_user(dave);
  insert into public.vulnerabilities (organization_id, asset_id, title, severity, created_by)
    values (org_a, asset_a, 'Outdated OpenSSL', 'high', dave) returning id into vuln_a;
  perform tests.check('analyst can record a vulnerability', vuln_a is not null);

  perform tests.as_user(carol);
  perform tests.check('viewer cannot record vulnerabilities', tests.denied(
    format('insert into public.vulnerabilities (organization_id, asset_id, title) values (%L, %L, %L)',
      org_a, asset_a, 'Viewer vuln')));

  perform tests.as_user(dave);
  update public.vulnerabilities set status = 'resolved' where id = vuln_a;
  perform tests.check('resolving a vulnerability stamps resolved_at',
    (select resolved_at is not null from public.vulnerabilities where id = vuln_a));

  -- Incidents and comments ---------------------------------------------------------------
  perform tests.as_user(carol);
  insert into public.incidents (organization_id, asset_id, title, severity, reported_by)
    values (org_a, asset_a, 'Suspicious login', 'high', carol) returning id into inc_a;
  perform tests.check('viewer can report an incident', inc_a is not null);
  perform tests.check('viewer cannot report an incident as someone else', tests.denied(
    format('insert into public.incidents (organization_id, title, reported_by) values (%L, %L, %L)',
      org_a, 'Spoofed report', alice)));
  perform tests.check('viewer cannot open an incident already assigned', tests.denied(
    format('insert into public.incidents (organization_id, title, reported_by, assigned_to) values (%L, %L, %L, %L)',
      org_a, 'Self-assigned', carol, dave)));
  perform tests.check('viewer cannot update incidents',
    tests.affected(format('update public.incidents set status = %L where id = %L', 'closed', inc_a)) = 0);
  perform tests.check('viewer can comment on an incident', not tests.denied(
    format('insert into public.incident_comments (organization_id, incident_id, author_id, body) values (%L, %L, %L, %L)',
      org_a, inc_a, carol, 'Seen from a new device')));

  perform tests.as_user(bob);
  perform tests.check('outsider cannot read another organization''s incidents',
    tests.rows(format('select 1 from public.incidents where id = %L', inc_a)) = 0);
  perform tests.check('outsider cannot comment on another organization''s incident', tests.denied(
    format('insert into public.incident_comments (organization_id, incident_id, author_id, body) values (%L, %L, %L, %L)',
      org_a, inc_a, bob, 'Hello')));

  perform tests.as_user(dave);
  perform tests.check('analyst can assign an incident to a member',
    tests.affected(format('update public.incidents set assigned_to = %L, status = %L where id = %L',
      dave, 'investigating', inc_a)) = 1);
  perform tests.check('incident cannot be assigned to a non-member', tests.denied(
    format('update public.incidents set assigned_to = %L where id = %L', eve, inc_a)));
  perform tests.check('investigation notes are immutable',
    tests.affected('update public.incident_comments set body = ''edited''') = 0);

  -- Audit log ----------------------------------------------------------------------------
  perform tests.as_user(alice);
  perform tests.check('admin can read the audit log of their organization',
    tests.rows('select 1 from public.audit_logs') > 0);
  perform tests.check('audit log only contains rows from the admin''s organization',
    tests.rows(format('select 1 from public.audit_logs where organization_id <> %L', org_a)) = 0);
  perform tests.check('audit log records asset creation',
    tests.rows(format('select 1 from public.audit_logs where entity_type = ''assets'' and action = ''insert'' and entity_id = %L', asset_a)) = 1);
  perform tests.check('users cannot write audit log rows directly', tests.denied(
    format('insert into public.audit_logs (organization_id, action, entity_type) values (%L, %L, %L)',
      org_a, 'insert', 'assets')));
  perform tests.check('users cannot tamper with audit log rows',
    tests.affected('update public.audit_logs set action = ''noop''') = 0);

  perform tests.as_user(dave);
  perform tests.check('analyst cannot read the audit log', tests.rows('select 1 from public.audit_logs') = 0);
  perform tests.as_user(carol);
  perform tests.check('viewer cannot read the audit log', tests.rows('select 1 from public.audit_logs') = 0);

  -- Memberships and profiles -------------------------------------------------------------
  perform tests.as_user(carol);
  perform tests.check('viewer cannot promote themselves',
    tests.affected(format('update public.memberships set role = %L where user_id = %L', 'admin', carol)) = 0);
  perform tests.check('members can list their organization''s members',
    tests.rows(format('select 1 from public.memberships where org_id = %L', org_a)) = 3);
  perform tests.check('members can see co-members'' profiles',
    tests.rows(format('select 1 from public.profiles where id = %L', alice)) = 1);

  perform tests.as_user(bob);
  perform tests.check('profiles of people in other organizations are hidden',
    tests.rows(format('select 1 from public.profiles where id = %L', alice)) = 0);
  perform tests.check('members of other organizations are hidden',
    tests.rows(format('select 1 from public.memberships where org_id = %L', org_a)) = 0);

  perform tests.as_user(alice);
  perform tests.check('admin can change a member''s role',
    tests.affected(format('update public.memberships set role = %L where org_id = %L and user_id = %L',
      'viewer', org_a, dave)) = 1);
  perform tests.check('the last admin cannot be demoted', tests.denied(
    format('update public.memberships set role = %L where org_id = %L and user_id = %L', 'viewer', org_a, alice)));
  perform tests.check('the last admin cannot be removed', tests.denied(
    format('delete from public.memberships where org_id = %L and user_id = %L', org_a, alice)));

  -- Unauthenticated access ---------------------------------------------------------------
  perform tests.as_anon();
  perform tests.check('anonymous role cannot read assets', tests.denied('select 1 from public.assets'));
  perform tests.check('anonymous role cannot read organizations', tests.denied('select 1 from public.organizations'));

  perform tests.as_admin();
end $$;

rollback;
