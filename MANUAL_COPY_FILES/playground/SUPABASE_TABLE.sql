-- Supabase Table for Playground Leads
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads_contractnest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  industry VARCHAR(100) DEFAULT 'equipment_amc',
  persona VARCHAR(20) NOT NULL CHECK (persona IN ('seller', 'buyer')),
  completed_demo BOOLEAN DEFAULT FALSE,
  contract_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics and queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads_contractnest(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads_contractnest(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_persona ON leads_contractnest(persona);

-- Enable Row Level Security (optional - for public access from playground)
ALTER TABLE leads_contractnest ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts from anonymous users (playground is public)
CREATE POLICY "Allow anonymous inserts" ON leads_contractnest
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy to allow updates (for marking completed_demo)
CREATE POLICY "Allow anonymous updates" ON leads_contractnest
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_contractnest_updated_at
  BEFORE UPDATE ON leads_contractnest
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
