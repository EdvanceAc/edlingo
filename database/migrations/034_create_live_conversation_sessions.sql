-- Create table for tracking live conversation sessions
CREATE TABLE IF NOT EXISTS live_conversation_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id text NOT NULL UNIQUE,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    duration_seconds integer,
    messages_exchanged integer DEFAULT 0,
    words_spoken integer DEFAULT 0,
    language text DEFAULT 'English',
    user_level text DEFAULT 'intermediate',
    focus_area text DEFAULT 'conversation',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_conversation_user_id ON live_conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_conversation_session_id ON live_conversation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_live_conversation_is_active ON live_conversation_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_live_conversation_started_at ON live_conversation_sessions(started_at);

-- Create table for storing conversation messages (optional, for history)
CREATE TABLE IF NOT EXISTS live_conversation_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id text REFERENCES live_conversation_sessions(session_id) ON DELETE CASCADE,
    message_type text CHECK (message_type IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    transcript text, -- For voice messages, store the transcript
    audio_url text, -- Optional: store audio recordings
    created_at timestamp with time zone DEFAULT now()
);

-- Create index for message queries
CREATE INDEX IF NOT EXISTS idx_live_messages_session_id ON live_conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_live_messages_created_at ON live_conversation_messages(created_at);

-- Enable RLS
ALTER TABLE live_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_conversation_sessions
-- Users can only see their own sessions
CREATE POLICY "Users can view own live sessions" ON live_conversation_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create own live sessions" ON live_conversation_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own live sessions" ON live_conversation_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for live_conversation_messages
-- Users can view messages from their sessions
CREATE POLICY "Users can view own session messages" ON live_conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_conversation_sessions 
            WHERE live_conversation_sessions.session_id = live_conversation_messages.session_id
            AND live_conversation_sessions.user_id = auth.uid()
        )
    );

-- Users can insert messages to their sessions
CREATE POLICY "Users can insert messages to own sessions" ON live_conversation_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM live_conversation_sessions 
            WHERE live_conversation_sessions.session_id = live_conversation_messages.session_id
            AND live_conversation_sessions.user_id = auth.uid()
        )
    );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_live_sessions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON live_conversation_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_live_sessions();

-- Create function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to calculate duration
CREATE TRIGGER calculate_live_session_duration
    BEFORE UPDATE ON live_conversation_sessions
    FOR EACH ROW EXECUTE PROCEDURE calculate_session_duration();

-- Add comments for documentation
COMMENT ON TABLE live_conversation_sessions IS 'Tracks live voice conversation sessions for language learning';
COMMENT ON TABLE live_conversation_messages IS 'Stores messages from live conversation sessions';
COMMENT ON COLUMN live_conversation_sessions.session_id IS 'Unique identifier for the conversation session';
COMMENT ON COLUMN live_conversation_sessions.duration_seconds IS 'Total duration of the session in seconds';
COMMENT ON COLUMN live_conversation_sessions.messages_exchanged IS 'Number of messages exchanged during the session';
COMMENT ON COLUMN live_conversation_sessions.words_spoken IS 'Total words spoken/typed during the session';
COMMENT ON COLUMN live_conversation_messages.transcript IS 'Text transcript for voice messages';
COMMENT ON COLUMN live_conversation_messages.audio_url IS 'Optional URL to stored audio recording';
