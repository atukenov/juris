CREATE TABLE user_levels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1,
    total_experience INTEGER DEFAULT 0,
    experience_to_next_level INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'territory', 'running', 'team', 'streak'
    requirement_type VARCHAR(50) NOT NULL, -- 'count', 'distance', 'consecutive_days'
    requirement_value INTEGER NOT NULL,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE user_rankings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    global_rank INTEGER,
    weekly_rank INTEGER,
    monthly_rank INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE team_rankings (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    global_rank INTEGER,
    weekly_rank INTEGER,
    monthly_rank INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly'
    category VARCHAR(50) NOT NULL, -- 'territory', 'distance', 'team'
    requirement_type VARCHAR(50) NOT NULL, -- 'capture_territories', 'run_distance', 'team_captures'
    requirement_value INTEGER NOT NULL,
    points_reward INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, challenge_id)
);

CREATE TABLE user_daily_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    territories_captured INTEGER DEFAULT 0,
    distance_run FLOAT DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_user_levels_user_id ON user_levels (user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements (user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements (achievement_id);
CREATE INDEX idx_user_rankings_total_points ON user_rankings (total_points DESC);
CREATE INDEX idx_team_rankings_total_points ON team_rankings (total_points DESC);
CREATE INDEX idx_challenges_active_dates ON challenges (is_active, start_date, end_date);
CREATE INDEX idx_user_challenges_user_id ON user_challenges (user_id);
CREATE INDEX idx_user_daily_activity_user_date ON user_daily_activity (user_id, activity_date);

INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
('First Capture', 'Capture your first territory', 'flag', 'territory', 'count', 1, 50),
('Territory Hunter', 'Capture 10 territories', 'target', 'territory', 'count', 10, 200),
('Territory Master', 'Capture 50 territories', 'trophy', 'territory', 'count', 50, 500),
('Marathon Runner', 'Run a total of 42.2 km', 'fitness', 'running', 'distance', 42200, 300),
('Daily Warrior', 'Capture territories for 7 consecutive days', 'calendar', 'streak', 'consecutive_days', 7, 250),
('Team Player', 'Help your team capture 25 territories', 'people', 'team', 'count', 25, 400),
('Speed Demon', 'Capture 5 territories in one day', 'flash', 'territory', 'daily_count', 5, 150),
('Distance Champion', 'Run 100 km total', 'medal', 'running', 'distance', 100000, 600);
