-- Migration: Create RBAC tables (Role-Based Access Control)
-- Creates facilities, user_roles tables with comprehensive RLS policies
-- Supports 5 roles: super_admin, facility_admin, host, player, viewer

-- ============================================================================
-- Table: facilities
-- ============================================================================
-- Represents physical facilities/groups and communities in the platform
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Lifecycle
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT facilities_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT facilities_email_format CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR contact_email IS NULL)
);

-- Add table comment
COMMENT ON TABLE public.facilities IS 'Communities and groups that use the Joolie Boolie';
COMMENT ON COLUMN public.facilities.is_active IS 'Soft delete flag - inactive facilities are hidden but not deleted';

-- Indexes
CREATE INDEX facilities_name_idx ON public.facilities(name);
CREATE INDEX facilities_is_active_idx ON public.facilities(is_active);
CREATE INDEX facilities_created_at_idx ON public.facilities(created_at);

-- ============================================================================
-- Table: user_roles
-- ============================================================================
-- Assigns roles to users, optionally scoped to a specific facility
-- Multiple roles per user are supported (e.g., host in one facility, admin in another)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and role assignment
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'facility_admin', 'host', 'player', 'viewer')),

  -- Optional facility scope (NULL = global role like super_admin)
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,

  -- Assignment tracking
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Optional expiration (e.g., temporary host access)
  expires_at TIMESTAMPTZ,

  -- Lifecycle
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT user_roles_unique_assignment UNIQUE(user_id, role, facility_id),
  CONSTRAINT user_roles_expiry_check CHECK (expires_at IS NULL OR expires_at > assigned_at),
  CONSTRAINT user_roles_facility_scope_check CHECK (
    -- super_admin must be global (no facility)
    (role = 'super_admin' AND facility_id IS NULL) OR
    -- all other roles must be facility-scoped
    (role != 'super_admin' AND facility_id IS NOT NULL)
  )
);

-- Add table comments
COMMENT ON TABLE public.user_roles IS 'Role-based access control assignments for users';
COMMENT ON COLUMN public.user_roles.role IS 'One of: super_admin (global), facility_admin, host, player, viewer';
COMMENT ON COLUMN public.user_roles.facility_id IS 'NULL for super_admin (global), required for all other roles';
COMMENT ON COLUMN public.user_roles.expires_at IS 'Optional expiration date for temporary role assignments';
COMMENT ON COLUMN public.user_roles.is_active IS 'Soft delete flag - inactive roles are revoked but retained for audit';

