-- =====================================================
-- Database Migration Script
-- Academic Year Management & Calculation Updates
-- =====================================================
-- 
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
--
-- This migration will:
-- - Create academic_years table
-- - Add academic_year_id to presentations table
-- - Migrate existing presentations to a default academic year
-- - Remove internal_presentation_ii from evaluations (now calculated)
-- =====================================================

-- =====================================================
-- Step 1: Create academic_years table
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_academic_year_name UNIQUE(name),
  CONSTRAINT valid_year_range CHECK (end_year > start_year)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_academic_years_start_year ON academic_years(start_year);

-- =====================================================
-- Step 2: Create default academic year for migration
-- =====================================================
INSERT INTO academic_years (name, start_year, end_year)
VALUES ('2023-24', 2023, 2024)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Step 3: Add academic_year_id to presentations table
-- =====================================================
-- Add the column (nullable first for migration)
ALTER TABLE presentations 
ADD COLUMN IF NOT EXISTS academic_year_id UUID;

-- Set all existing presentations to the default academic year
UPDATE presentations
SET academic_year_id = (SELECT id FROM academic_years WHERE name = '2023-24')
WHERE academic_year_id IS NULL;

-- Now make it NOT NULL and add foreign key constraint
ALTER TABLE presentations
ALTER COLUMN academic_year_id SET NOT NULL;

ALTER TABLE presentations
ADD CONSTRAINT fk_presentations_academic_year 
FOREIGN KEY (academic_year_id) 
REFERENCES academic_years(id) 
ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_presentations_academic_year ON presentations(academic_year_id);

-- =====================================================
-- Step 4: Remove internal_presentation_ii from evaluations
-- (This is now a calculated field)
-- =====================================================
ALTER TABLE evaluations
DROP COLUMN IF EXISTS internal_presentation_ii;

-- =====================================================
-- Step 5: Update triggers for academic_years table
-- =====================================================
DROP TRIGGER IF EXISTS update_academic_years_updated_at ON academic_years;
CREATE TRIGGER update_academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Step 6: Remove old academic_year text field from presentations
-- (We now use the foreign key relationship)
-- =====================================================
ALTER TABLE presentations
DROP COLUMN IF EXISTS academic_year;

-- =====================================================
-- Verification Queries
-- Run these to verify the migration worked correctly
-- =====================================================

-- Check academic_years table
-- SELECT * FROM academic_years;

-- Check presentations are linked to academic years
-- SELECT p.name, p.semester, ay.name as academic_year_name
-- FROM presentations p
-- JOIN academic_years ay ON p.academic_year_id = ay.id;

-- Check evaluations table no longer has internal_presentation_ii
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'evaluations';
