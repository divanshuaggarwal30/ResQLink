-- ============================================================
-- ResQLink Production Authentication & Operations
-- ============================================================
--
-- PUBLIC USERS
--   New accounts become civilians automatically.
--
-- PRIVILEGED USERS
--   Admins and responders are provisioned separately.
--
-- OPERATIONS
--   Secure admin dispatch
--   Responder availability
--   Responder GPS tracking
--   Responder mission state machine
--   Automatic responder availability after resolution
--   Resolved incident archival
--   Realtime responder operations
--
-- ============================================================


-- ============================================================
-- 1. AUTOMATIC CIVILIAN PROFILE CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_resqlink_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  INSERT INTO public.profiles (
    id,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(
        NEW.raw_user_meta_data ->> 'full_name',
        ''
      ),
      'ResQLink User'
    ),
    'civilian'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS resqlink_on_auth_user_created
ON auth.users;


CREATE TRIGGER resqlink_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_resqlink_new_user();


-- ============================================================
-- 2. RESPONDER AVAILABILITY
-- ============================================================

DROP FUNCTION IF EXISTS public.update_responder_availability(text);


CREATE OR REPLACE FUNCTION public.update_responder_availability(
  new_availability text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN

  -- Only responders can change responder availability.

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'responder'
  ) THEN

    RAISE EXCEPTION
      'Only responders can update availability';

  END IF;


  -- Validate availability.

  IF new_availability NOT IN (
    'available',
    'busy',
    'offline'
  ) THEN

    RAISE EXCEPTION
      'Invalid availability status';

  END IF;


  -- A responder cannot manually become available
  -- while they still have an active mission.

  IF new_availability = 'available'
     AND EXISTS (
       SELECT 1
       FROM public.incidents
       WHERE responder_id = auth.uid()
         AND status IN (
           'pending',
           'accepted',
           'arrived'
         )
     )
  THEN

    RAISE EXCEPTION
      'Cannot become available while an active mission exists';

  END IF;


  UPDATE public.profiles
  SET availability = new_availability
  WHERE id = auth.uid()
  RETURNING *
  INTO updated_profile;


  RETURN updated_profile;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.update_responder_availability(text)
TO authenticated;


-- ============================================================
-- 3. RESPONDER LOCATION
-- ============================================================

DROP FUNCTION IF EXISTS public.update_responder_location(
  double precision,
  double precision
);


CREATE OR REPLACE FUNCTION public.update_responder_location(
  responder_latitude double precision,
  responder_longitude double precision
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN

  -- Only responders can update their location.

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'responder'
  ) THEN

    RAISE EXCEPTION
      'Only responders can update responder location';

  END IF;


  -- Validate coordinates.

  IF responder_latitude IS NULL
     OR responder_longitude IS NULL
     OR responder_latitude < -90
     OR responder_latitude > 90
     OR responder_longitude < -180
     OR responder_longitude > 180
  THEN

    RAISE EXCEPTION
      'Invalid responder coordinates';

  END IF;


  UPDATE public.profiles
  SET
    latitude = responder_latitude,
    longitude = responder_longitude,
    last_location_at = now()
  WHERE id = auth.uid()
  RETURNING *
  INTO updated_profile;


  RETURN updated_profile;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.update_responder_location(
  double precision,
  double precision
)
TO authenticated;


-- ============================================================
-- 4. SECURE ADMIN DISPATCH
-- ============================================================
--
-- This is intentionally atomic:
--
--   1. Verify admin
--   2. Lock incident
--   3. Verify incident is still pending
--   4. Lock responder
--   5. Verify responder is available
--   6. Assign responder
--   7. Mark responder busy
--
-- This prevents concurrent dispatch races.
--
-- ============================================================

DROP FUNCTION IF EXISTS public.dispatch_incident(
  uuid,
  uuid
);


CREATE OR REPLACE FUNCTION public.dispatch_incident(
  target_incident_id uuid,
  target_responder_id uuid
)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_incident public.incidents;
  target_responder public.profiles;
BEGIN

  -- ==========================================================
  -- ADMIN AUTHORIZATION
  -- ==========================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'admin'
  ) THEN

    RAISE EXCEPTION
      'Only administrators can dispatch responders';

  END IF;


  -- ==========================================================
  -- LOCK INCIDENT
  -- ==========================================================

  SELECT *
  INTO target_incident
  FROM public.incidents
  WHERE id = target_incident_id
  FOR UPDATE;


  IF target_incident.id IS NULL THEN

    RAISE EXCEPTION
      'Incident not found';

  END IF;


  -- ==========================================================
  -- INCIDENT MUST BE PENDING
  -- ==========================================================

  IF target_incident.status::text <> 'pending' THEN

    RAISE EXCEPTION
      'Incident is no longer pending';

  END IF;


  IF target_incident.responder_id IS NOT NULL THEN

    RAISE EXCEPTION
      'Incident already has a responder';

  END IF;


  -- ==========================================================
  -- LOCK RESPONDER
  -- ==========================================================

  SELECT *
  INTO target_responder
  FROM public.profiles
  WHERE id = target_responder_id
    AND role::text = 'responder'
  FOR UPDATE;


  IF target_responder.id IS NULL THEN

    RAISE EXCEPTION
      'Responder not found';

  END IF;


  -- ==========================================================
  -- RESPONDER MUST BE AVAILABLE
  -- ==========================================================

  IF target_responder.availability <> 'available' THEN

    RAISE EXCEPTION
      'Responder is not available';

  END IF;


  -- ==========================================================
  -- ASSIGN INCIDENT
  -- ==========================================================

  UPDATE public.incidents
  SET
    responder_id = target_responder_id,
    assigned_at = COALESCE(
      assigned_at,
      now()
    )
  WHERE id = target_incident_id;


  -- ==========================================================
  -- MARK RESPONDER BUSY
  -- ==========================================================

  UPDATE public.profiles
  SET availability = 'busy'
  WHERE id = target_responder_id;


  -- ==========================================================
  -- RETURN UPDATED INCIDENT
  -- ==========================================================

  SELECT *
  INTO target_incident
  FROM public.incidents
  WHERE id = target_incident_id;


  RETURN target_incident;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.dispatch_incident(
  uuid,
  uuid
)
TO authenticated;


