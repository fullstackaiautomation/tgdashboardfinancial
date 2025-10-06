-- Create schedule_log table to store daily schedules
CREATE TABLE IF NOT EXISTS schedule_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- Ensure one schedule per user per day
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schedule_log_user_date
ON schedule_log(user_id, date DESC);

-- Enable RLS
ALTER TABLE schedule_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to manage their own schedules
CREATE POLICY "Users can manage their own schedule logs" ON schedule_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_log_updated_at
BEFORE UPDATE ON schedule_log
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();