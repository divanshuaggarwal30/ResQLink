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
    new.id,
    COALESCE(
      NULLIF(
        new.raw_user_meta_data ->> 'full_name',
        ''
      ),
      'ResQLink User'
    ),
    'civilian'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS
resqlink_on_auth_user_created
ON auth.users;

CREATE TRIGGER
resqlink_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION
public.handle_resqlink_new_user();

DROP FUNCTION IF EXISTS
public.update_responder_availability(text);

CREATE OR REPLACE FUNCTION
public.update_responder_availability(
  new_availability text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_availability NOT IN (
    'available',
    'busy',
    'offline'
  ) THEN
    RAISE EXCEPTION
      'Invalid availability: %',
      new_availability;
  END IF;

  UPDATE public.profiles
  SET availability = new_availability
  WHERE id = auth.uid()
  AND role::text = 'responder';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Responder profile not found or unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE
ON FUNCTION
public.update_responder_availability(text)
TO authenticated;

DROP FUNCTION IF EXISTS
public.update_responder_location(
  double precision,
  double precision
);

CREATE OR REPLACE FUNCTION
public.update_responder_location(
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role::text = 'responder'
  ) THEN
    RAISE EXCEPTION
      'Only responders can update responder location';
  END IF;

  IF responder_latitude IS NULL
  OR responder_longitude IS NULL
  OR responder_latitude < -90
  OR responder_latitude > 90
  OR responder_longitude < -180
  OR responder_longitude > 180 THEN
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

DROP FUNCTION IF EXISTS
public.dispatch_incident(
  uuid,
  uuid
);

CREATE OR REPLACE FUNCTION
public.dispatch_incident(
  target_incident_id uuid,
  target_responder_id uuid
)
RETURNS public.incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_incident public.incidents;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION
      'Only admins can dispatch incidents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = target_responder_id
    AND role::text = 'responder'
  ) THEN
    RAISE EXCEPTION
      'Invalid responder';
  END IF;

  UPDATE public.incidents
  SET
    responder_id = target_responder_id,
    status = 'pending',
    assigned_at = now()
  WHERE id = target_incident_id
  AND status = 'pending'
  RETURNING *
  INTO updated_incident;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Incident not found or cannot be dispatched';
  END IF;

  RETURN updated_incident;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.dispatch_incident(
  uuid,
  uuid
)
TO authenticated;

DROP FUNCTION IF EXISTS
public.update_incident_status(
  uuid,
  incident_status
);

CREATE OR REPLACE FUNCTION
public.update_incident_status(
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
  SELECT *
  INTO current_incident
  FROM public.incidents
  WHERE id = incident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Incident not found';
  END IF;

  IF new_status = 'accepted' THEN

    IF current_incident.status <> 'pending' THEN
      RAISE EXCEPTION
        'Incident must be pending before acceptance. Current status: %',
        current_incident.status;
    END IF;

    IF current_incident.responder_id <> auth.uid() THEN
      RAISE EXCEPTION
        'You are not assigned to this incident';
    END IF;

    UPDATE public.incidents
    SET
      status = 'accepted',
      accepted_at = now()
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;

    RETURN updated_incident;
  END IF;

  IF new_status = 'arrived' THEN

    IF current_incident.status <> 'accepted' THEN
      RAISE EXCEPTION
        'Incident must be accepted before arrival. Current status: %',
        current_incident.status;
    END IF;

    IF current_incident.responder_id <> auth.uid() THEN
      RAISE EXCEPTION
        'You are not assigned to this incident';
    END IF;

    UPDATE public.incidents
    SET
      status = 'arrived',
      arrived_at = now()
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;

    RETURN updated_incident;
  END IF;

  IF new_status = 'resolved' THEN

    IF current_incident.status <> 'arrived' THEN
      RAISE EXCEPTION
        'Incident must be arrived before resolution. Current status: %',
        current_incident.status;
    END IF;

    IF current_incident.responder_id <> auth.uid() THEN
      RAISE EXCEPTION
        'You are not assigned to this incident';
    END IF;

    UPDATE public.incidents
    SET
      status = 'resolved',
      resolved_at = now()
    WHERE id = incident_id
    RETURNING *
    INTO updated_incident;

    RETURN updated_incident;
  END IF;

  RAISE EXCEPTION
    'Invalid incident status transition to: %',
    new_status;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.update_incident_status(
  uuid,
  incident_status
)
TO authenticated;

DROP TRIGGER IF EXISTS
archive_resolved_incident
ON public.incidents;

DROP TRIGGER IF EXISTS
incident_resolved_archive
ON public.incidents;

DROP TRIGGER IF EXISTS
trigger_archive_resolved_incident
ON public.incidents;

CREATE OR REPLACE FUNCTION
public.archive_resolved_incident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved'
  AND OLD.status <> 'resolved' THEN

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

CREATE TRIGGER
incident_resolved_archive
AFTER UPDATE ON public.incidents
FOR EACH ROW
WHEN (
  NEW.status = 'resolved'::incident_status
  AND OLD.status <> 'resolved'::incident_status
)
EXECUTE FUNCTION
public.archive_resolved_incident();

GRANT EXECUTE
ON FUNCTION
public.archive_resolved_incident()
TO authenticated;