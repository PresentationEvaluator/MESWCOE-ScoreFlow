-- Add project_title column to evaluations table
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS project_title TEXT;
