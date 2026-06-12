// ================================================================
// DELETE ALL BJPS AUTH USERS — Bala Ji Public School
// ================================================================
// Run: node delete_all_users.js
// ================================================================

const PROJECT_REF = 'jixhvwzjqtchwhimjket';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGh2d3pqcXRjaHdoaW1qa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE0NzcwMCwiZXhwIjoyMDk1NzIzNzAwfQ.zu7xdsnRsx4NtpCzFglCqU0v6YROfiO4YQraVdXslcs';

const BASE_URL = `https://${PROJECT_REF}.supabase.co`;

async function getAllBjpsUsers() {
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  const data = await res.json();
  const allUsers = data.users || [];

  // Only delete @bjps.com users — keeps admin@school.com safe
  const bjpsUsers = allUsers.filter(u => u.email.endsWith('@bjps.com') && u.email !== 'admin@bjps.com');

  console.log(`Total auth users: ${allUsers.length}`);
  console.log(`@bjps.com users to delete: ${bjpsUsers.length}`);
  bjpsUsers.forEach(u => console.log(` - ${u.email}`));

  return bjpsUsers;
}

async function deleteUser(userId, email) {
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (res.ok) {
    console.log(`✅ Deleted: ${email}`);
  } else {
    const err = await res.json();
    console.log(`❌ Failed: ${email}`, err);
  }
}

async function main() {
  if (SERVICE_ROLE_KEY === 'PASTE_YOUR_NEW_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Paste your service role key into the script first.');
    process.exit(1);
  }

  console.log('🔍 Fetching all @bjps.com users...\n');
  const users = await getAllBjpsUsers();

  if (users.length === 0) {
    console.log('✅ No users found.');
    return;
  }

  console.log(`\n🗑️  Deleting ${users.length} users...\n`);
  for (const user of users) {
    await deleteUser(user.id, user.email);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n✅ All done!');
}

main().catch(console.error);