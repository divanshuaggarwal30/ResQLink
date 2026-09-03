/*
============================================================
RESQLINK — OPERATIONS UPGRADE
Steps 10 → 15
============================================================

Adds:

10. Intelligent dispatch
11. Automatic responder availability
12. Mission timestamps / timeline
13. Realtime responder operations
14. Operational analytics
15. Database-level enforcement

IMPORTANT:
This migration is designed around the current schema:

profiles:
  id
  full_name
  role
  created_at
  availability
  latitude
  longitude
  last_location_at

incidents:
  id
  reported_by
  type
  severity
  latitude
  longitude
  status
  responder_id
  created_at
  assigned_at
  accepted_at
  arrived_at
  resolved_at
============================================================
*/


/*
============================================================
1. RESPONDER PROFILE FIELDS
============================================================
*/

alter table public.profiles
add column if not exists availability text
default 'available';

alter table public.profiles
add column if not exists latitude double precision;

alter table public.profiles
add column if not exists longitude double precision;

alter table public.profiles
add column if not exists last_location_at timestamptz;


/*
============================================================
2. VALIDATE RESPONDER AVAILABILITY
============================================================
*/

alter table public.profiles
drop constraint if exists profiles_availability_check;

alter table public.profiles
add constraint profiles_availability_check
check (
  availability in (
    'available',
    'busy',
    'offline'
  )
);


/*
============================================================
3. DEFAULT EXISTING RESPONDERS
============================================================
*/

update public.profiles
set availability = 'available'
where role = 'responder'
  and (
    availability is null
    or availability not in (
      'available',
      'busy',
      'offline'
    )
  );


/*
============================================================
4. INCIDENT TIMELINE INDEXES
============================================================
*/

create index if not exists incidents_status_idx
on public.incidents(status);

create index if not exists incidents_responder_id_idx
on public.incidents(responder_id);

create index if not exists incidents_created_at_idx
on public.incidents(created_at desc);

create index if not exists incidents_severity_idx
on public.incidents(severity);

create index if not exists profiles_role_availability_idx
on public.profiles(role, availability);


/*
============================================================
5. ARCHIVE TABLE HARDENING
============================================================
*/

alter table public.incident_archive
add column if not exists accepted_at timestamptz;

alter table public.incident_archive
add column if not exists arrived_at timestamptz;

alter table public.incident_archive
add column if not exists archived_at timestamptz;


/*
============================================================
6. DISPATCH FUNCTION
============================================================

ONLY ADMINS can call this.

The function:

- validates authenticated user
- validates admin role
- locks incident
- locks responder
- verifies incident is pending
- verifies responder exists
- verifies responder is available
- assigns responder
- sets assigned_at
- marks responder busy
- returns incident

This prevents two admins from dispatching the
same responder simultaneously.
============================================================
*/

