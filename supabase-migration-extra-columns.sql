-- Add extra_columns to presentations to define new dynamic columns
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS extra_columns JSONB DEFAULT '[]'::jsonb;

-- Add extra_marks to evaluations to store the values for these dynamic columns
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS extra_marks JSONB DEFAULT '{}'::jsonb;
