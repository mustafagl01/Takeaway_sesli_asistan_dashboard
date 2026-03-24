import { sql } from '@vercel/postgres';
// Using native fetch

async function testAlert() {
  const email = 'mgldigitalmedia2024@gmail.com'; // Paulton Kebab House
  const message = 'Test alert from system - Minute balance low!';
  
  try {
    const { rows } = await sql`SELECT id, email, name, phone FROM users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];

    if (!user) {
      console.error('User not found');
      return;
    }

    console.log(`Sending test alert to ${user.name} (${user.phone})...`);

    const n8nWebhookUrl = 'https://nt3ys1ml.rpcd.host/webhook/usage-alert';
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        message,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log('✅ Success! n8n received the alert.');
    } else {
      console.error(`❌ Failed with status ${response.status}`);
      console.error('Response:', await response.text());
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

testAlert();
