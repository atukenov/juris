-- Energy system
CREATE TABLE user_energy (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    energy_points INTEGER DEFAULT 100,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Territory strength/fortification
ALTER TABLE territory_captures
ADD COLUMN fortification_level INTEGER DEFAULT 1,
ADD COLUMN last_fortification_time TIMESTAMP WITH TIME ZONE;

-- Weather conditions tracking
CREATE TABLE weather_conditions (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    temperature FLOAT,
    weather_condition VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Path speed tracking
CREATE TABLE path_segments (
    id SERIAL PRIMARY KEY,
    capture_path_id INTEGER REFERENCES capture_paths(id) ON DELETE CASCADE,
    segment_line GEOMETRY(LINESTRING, 4326),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    distance_meters FLOAT,
    speed_kmh FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Anti-cheat tracking
CREATE TABLE location_validations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    capture_path_id INTEGER REFERENCES capture_paths(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326),
    accuracy FLOAT,
    speed FLOAT,
    altitude FLOAT,
    heading FLOAT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
