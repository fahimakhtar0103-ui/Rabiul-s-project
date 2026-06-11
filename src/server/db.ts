import { Pool } from 'pg';

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is missing. Please define it in environment variables to connect to Supabase Postgres.');
} else {
  // Clean up literal quotes
  connectionString = connectionString.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  // Extract user, password (which may contain @), and host
  const match = connectionString.match(/:\/\/(.*?):(.*)@([^@]+)$/);
  if (match) {
    const [_, user, rawPass, hostPart] = match;
    // Remove wrapping brackets if any
    const cleanPass = rawPass.replace(/^\[/, '').replace(/\]$/, '');
    const encodedPassword = encodeURIComponent(cleanPass);
    connectionString = `postgresql://${user}:${encodedPassword}@${hostPart}`;
  }
}

// Create a Postgres connection pool
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Always required for Supabase
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
