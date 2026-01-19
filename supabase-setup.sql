-- =====================================================
-- Project Evaluation Management System - Database Setup
-- =====================================================
-- 
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute
--
-- This will create all necessary tables, indexes, and constraints
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: presentations
-- Stores presentation/evaluation sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  semester VARCHAR(50),
  academic_year VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_presentations_name ON presentations(name);

-- =====================================================
-- Table: groups
-- Stores project groups for each presentation
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL,
  guide_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_per_presentation UNIQUE(presentation_id, group_number)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_presentation ON groups(presentation_id);
CREATE INDEX IF NOT EXISTS idx_groups_number ON groups(group_number);

-- =====================================================
-- Table: students
-- Stores students in each group (exactly 4 per group)
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_name VARCHAR(200) NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_position_per_group UNIQUE(group_id, position)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);

-- =====================================================
-- Table: evaluations
-- Stores evaluation marks for each student
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Internal Presentation I Components (5 fields, 10 marks each)
  problem_identification DECIMAL(5,2) DEFAULT 0 CHECK (problem_identification >= 0 AND problem_identification <= 10),
  literature_survey DECIMAL(5,2) DEFAULT 0 CHECK (literature_survey >= 0 AND literature_survey <= 10),
  software_engineering DECIMAL(5,2) DEFAULT 0 CHECK (software_engineering >= 0 AND software_engineering <= 10),
  requirement_analysis DECIMAL(5,2) DEFAULT 0 CHECK (requirement_analysis >= 0 AND requirement_analysis <= 10),
  srs DECIMAL(5,2) DEFAULT 0 CHECK (srs >= 0 AND srs <= 10),
  
  -- Additional Components
  individual_capacity DECIMAL(5,2) DEFAULT 0 CHECK (individual_capacity >= 0 AND individual_capacity <= 10),
  team_work DECIMAL(5,2) DEFAULT 0 CHECK (team_work >= 0 AND team_work <= 10),
  presentation_qa DECIMAL(5,2) DEFAULT 0 CHECK (presentation_qa >= 0 AND presentation_qa <= 10),
  paper_presentation DECIMAL(5,2) DEFAULT 0 CHECK (paper_presentation >= 0 AND paper_presentation <= 20),
  
  -- Internal Presentation II (standalone field)
  internal_presentation_ii DECIMAL(5,2) DEFAULT 0 CHECK (internal_presentation_ii >= 0 AND internal_presentation_ii <= 50),

  -- Internal Presentation III Components (Pres 3)
  identification_module DECIMAL(5,2) DEFAULT 0 CHECK (identification_module >= 0 AND identification_module <= 10),
  coding DECIMAL(5,2) DEFAULT 0 CHECK (coding >= 0 AND coding <= 10),
  understanding DECIMAL(5,2) DEFAULT 0 CHECK (understanding >= 0 AND understanding <= 10),
  -- Note: team_work and presentation_qa are reused from above

  -- Internal Presentation IV Components (Pres 4)
  testing DECIMAL(5,2) DEFAULT 0 CHECK (testing >= 0 AND testing <= 10),
  participation_conference DECIMAL(5,2) DEFAULT 0 CHECK (participation_conference >= 0 AND participation_conference <= 10),
  publication DECIMAL(5,2) DEFAULT 0 CHECK (publication >= 0 AND publication <= 10),
  project_report DECIMAL(5,2) DEFAULT 0 CHECK (project_report >= 0 AND project_report <= 20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_evaluation_per_student UNIQUE(student_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evaluations_student ON evaluations(student_id);

-- =====================================================
-- Trigger: Update updated_at timestamp automatically
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_presentations_updated_at ON presentations;
CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evaluations_updated_at ON evaluations;
CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data (Optional - for testing)
-- Uncomment the lines below to insert sample data
-- =====================================================

-- INSERT INTO presentations (name, semester, academic_year) 
-- VALUES ('Presentation 1', 'Semester 7', '2025-26');

-- =====================================================
-- Verification Queries
-- Run these to verify the setup worked correctly
-- =====================================================

-- Check all tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('presentations', 'groups', 'students', 'evaluations');

-- Check row counts (should all be 0 initially)
-- SELECT 
--   (SELECT COUNT(*) FROM presentations) as presentations_count,
--   (SELECT COUNT(*) FROM groups) as groups_count,
--   (SELECT COUNT(*) FROM students) as students_count,
--   (SELECT COUNT(*) FROM evaluations) as evaluations_count;
