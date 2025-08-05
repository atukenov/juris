-- Real-time tracking tables
CREATE TABLE active_runners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    last_location GEOMETRY(POINT, 4326),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_capturing BOOLEAN DEFAULT false,
    current_capture_path_id INTEGER REFERENCES capture_paths(id),
    UNIQUE(user_id, session_id)
);

CREATE TABLE team_visibility (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    visible_to_team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    visibility_type VARCHAR(20) DEFAULT 'location', -- 'location', 'path', 'none'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, visible_to_team_id)
);

-- Indexes for real-time queries
CREATE INDEX active_runners_team_idx ON active_runners(team_id);
CREATE INDEX active_runners_location_idx ON active_runners USING GIST(last_location);
CREATE INDEX active_runners_session_idx ON active_runners(session_id);

-- Clean up old records automatically
CREATE OR REPLACE FUNCTION cleanup_inactive_runners()
RETURNS void AS $$
BEGIN
    DELETE FROM active_runners 
    WHERE last_seen_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;
