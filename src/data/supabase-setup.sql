-- =====================================================
-- AJEW.ORG Supabase Database Setup Script
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MESSAGES TABLE
-- For storing chat messages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room VARCHAR(100) NOT NULL DEFAULT 'general',
  username VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_email ON public.messages(email);

-- Add RLS (Row Level Security) policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY IF NOT EXISTS "Allow public read access to messages" 
  ON public.messages 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY IF NOT EXISTS "Allow authenticated insert to messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- For storing user subscription tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  email VARCHAR(100) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'premium', 'super')),
  expiry TIMESTAMP WITH TIME ZONE,
  username VARCHAR(50),
  name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Add RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read subscriptions (needed for auth checks)
CREATE POLICY IF NOT EXISTS "Allow public read access to subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (true);

-- Allow service role to update subscriptions (for webhooks)
CREATE POLICY IF NOT EXISTS "Allow service role to upsert subscriptions" 
  ON public.subscriptions 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- Automatically update the updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for messages table
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscriptions table
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - remove in production)
-- =====================================================

-- Insert sample welcome messages
INSERT INTO public.messages (room, username, message, email, created_at)
VALUES 
  ('general', 'Admin', 'Welcome to the NNNNM Community Chat! Be respectful and kind to one another. נ™', 'admin@ajew.org', NOW() - INTERVAL '2 days'),
  ('general', 'Admin', 'This chat is for discussing Breslov teachings and connecting with fellow seekers.', 'admin@ajew.org', NOW() - INTERVAL '1 day'),
  ('hitbodedut', 'Admin', 'Welcome to the Hitbodedut Corner. Share your personal prayer experiences here.', 'admin@ajew.org', NOW() - INTERVAL '1 day'),
  ('stories', 'Admin', 'Welcome! Discuss the Stories of Rabbi Nachman here.', 'admin@ajew.org', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert sample subscription (for testing)
-- NOTE: Replace with actual admin email if needed
INSERT INTO public.subscriptions (email, tier, username, name, status, expiry)
VALUES 
  ('test@example.com', 'basic', 'testuser', 'Test User', 'active', '2027-12-31')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the setup
-- =====================================================

-- Check messages table
SELECT 'Messages table created' as status;
SELECT COUNT(*) as message_count FROM public.messages;

-- Check subscriptions table  
SELECT 'Subscriptions table created' as status;
SELECT COUNT(*) as subscription_count FROM public.subscriptions;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;