-- ============================================================
-- 5. INCIDENT STATUS STATE MACHINE
-- ============================================================
--
-- pending  -> accepted
-- accepted -> arrived
-- arrived  -> resolved
--
-- Only the assigned responder can perform these transitions.
--
-- ============================================================

DROP FUNCTION IF EXISTS public.update_incident_status(
  uuid,
  incident_status
);


CREATE OR REPLACE FUNCTION public.update_incident_status(
  incident_id uuid,
  new_status incident_status
)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_incident public.incidents;
  updated_incident public.incidents;
BEGIN

  -- ==========================================================
  -- LOAD INCIDENT
  -- ==========================================================

  SELECT *
  INTO current_incident
  FROM public.incidents
  WHERE id = incident_id
  FOR UPDATE;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Incident not found';

  END IF;


  -- ==========================================================
  -- VERIFY ASSIGNED RESPONDER
  -- ==========================================================

  IF current_incident.responder_id <> auth.uid() THEN

    RAISE EXCEPTION
      'You are not assigned to this incident';

  END IF;


  -- ==========================================================
  -- PENDING -> ACCEPTED
  -- ==========================================================

  IF new_status::text = 'accepted' THEN

    IF current_incident.status::text <> 'pending' THEN

      RAISE EXCEPTION
        'Incident must be pending before acceptance';

    END IF;


    UPDATE public.incidents
    SET
      status = 'accepted',
      accepted_at = COALESCE(
        accepted_at,
        now()
      )
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;


    RETURN updated_incident;

  END IF;


  -- ==========================================================
  -- ACCEPTED -> ARRIVED
  -- ==========================================================

  IF new_status::text = 'arrived' THEN

    IF current_incident.status::text <> 'accepted' THEN

      RAISE EXCEPTION
        'Incident must be accepted before arrival';

    END IF;


    UPDATE public.incidents
    SET
      status = 'arrived',
      arrived_at = COALESCE(
        arrived_at,
        now()
      )
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;


    RETURN updated_incident;

  END IF;


  -- ==========================================================
  -- ARRIVED -> RESOLVED
  -- ==========================================================

  IF new_status::text = 'resolved' THEN

    IF current_incident.status::text <> 'arrived' THEN

      RAISE EXCEPTION
        'Responder must arrive before resolving';

    END IF;


    UPDATE public.incidents
    SET
      status = 'resolved',
      resolved_at = COALESCE(
        resolved_at,
        now()
      )
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;


    -- Responder becomes available again.

    UPDATE public.profiles
    SET availability = 'available'
    WHERE id = auth.uid();


    RETURN updated_incident;

  END IF;


  RAISE EXCEPTION
    'Invalid incident status transition';

END;
$$;


GRANT EXECUTE
ON FUNCTION public.update_incident_status(
  uuid,
  incident_status
)
TO authenticated;


-- ============================================================
-- 6. RESOLVED INCIDENT ARCHIVAL
-- ============================================================

DROP TRIGGER IF EXISTS archive_resolved_incident
ON public.incidents;

DROP TRIGGER IF EXISTS incident_resolved_archive
ON public.incidents;

DROP TRIGGER IF EXISTS trigger_archive_resolved_incident
ON public.incidents;


CREATE OR REPLACE FUNCTION public.archive_resolved_incident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF NEW.status::text = 'resolved'
     AND OLD.status::text <> 'resolved'
  THEN

    INSERT INTO public.incident_archive (
      original_incident_id,
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
    VALUES (
      NEW.id,
      NEW.reported_by,
      NEW.responder_id,
      NEW.type,
      NEW.severity,
      NEW.latitude,
      NEW.longitude,
      NEW.status,
      NEW.created_at,
      NEW.assigned_at,
      NEW.accepted_at,
      NEW.arrived_at,
      NEW.resolved_at,
      now()
    )
    ON CONFLICT DO NOTHING;

  END IF;


  RETURN NEW;

END;
$$;


CREATE TRIGGER incident_resolved_archive
AFTER UPDATE ON public.incidents
FOR EACH ROW
WHEN (
  NEW.status = 'resolved'::incident_status
  AND OLD.status <> 'resolved'::incident_status
)
EXECUTE FUNCTION public.archive_resolved_incident();


GRANT EXECUTE
ON FUNCTION public.archive_resolved_incident()
TO authenticated;


-- ============================================================
-- 7. REALTIME RESPONDER OPERATIONS
-- ============================================================

DO $$
BEGIN

  BEGIN

    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.profiles;

  EXCEPTION
    WHEN duplicate_object THEN
      NULL;

  END;

END;
$$;


-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.dispatch_incident(
  uuid,
  uuid
)
IS
'Secure admin-only atomic incident dispatch with responder availability locking';


COMMENT ON FUNCTION public.update_incident_status(
  uuid,
  incident_status
)
IS
'Secure responder-only incident state machine';


COMMENT ON FUNCTION public.update_responder_location(
  double precision,
  double precision
)
IS
'Secure responder GPS update';


COMMENT ON FUNCTION public.update_responder_availability(
  text
)
IS
'Secure responder availability update';