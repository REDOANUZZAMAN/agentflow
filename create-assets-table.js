/**
 * Create the `assets` table in Supabase.
 * Run: node create-assets-table.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // needs service role to create tables
);

async function main() {
  console.log('Creating assets table...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
        execution_id TEXT,
        type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('photo', 'video', 'audio', 'other')),
        cloudinary_public_id TEXT,
        cloudinary_url TEXT NOT NULL,
        thumbnail_url TEXT,
        filename TEXT NOT NULL DEFAULT 'untitled',
        scene INTEGER,
        shot INTEGER,
        prompt TEXT,
        negative_prompt TEXT,
        model TEXT,
        cost NUMERIC(10, 4) DEFAULT 0,
        duration_seconds NUMERIC(10, 2),
        file_size BIGINT,
        width INTEGER,
        height INTEGER,
        tags TEXT[] DEFAULT '{}',
        starred BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'failed')),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      -- Enable RLS
      ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

      -- Users can only see their own assets
      CREATE POLICY IF NOT EXISTS "Users can view own assets"
        ON assets FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can insert own assets"
        ON assets FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can update own assets"
        ON assets FOR UPDATE
        USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "Users can delete own assets"
        ON assets FOR DELETE
        USING (auth.uid() = user_id);

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
      CREATE INDEX IF NOT EXISTS idx_assets_workflow_id ON assets(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_assets_execution_id ON assets(execution_id);
      CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
      CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
    `
  });

  if (error) {
    // The exec_sql RPC might not exist. Try direct SQL via the REST API
    console.log('RPC not available, trying alternative approach...');
    console.log('');
    console.log('Please run this SQL in your Supabase Dashboard → SQL Editor:');
    console.log('');
    console.log(`
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  execution_id TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  cloudinary_public_id TEXT,
  cloudinary_url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT NOT NULL DEFAULT 'untitled',
  scene INTEGER,
  shot INTEGER,
  prompt TEXT,
  negative_prompt TEXT,
  model TEXT,
  cost NUMERIC(10, 4) DEFAULT 0,
  duration_seconds NUMERIC(10, 2),
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  tags TEXT[] DEFAULT '{}',
  starred BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_workflow_id ON assets(workflow_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
    `);
    return;
  }

  console.log('✅ Assets table created successfully!');
}

main().catch(console.error);
