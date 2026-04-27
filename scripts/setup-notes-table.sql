-- Run this SQL in Supabase SQL Editor to add user notes feature
-- Go to: https://supabase.com/dashboard/project/ekggvujbuusvgmrertgp/sql/new

CREATE TABLE IF NOT EXISTS user_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT DEFAULT '',
  book_id TEXT NOT NULL,
  segment_index INTEGER NOT NULL,
  page_url TEXT NOT NULL,
  note_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_page ON user_notes(user_id, page_url);
CREATE INDEX IF NOT EXISTS idx_user_notes_public ON user_notes(page_url, is_public) WHERE is_public = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notes_unique ON user_notes(user_id, page_url, segment_index);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notes
CREATE POLICY "Users manage own notes" ON user_notes
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read public notes
CREATE POLICY "Public can read public notes" ON user_notes
  FOR SELECT USING (is_public = true);

-- Auto-update timestamp
CREATE TRIGGER user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