create or replace function public.dispatch_incident(
  target_incident_id uuid,
  target_responder_id uuid
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  target_incident public.incidents;
  target_responder public.profiles;
begin

  /*
  ----------------------------------------------------------
  ADMIN AUTHORIZATION
  ----------------------------------------------------------
  */

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then

    raise exception
      'Only administrators can dispatch responders';

  end if;


  /*
  ----------------------------------------------------------
  LOCK INCIDENT
  ----------------------------------------------------------
  */

  select *
  into target_incident
  from public.incidents
  where id = target_incident_id
  for update;


  if target_incident.id is null then

    raise exception
      'Incident not found';

  end if;


  /*
  ----------------------------------------------------------
  INCIDENT MUST STILL BE PENDING
  ----------------------------------------------------------
  */

  if target_incident.status <> 'pending' then

    raise exception
      'Incident is no longer pending';

  end if;


  if target_incident.responder_id is not null then

    raise exception
      'Incident already has a responder';

  end if;


  /*
  ----------------------------------------------------------
  LOCK RESPONDER
  ----------------------------------------------------------
  */

  select *
  into target_responder
  from public.profiles
  where id = target_responder_id
    and role = 'responder'
  for update;


  if target_responder.id is null then

    raise exception
      'Responder not found';

  end if;


  /*
  ----------------------------------------------------------
  RESPONDER MUST BE AVAILABLE
  ----------------------------------------------------------
  */

  if target_responder.availability <> 'available' then

    raise exception
      'Responder is not available';

  end if;


  /*
  ----------------------------------------------------------
  DISPATCH
  ----------------------------------------------------------
  */

  update public.incidents
  set
    responder_id = target_responder_id,
    assigned_at = coalesce(
      assigned_at,
      now()
    )
  where id = target_incident_id;


  /*
  ----------------------------------------------------------
  RESPONDER BECOMES BUSY
  ----------------------------------------------------------
  */

  update public.profiles
  set availability = 'busy'
  where id = target_responder_id;


  /*
  ----------------------------------------------------------
  RETURN UPDATED INCIDENT
  ----------------------------------------------------------
  */

  select *
  into target_incident
  from public.incidents
  where id = target_incident_id;

  return target_incident;

end;
$$;


grant execute
on function public.dispatch_incident(uuid, uuid)
to authenticated;


/*
============================================================
7. RESPONDER LOCATION FUNCTION
============================================================
*/

create or replace function public.update_responder_location(
  responder_latitude double precision,
  responder_longitude double precision
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'responder'
  ) then

    raise exception
      'Only responders can update responder location';

  end if;


  if responder_latitude < -90
     or responder_latitude > 90 then

    raise exception
      'Invalid latitude';

  end if;


  if responder_longitude < -180
     or responder_longitude > 180 then

    raise exception
      'Invalid longitude';

  end if;


  update public.profiles
  set
    latitude = responder_latitude,
    longitude = responder_longitude,
    last_location_at = now()
  where id = auth.uid()
  returning *
  into updated_profile;


  return updated_profile;

end;
$$;


grant execute
on function public.update_responder_location(
  double precision,
  double precision
)
to authenticated;


/*
============================================================
8. RESPONDER AVAILABILITY FUNCTION
============================================================
*/

create or replace function public.update_responder_availability(
  new_availability text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'responder'
  ) then

    raise exception
      'Only responders can update availability';

  end if;


  if new_availability not in (
    'available',
    'busy',
    'offline'
  ) then

    raise exception
      'Invalid availability status';

  end if;


  /*
  A responder cannot manually mark themselves
  available while they still have an unresolved mission.
  */

  if new_availability = 'available'
     and exists (
       select 1
       from public.incidents
       where responder_id = auth.uid()
         and status in (
           'pending',
           'accepted',
           'arrived'
         )
     )
  then

    raise exception
      'Cannot become available while an active mission exists';

  end if;


  update public.profiles
  set availability = new_availability
  where id = auth.uid()
  returning *
  into updated_profile;


  return updated_profile;

end;
$$;


grant execute
on function public.update_responder_availability(text)
to authenticated;


/*
============================================================
9. STATUS TRANSITION FUNCTION
============================================================
*/

create or replace function public.update_incident_status(
  incident_id uuid,
  new_status incident_status
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_incident public.incidents;
begin

  /*
  ----------------------------------------------------------
  VERIFY ASSIGNMENT
  ----------------------------------------------------------
  */

  if not exists (
    select 1
    from public.incidents
    where id = incident_id
      and responder_id = auth.uid()
  ) then

    raise exception
      'You are not assigned to this incident';

  end if;


  /*
  ----------------------------------------------------------
  PENDING → ACCEPTED
  ----------------------------------------------------------
  */

  if new_status = 'accepted' then

    update public.incidents
    set
      status = 'accepted',
      accepted_at = coalesce(
        accepted_at,
        now()
      )
    where id = incident_id
      and responder_id = auth.uid()
      and status = 'pending';

    if not found then

      raise exception
        'Incident must be pending before acceptance';

    end if;


  /*
  ----------------------------------------------------------
  ACCEPTED → ARRIVED
  ----------------------------------------------------------
  */

  elsif new_status = 'arrived' then

    update public.incidents
    set
      status = 'arrived',
      arrived_at = coalesce(
        arrived_at,
        now()
      )
    where id = incident_id
      and responder_id = auth.uid()
      and status = 'accepted';

    if not found then

      raise exception
        'Incident must be accepted before arrival';

    end if;


  /*
  ----------------------------------------------------------
  ARRIVED → RESOLVED
  ----------------------------------------------------------
  */

  elsif new_status = 'resolved' then

    update public.incidents
    set
      status = 'resolved',
      resolved_at = coalesce(
        resolved_at,
        now()
      )
    where id = incident_id
      and responder_id = auth.uid()
      and status = 'arrived';

    if not found then

      raise exception
        'Responder must arrive before resolving';

    end if;


    /*
    --------------------------------------------------------
    RESPONDER BECOMES AVAILABLE
    --------------------------------------------------------
    */

    update public.profiles
    set availability = 'available'
    where id = auth.uid();


  else

    raise exception
      'Invalid incident status transition';

  end if;


  select *
  into updated_incident
  from public.incidents
  where id = incident_id;


  return updated_incident;

end;
$$;


grant execute
on function public.update_incident_status(
  uuid,
  incident_status
)
to authenticated;


/*
============================================================
10. ARCHIVE TRIGGER
============================================================
*/

create or replace function public.archive_resolved_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    new.status = 'resolved'
    and old.status <> 'resolved'
  then

    insert into public.incident_archive (
      id,
      reported_by,
      responder_id,
      type,
      severity,
      latitude,
      longitude,
      status,
      created_at,
      assigned_at,
      accepted_at,
      arrived_at,
      resolved_at,
      archived_at
    )
    values (
      new.id,
      new.reported_by,
      new.responder_id,
      new.type,
      new.severity,
      new.latitude,
      new.longitude,
      new.status,
      new.created_at,
      new.assigned_at,
      new.accepted_at,
      new.arrived_at,
      new.resolved_at,
      now()
    )
    on conflict (id) do nothing;

  end if;

  return new;

end;
$$;


drop trigger if exists trigger_archive_resolved_incident
on public.incidents;


create trigger trigger_archive_resolved_incident
after update on public.incidents
for each row
execute function public.archive_resolved_incident();


/*
============================================================
11. REALTIME
============================================================
*/

do $$
begin

  begin
    alter publication supabase_realtime
    add table public.profiles;
  exception
    when duplicate_object then
      null;
  end;

end;
$$;


/*
============================================================
12. REMOVE DIRECT ADMIN INCIDENT UPDATE
============================================================

Dispatch must go through dispatch_incident().

This prevents an Admin client from simply doing:

.from("incidents")
.update({
  responder_id: someone,
  assigned_at: ...
})

and bypassing availability validation.
============================================================
*/

drop policy if exists
"Admins can dispatch incidents"
on public.incidents;

drop policy if exists
"Admins can update incidents"
on public.incidents;


/*
============================================================
13. FINAL COMMENTS
============================================================
*/

comment on function public.dispatch_incident(uuid, uuid)
is 'Secure admin-only incident dispatch with responder availability locking';

comment on function public.update_incident_status(uuid, incident_status)
is 'Secure responder-only incident state machine';

comment on function public.update_responder_location(double precision, double precision)
is 'Secure responder GPS update';

comment on function public.update_responder_availability(text)
is 'Secure responder availability update';