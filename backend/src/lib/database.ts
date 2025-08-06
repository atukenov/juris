import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database successfully!');

    // Test PostGIS extension
    const result = await client.query('SELECT PostGIS_Version();');
    console.log('✅ PostGIS version:', result.rows[0].postgis_version);

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log(
      '📋 Available tables:',
      tables.rows.map((r) => r.table_name)
    );

    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

export { pool };
