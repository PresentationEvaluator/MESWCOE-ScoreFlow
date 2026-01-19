-- =====================================================
-- Database Update Script
-- Rename Semester 7 to Semester 1 and Semester 8 to Semester 2
-- =====================================================
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
--
-- This will update all semester values from 7->1 and 8->2
-- =====================================================

-- Update semester values in presentations table
UPDATE presentations
SET semester = '1'
WHERE semester = '7';

UPDATE presentations
SET semester = '2'
WHERE semester = '8';

-- Update semester values if stored as numbers (without 'Semester' prefix)
UPDATE presentations
SET semester = '1'
WHERE semester = '7';

UPDATE presentations
SET semester = '2'
WHERE semester = '8';

-- =====================================================
-- Verification Queries
-- Run these to verify the update worked correctly
-- =====================================================

-- Check updated semester values
SELECT id, name, semester, academic_year
FROM presentations
ORDER BY name;