import { sql } from '@vercel/postgres';
// Run with: npx tsx --env-file=.env.local scripts/add_phone.ts

async function run() {
  try {
    console.log('Running migration...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`;
    console.log('Column "phone" added successfully.');
    
    // Update Paulton test user
    await sql`
      UPDATE users 
      SET phone = '+447878759886' 
      WHERE email = 'mgldigitalmedia2024@gmail.com'
    `;
    console.log('Paulton phone number updated.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
