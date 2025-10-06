-- Content Library Table
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL,
  duration_minutes INTEGER,
  area TEXT,
  tags TEXT[],
  notes TEXT,
  key_takeaways TEXT[],
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  saved_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_area ON content_library(area);
CREATE INDEX IF NOT EXISTS idx_content_library_completed ON content_library(completed);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON content_library(created_at DESC);

ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content"
  ON content_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content"
  ON content_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content"
  ON content_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content"
  ON content_library FOR DELETE
  USING (auth.uid() = user_id);
