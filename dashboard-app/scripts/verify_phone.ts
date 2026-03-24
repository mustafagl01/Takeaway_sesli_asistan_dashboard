import { sql } from '@vercel/postgres';
// Run with: npx tsx --env-file=.env.local scripts/verify_phone.ts

async function run() {
  try {
    const { rows } = await sql`SELECT id, name, email, phone FROM users LIMIT 5;`;
    console.log('Users found:', rows);
  } catch (err) {
    console.error('Verification failed:', err);
  }
}

run();
