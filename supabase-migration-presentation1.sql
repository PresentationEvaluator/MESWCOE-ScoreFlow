-- =====================================================
-- Database Migration Script
-- Add Presentation 1 Specific Columns (Classification, Finance, Project Type)
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
-- - Add Classification of Project columns to evaluations table
-- - Add Scope of Finance columns to evaluations table
-- - Add Project Type column to evaluations table
-- =====================================================

-- =====================================================
-- Add Classification of Project Columns
-- These are the reddish-highlighted columns from the original Excel
-- =====================================================
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS classification_product DECIMAL(5,2) DEFAULT 0 CHECK (classification_product >= 0 AND classification_product <= 10),
ADD COLUMN IF NOT EXISTS classification_research DECIMAL(5,2) DEFAULT 0 CHECK (classification_research >= 0 AND classification_research <= 10),
ADD COLUMN IF NOT EXISTS classification_application DECIMAL(5,2) DEFAULT 0 CHECK (classification_application >= 0 AND classification_application <= 10),
ADD COLUMN IF NOT EXISTS classification_design DECIMAL(5,2) DEFAULT 0 CHECK (classification_design >= 0 AND classification_design <= 10);

-- =====================================================
-- Add Scope of Finance Columns
-- =====================================================
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS finance_institute DECIMAL(5,2) DEFAULT 0 CHECK (finance_institute >= 0 AND finance_institute <= 10),
ADD COLUMN IF NOT EXISTS finance_self DECIMAL(5,2) DEFAULT 0 CHECK (finance_self >= 0 AND finance_self <= 10),
ADD COLUMN IF NOT EXISTS finance_industry DECIMAL(5,2) DEFAULT 0 CHECK (finance_industry >= 0 AND finance_industry <= 10);

-- =====================================================
-- Add Project Type Column
-- =====================================================
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS project_type_in_house_sponsored VARCHAR(50);

-- =====================================================
-- Verification Queries
-- Run these to verify the migration worked correctly
-- =====================================================

-- Check evaluations table has the new columns
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'evaluations'
-- ORDER BY ordinal_position;
