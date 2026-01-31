-- Add employee response fields to hr_shifts table
ALTER TABLE hr_shifts 
ADD COLUMN IF NOT EXISTS employee_response TEXT 
CHECK (employee_response IN ('pending', 'accepted', 'rejected'));

ALTER TABLE hr_shifts
ADD COLUMN IF NOT EXISTS employee_response_at TIMESTAMPTZ;

ALTER TABLE hr_shifts
ADD COLUMN IF NOT EXISTS employee_response_note TEXT;

-- Update existing shifts to have 'pending' as default
UPDATE hr_shifts 
SET employee_response = 'pending' 
WHERE employee_response IS NULL;