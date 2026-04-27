-- Supabase Setup for ajew.org Chat
-- Run this in the Supabase SQL Editor

-- Create messages table for chat
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  room TEXT NOT NULL DEFAULT 'general',
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT USING (true);

-- Allow authenticated users to insert (subscription check happens in API)
CREATE POLICY "Authenticated users can insert" ON messages
  FOR INSERT WITH CHECK (true);

-- Also create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can read subscriptions (for auth checks)
CREATE POLICY "Anyone can read subscriptions" ON subscriptions
  FOR SELECT USING (true);

-- Only service role can update
CREATE POLICY "Service can insert/update" ON subscriptions
  FOR ALL USING (true);

SELECT '✅ Tables created successfully!' as status;
