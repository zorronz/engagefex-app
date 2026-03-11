
-- Step 1: Add super_admin enum value (must be committed first)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
