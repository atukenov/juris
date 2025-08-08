-- Team ownership transfer system
CREATE TABLE team_ownership_transfers (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    current_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    new_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX idx_team_ownership_transfers_new_owner ON team_ownership_transfers(new_owner_id, status);
CREATE INDEX idx_team_ownership_transfers_team ON team_ownership_transfers(team_id);
