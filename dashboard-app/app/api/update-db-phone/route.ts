import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Add phone column to users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`;
    
    // Update Paulton's phone number as a test (if exists)
    // Assuming Paulton's email is mgldigitalmedia2024@gmail.com based on previous context
    await sql`
      UPDATE users 
      SET phone = '+447878759886' 
      WHERE email = 'mgldigitalmedia2024@gmail.com'
    `;

    return NextResponse.json({ success: true, message: 'Phone column added and Paulton phone updated' });
  } catch (error: any) {
    console.error('Database update failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
