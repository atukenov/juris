
INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$rOvHPH8.OHaAjXgU9Ufj4.1RqRtrtANjHdRa6QoMVGKKxQoKGNjKu', -- password: admin123
  'Admin',
  'User',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
    admin_user_id INTEGER;
    admin_team_id INTEGER;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    
    INSERT INTO teams (name, color, owner_id, created_at, updated_at, is_active)
    VALUES (
      'Admin Team',
      'orange',
      admin_user_id,
      NOW(),
      NOW(),
      true
    ) ON CONFLICT (name) DO NOTHING;
    
    SELECT id INTO admin_team_id FROM teams WHERE name = 'Admin Team';
    
    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (admin_team_id, admin_user_id, 'owner', NOW())
    ON CONFLICT (team_id, user_id) DO NOTHING;
    
    INSERT INTO territories (name, coordinates, captured_by_team_id, captured_at, created_at, updated_at) VALUES
    ('Atyrau Central Park', ST_GeomFromText('POLYGON((51.2089 47.1056, 51.2095 47.1056, 51.2095 47.1062, 51.2089 47.1062, 51.2089 47.1056))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau River Port', ST_GeomFromText('POLYGON((51.2045 47.1089, 51.2055 47.1089, 51.2055 47.1099, 51.2045 47.1099, 51.2045 47.1089))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau City Center', ST_GeomFromText('POLYGON((51.2078 47.1045, 51.2088 47.1045, 51.2088 47.1055, 51.2078 47.1055, 51.2078 47.1045))', 4326), admin_team_id, NOW(), NOW(), NOW()),
    ('Atyrau Stadium', ST_GeomFromText('POLYGON((51.2112 47.1034, 51.2122 47.1034, 51.2122 47.1044, 51.2112 47.1044, 51.2112 47.1034))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau University', ST_GeomFromText('POLYGON((51.2134 47.1067, 51.2144 47.1067, 51.2144 47.1077, 51.2134 47.1077, 51.2134 47.1067))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau Market Square', ST_GeomFromText('POLYGON((51.2067 47.1078, 51.2077 47.1078, 51.2077 47.1088, 51.2067 47.1088, 51.2067 47.1078))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau Bridge Area', ST_GeomFromText('POLYGON((51.2023 47.1123, 51.2033 47.1123, 51.2033 47.1133, 51.2023 47.1133, 51.2023 47.1123))', 4326), NULL, NULL, NOW(), NOW()),
    ('Atyrau Industrial Zone', ST_GeomFromText('POLYGON((51.1989 47.1156, 51.1999 47.1156, 51.1999 47.1166, 51.1989 47.1166, 51.1989 47.1156))', 4326), NULL, NULL, NOW(), NOW());
    
    INSERT INTO user_levels (user_id, level, experience_points, created_at, updated_at)
    VALUES (admin_user_id, 1, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_streaks (user_id, weekly_streak, monthly_streak, last_updated)
    VALUES (admin_user_id, 0, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_activities (user_id, activity_type, points_earned, created_at)
    VALUES (admin_user_id, 'territory_capture', 100, NOW());
    
    RAISE NOTICE 'Admin user, team, and territories seeded successfully';
END $$;
