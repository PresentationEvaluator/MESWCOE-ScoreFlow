-- Comprehensive update for evaluations table to include all Presentation 1 fields
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS project_title TEXT,
ADD COLUMN IF NOT EXISTS project_type_in_house_sponsored TEXT,
ADD COLUMN IF NOT EXISTS classification_product DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS classification_research DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS classification_application DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS classification_design DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_institute DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_self DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_industry DECIMAL(5,2) DEFAULT 0;
