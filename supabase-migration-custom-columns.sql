-- Add custom_columns JSONB to presentations table to store user-defined column headers
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
