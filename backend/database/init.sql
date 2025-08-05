-- Включаем расширение PostGIS для геопространственных данных
CREATE EXTENSION IF NOT EXISTS postgis;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица команд
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#FF0000', -- HEX цвет команды
    logo_url VARCHAR(255),
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица участников команд
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Таблица территорий (с геопространственными данными)
CREATE TABLE territories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- Полигон территории (геометрия)
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    -- Центральная точка территории
    center_point GEOMETRY(POINT, 4326) NOT NULL,
    -- Площадь в квадратных метрах
    area_sqm FLOAT,
    difficulty_level INTEGER DEFAULT 1, -- 1-5, сложность захвата
    points_value INTEGER DEFAULT 100, -- очки за захват
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица захватов территорий
CREATE TABLE territory_captures (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    captured_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lost_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    capture_method VARCHAR(50) DEFAULT 'presence', -- 'presence', 'challenge', 'event'
    points_earned INTEGER DEFAULT 0
);

-- Таблица позиций пользователей (для real-time отслеживания)
CREATE TABLE user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    accuracy FLOAT, -- точность в метрах
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблица партнерских заведений
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    business_type VARCHAR(50), -- 'restaurant', 'cafe', 'shop', etc.
    location GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    discount_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Связь заведений с территориями
CREATE TABLE business_territories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    UNIQUE(business_id, territory_id)
);

-- Индексы для оптимизации геопространственных запросов
CREATE INDEX idx_territories_boundary ON territories USING GIST (boundary);
CREATE INDEX idx_territories_center ON territories USING GIST (center_point);
CREATE INDEX idx_user_locations_location ON user_locations USING GIST (location);
CREATE INDEX idx_user_locations_timestamp ON user_locations (timestamp);
CREATE INDEX idx_businesses_location ON businesses USING GIST (location);

-- Индексы для обычных запросов
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_team_members_team_id ON team_members (team_id);
CREATE INDEX idx_team_members_user_id ON team_members (user_id);
CREATE INDEX idx_territory_captures_territory_id ON territory_captures (territory_id);
CREATE INDEX idx_territory_captures_team_id ON territory_captures (team_id);
CREATE INDEX idx_territory_captures_active ON territory_captures (is_active);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
