-- Add tracking paths table
CREATE TABLE capture_paths (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    path_line GEOMETRY(LINESTRING, 4326),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    path_points_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for spatial queries
CREATE INDEX capture_paths_spatial_idx ON capture_paths USING GIST (path_line);
