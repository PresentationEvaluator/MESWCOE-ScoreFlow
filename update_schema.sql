-- Add columns for Semester 2 (Presentation 3 & 4) to the evaluations table

-- Presentation 3 Fields
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS identification_module DECIMAL(5,2) DEFAULT 0 CHECK (identification_module >= 0 AND identification_module <= 10),
ADD COLUMN IF NOT EXISTS coding DECIMAL(5,2) DEFAULT 0 CHECK (coding >= 0 AND coding <= 10),
ADD COLUMN IF NOT EXISTS understanding DECIMAL(5,2) DEFAULT 0 CHECK (understanding >= 0 AND understanding <= 10);

-- Note: 'team_work' and 'presentation_qa' already exist and are used for Pres 3 as well.

-- Presentation 4 Fields
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS testing DECIMAL(5,2) DEFAULT 0 CHECK (testing >= 0 AND testing <= 10),
ADD COLUMN IF NOT EXISTS participation_conference DECIMAL(5,2) DEFAULT 0 CHECK (participation_conference >= 0 AND participation_conference <= 10),
ADD COLUMN IF NOT EXISTS publication DECIMAL(5,2) DEFAULT 0 CHECK (publication >= 0 AND publication <= 10),
ADD COLUMN IF NOT EXISTS project_report DECIMAL(5,2) DEFAULT 0 CHECK (project_report >= 0 AND project_report <= 20);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evaluations';
