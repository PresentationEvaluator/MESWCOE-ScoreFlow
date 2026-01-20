-- =====================================================
-- Migration: Add Industry Name and Project Title Columns
-- =====================================================
-- 
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
--
-- This migration will add:
-- - industry_name column to store industry names for sponsored projects
-- - project_title column to store project titles
-- =====================================================

-- =====================================================
-- Add Industry Name and Project Title Columns to evaluations
-- =====================================================
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS project_title TEXT,
ADD COLUMN IF NOT EXISTS industry_name TEXT;

-- =====================================================
-- Verification Query
-- Run this to verify the columns were added successfully
-- =====================================================
-- SELECT column_name, data_typed 
-- FROM information_schema.columns 
-- WHERE table_name = 'evaluations' 
-- AND column_name IN ('project_title', 'industry_name', 'project_type_in_house_sponsored')
-- ORDER BY ordinal_position;
