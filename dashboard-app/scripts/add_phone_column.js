const { pg } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('POSTGRES_URL not found');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: connectionString.replace('?sslmode=require', ''),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;');
    console.log('Column added');
    
    await client.query("UPDATE users SET phone = '+447878759886' WHERE email = 'mgldigitalmedia2024@gmail.com'");
    console.log('Paulton phone updated');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
