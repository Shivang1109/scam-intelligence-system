-- Initialize Scam Intelligence Database Schema

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(255) PRIMARY KEY,
    state VARCHAR(50) NOT NULL,
    persona_id VARCHAR(255) NOT NULL,
    persona_name VARCHAR(255) NOT NULL,
    risk_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_state ON conversations(state);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_conversations_risk_score ON conversations(risk_score);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Entities table
CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    normalized_value TEXT,
    confidence DECIMAL(3,2) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_entities_conversation_id ON entities(conversation_id);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_timestamp ON entities(timestamp);

-- Scam signals table
CREATE TABLE IF NOT EXISTS scam_signals (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    evidence TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    message_id VARCHAR(255)
);

CREATE INDEX idx_scam_signals_conversation_id ON scam_signals(conversation_id);
CREATE INDEX idx_scam_signals_type ON scam_signals(type);
CREATE INDEX idx_scam_signals_timestamp ON scam_signals(timestamp);

-- Classifications table
CREATE TABLE IF NOT EXISTS classifications (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    types TEXT[] NOT NULL,
    confidence JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classifications_conversation_id ON classifications(conversation_id);

-- Intelligence reports table
CREATE TABLE IF NOT EXISTS intelligence_reports (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    report_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_conversation_id ON intelligence_reports(conversation_id);
CREATE INDEX idx_reports_created_at ON intelligence_reports(created_at);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    key_hash VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['read', 'write'],
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_client_id ON api_keys(client_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- Create default test API key (for development only)
-- Password: test-api-key-12345
-- Hash: SHA256 of the key
INSERT INTO api_keys (key_hash, client_id, name, permissions, rate_limit, is_active)
VALUES (
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'test-client-1',
    'Test Client',
    ARRAY['read', 'write'],
    1000,
    true
) ON CONFLICT (key_hash) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scam_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO scam_user;
