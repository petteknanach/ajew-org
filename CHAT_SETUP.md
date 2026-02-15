# Chat Setup - Supabase

To enable the chat functionality, create a table in Supabase:

## Option 1: SQL (in Supabase Dashboard → SQL Editor)

```sql
-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room text DEFAULT 'general',
  user_id text,
  user_name text,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (optional - for now we'll keep it open for testing)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow public inserts and selects (for testing)
CREATE POLICY "Allow public read" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON chat_messages FOR INSERT WITH CHECK (true);
```

## Option 2: Table Editor

In Supabase Dashboard:
1. Go to **Table Editor**
2. Click **New Table** → name it `chat_messages`
3. Add columns:
   - `id` (uuid, default: gen_random_uuid())
   - `room` (text, default: 'general')
   - `user_id` (text)
   - `user_name` (text)
   - `message` (text)
   - `created_at` (timestamptz, default: now())
4. Click **Save**

Once the table is created, the chat will work automatically!
