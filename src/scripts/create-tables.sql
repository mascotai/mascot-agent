-- Manual table creation script for Twitter Auth Plugin
-- This is a temporary workaround until the ElizaOS plugin schema migration is fixed
-- TODO: Remove this file once the plugin schema migration is working properly

-- Create enums first (PostgreSQL doesn't support IF NOT EXISTS for CREATE TYPE)
DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    'twitter',
    'discord',
    'telegram',
    'github',
    'google',
    'facebook',
    'linkedin',
    'instagram',
    'tiktok',
    'youtube',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE credential_status AS ENUM (
    'active',
    'inactive',
    'expired',
    'revoked',
    'pending'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE oauth_session_status AS ENUM (
    'pending',
    'authorized',
    'expired',
    'canceled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Create service credentials table
CREATE TABLE IF NOT EXISTS plugin_service_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  service_name service_type NOT NULL,
  status credential_status NOT NULL DEFAULT 'pending',
  credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Unique constraint for one active credential per agent/service
  CONSTRAINT plugin_service_credentials_agent_service_unique 
    UNIQUE (agent_id, service_name)
);

-- Create OAuth sessions table
CREATE TABLE IF NOT EXISTS plugin_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  service_name service_type NOT NULL,
  state TEXT NOT NULL,
  status oauth_session_status NOT NULL DEFAULT 'pending',
  code_verifier TEXT,
  return_url TEXT,
  authorization_code TEXT,
  error_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- Create indexes for performance
-- Service credentials indexes
CREATE INDEX IF NOT EXISTS plugin_service_credentials_agent_id_idx 
  ON plugin_service_credentials (agent_id);
CREATE INDEX IF NOT EXISTS plugin_service_credentials_service_name_idx 
  ON plugin_service_credentials (service_name);
CREATE INDEX IF NOT EXISTS plugin_service_credentials_status_idx 
  ON plugin_service_credentials (status);

-- OAuth sessions indexes
CREATE INDEX IF NOT EXISTS plugin_oauth_sessions_agent_id_idx 
  ON plugin_oauth_sessions (agent_id);
CREATE INDEX IF NOT EXISTS plugin_oauth_sessions_service_name_idx 
  ON plugin_oauth_sessions (service_name);
CREATE INDEX IF NOT EXISTS plugin_oauth_sessions_state_idx 
  ON plugin_oauth_sessions (state);
CREATE INDEX IF NOT EXISTS plugin_oauth_sessions_status_idx 
  ON plugin_oauth_sessions (status);
CREATE INDEX IF NOT EXISTS plugin_oauth_sessions_expires_at_idx 
  ON plugin_oauth_sessions (expires_at);

