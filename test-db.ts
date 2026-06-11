import { pool } from './src/server/db';

async function run() {
  console.log('Testing connection via pool...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_site (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255)
      );
    `);
    console.log('test_site table created or already exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_labour (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        "siteId" INTEGER REFERENCES test_site(id) ON DELETE CASCADE
      );
    `);
    console.log('test_labour table created or already exists.');

    await pool.query('INSERT INTO test_site (name, location) VALUES ($1, $2)', ['Test Site', 'Test Location']);
    console.log('Inserted dummy data into test_site.');

    const res = await pool.query('SELECT * FROM test_site');
    console.log('Data in test_site:', res.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error testing tables:', error);
    process.exit(1);
  }
}

run();
