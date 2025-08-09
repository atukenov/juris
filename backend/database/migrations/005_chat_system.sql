CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (LENGTH(message) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_read_status (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE TABLE chat_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE chat_typing (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_chat_messages_team_id ON chat_messages(team_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX idx_chat_typing_team_id ON chat_typing(team_id);
CREATE INDEX idx_chat_read_status_team_user ON chat_read_status(team_id, user_id);
CREATE INDEX idx_chat_read_status_message_id ON chat_read_status(last_read_message_id);

CREATE OR REPLACE FUNCTION cleanup_old_typing()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_typing WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;