-- Indexes for common queries
CREATE INDEX user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX user_roles_role_idx ON public.user_roles(role);
CREATE INDEX user_roles_facility_id_idx ON public.user_roles(facility_id);
CREATE INDEX user_roles_is_active_idx ON public.user_roles(is_active);
CREATE INDEX user_roles_expires_at_idx ON public.user_roles(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX user_roles_assigned_by_idx ON public.user_roles(assigned_by);

-- Composite index for role checks (expiry filtered at query time, not in index)
CREATE INDEX user_roles_active_lookup_idx ON public.user_roles(user_id, role, facility_id)
  WHERE is_active = true;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Check if user has a specific role (optionally within a facility)
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_role TEXT,
  p_facility_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = p_role
      AND (facility_id = p_facility_id OR (p_facility_id IS NULL AND facility_id IS NULL))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_role IS 'Check if a user has an active, non-expired role assignment';

-- Check if user is super_admin (global access)
CREATE OR REPLACE FUNCTION public.user_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.user_has_role(p_user_id, 'super_admin', NULL);
END;
$$;

COMMENT ON FUNCTION public.user_is_super_admin IS 'Check if user has super_admin role (global access)';

-- Get all active roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE (
  role TEXT,
  facility_id UUID,
  facility_name TEXT,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.role,
    ur.facility_id,
    f.name AS facility_name,
    ur.assigned_at,
    ur.expires_at
  FROM public.user_roles ur
  LEFT JOIN public.facilities f ON f.id = ur.facility_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY
    -- super_admin first, then by facility name
    CASE ur.role
      WHEN 'super_admin' THEN 0
      WHEN 'facility_admin' THEN 1
      WHEN 'host' THEN 2
      WHEN 'player' THEN 3
      WHEN 'viewer' THEN 4
    END,
    f.name;
END;
$$;

COMMENT ON FUNCTION public.get_user_roles IS 'Get all active, non-expired roles for a user with facility details';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- facilities: RLS Policies
-- ----------------------------------------------------------------------------

-- Anyone authenticated can view active facilities
CREATE POLICY "Authenticated users can view active facilities"
  ON public.facilities
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Super admins can view all facilities (including inactive)
CREATE POLICY "Super admins can view all facilities"
  ON public.facilities
  FOR SELECT
  USING (public.user_is_super_admin(auth.uid()));

-- Super admins can insert facilities
CREATE POLICY "Super admins can create facilities"
  ON public.facilities
  FOR INSERT
  WITH CHECK (public.user_is_super_admin(auth.uid()));

-- Super admins can update any facility
CREATE POLICY "Super admins can update facilities"
  ON public.facilities
  FOR UPDATE
  USING (public.user_is_super_admin(auth.uid()))
  WITH CHECK (public.user_is_super_admin(auth.uid()));

-- Facility admins can update their own facility
CREATE POLICY "Facility admins can update their facility"
  ON public.facilities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'facility_admin'
        AND facility_id = facilities.id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'facility_admin'
        AND facility_id = facilities.id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Super admins can soft delete (set is_active = false)
CREATE POLICY "Super admins can delete facilities"
  ON public.facilities
  FOR DELETE
  USING (public.user_is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- user_roles: RLS Policies
-- ----------------------------------------------------------------------------

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all role assignments
CREATE POLICY "Super admins can view all role assignments"
  ON public.user_roles
  FOR SELECT
  USING (public.user_is_super_admin(auth.uid()));

-- Facility admins can view role assignments in their facilities
CREATE POLICY "Facility admins can view roles in their facility"
  ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'facility_admin'
        AND ur.facility_id = user_roles.facility_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Super admins can assign any role
CREATE POLICY "Super admins can assign roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.user_is_super_admin(auth.uid()));

-- Facility admins can assign roles (except super_admin) in their facilities
CREATE POLICY "Facility admins can assign roles in their facility"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    role != 'super_admin' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'facility_admin'
        AND ur.facility_id = user_roles.facility_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Super admins can update any role assignment
CREATE POLICY "Super admins can update role assignments"
  ON public.user_roles
  FOR UPDATE
  USING (public.user_is_super_admin(auth.uid()))
  WITH CHECK (public.user_is_super_admin(auth.uid()));

-- Facility admins can update role assignments in their facilities
CREATE POLICY "Facility admins can update roles in their facility"
  ON public.user_roles
  FOR UPDATE
  USING (
    role != 'super_admin' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'facility_admin'
        AND ur.facility_id = user_roles.facility_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  )
  WITH CHECK (
    role != 'super_admin' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'facility_admin'
        AND ur.facility_id = user_roles.facility_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Super admins can delete role assignments
CREATE POLICY "Super admins can delete role assignments"
  ON public.user_roles
  FOR DELETE
  USING (public.user_is_super_admin(auth.uid()));

-- Facility admins can delete role assignments in their facilities
CREATE POLICY "Facility admins can delete roles in their facility"
  ON public.user_roles
  FOR DELETE
  USING (
    role != 'super_admin' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'facility_admin'
        AND ur.facility_id = user_roles.facility_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp on facilities table
CREATE OR REPLACE FUNCTION public.update_facilities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facilities_updated_at();

-- Update updated_at timestamp on user_roles table
CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_roles_updated_at();

-- ============================================================================
-- Seed Data (Development/Testing)
-- ============================================================================

-- Insert sample facilities
INSERT INTO public.facilities (id, name, address, contact_email, contact_phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sunny Acres Community Center', '123 Oak Lane, Springfield, IL 62701', 'contact@sunnyacres.example.com', '555-0101'),
  ('22222222-2222-2222-2222-222222222222', 'Golden Years Community Center', '456 Wisdom Way, Portland, OR 97201', 'info@goldenyears.example.com', '555-0102'),
  ('33333333-3333-3333-3333-333333333333', 'Serenity Gardens', '789 Peaceful Drive, Austin, TX 78701', 'hello@serenitygardens.example.com', '555-0103');

COMMENT ON COLUMN public.facilities.id IS 'Sample facilities use deterministic UUIDs for testing';

-- Note: Seed user_roles data should be added after users are created in auth.users
-- Example role assignments (to be inserted after user creation):
--
-- Super Admin (global access, no facility):
-- INSERT INTO public.user_roles (user_id, role, assigned_by) VALUES
--   ('<super-admin-user-id>', 'super_admin', '<super-admin-user-id>');
--
-- Facility Admin (manages Sunny Acres):
-- INSERT INTO public.user_roles (user_id, role, facility_id, assigned_by) VALUES
--   ('<facility-admin-user-id>', 'facility_admin', '11111111-1111-1111-1111-111111111111', '<super-admin-user-id>');
--
-- Host (runs games at Golden Years):
-- INSERT INTO public.user_roles (user_id, role, facility_id, assigned_by) VALUES
--   ('<host-user-id>', 'host', '22222222-2222-2222-2222-222222222222', '<facility-admin-user-id>');
--
-- Player (participates at Serenity Gardens):
-- INSERT INTO public.user_roles (user_id, role, facility_id, assigned_by) VALUES
--   ('<player-user-id>', 'player', '33333333-3333-3333-3333-333333333333', '<host-user-id>');
--
-- Viewer (read-only at Sunny Acres):
-- INSERT INTO public.user_roles (user_id, role, facility_id, assigned_by) VALUES
--   ('<viewer-user-id>', 'viewer', '11111111-1111-1111-1111-111111111111', '<facility-admin-user-id>');
