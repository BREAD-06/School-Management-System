// ================================================================
// BULK STUDENT IMPORT — Bala Ji Public School
// ================================================================
// Reads all 9 class CSVs and imports every student into Supabase:
//   1. Creates Supabase Auth user
//   2. Inserts student record
//   3. Creates student_enrollment for active session
//
// Run: node import_all_students.js
// ================================================================

const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'jixhvwzjqtchwhimjket';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGh2d3pqcXRjaHdoaW1qa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE0NzcwMCwiZXhwIjoyMDk1NzIzNzAwfQ.zu7xdsnRsx4NtpCzFglCqU0v6YROfiO4YQraVdXslcs';

const BASE_URL = `https://${PROJECT_REF}.supabase.co`;

// ── Put all 9 CSV files in the same folder as this script ────────
const CSV_FILES = [
  'class_1_import.csv',
  'class_2_import.csv',
  'class_3_import.csv',
  'class_4_import.csv',
  'class_5_import.csv',
  'class_6_import.csv',
  'class_7_import.csv',
  'class_8_import.csv',
  'class_9_import.csv',
];

// ── Helpers ──────────────────────────────────────────────────────

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

async function supabaseGet(path) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  return res.json();
}

async function supabasePost(path, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function createAuthUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // skip email verification
    }),
  });
  return res.json();
}

// Generate next admission number (BJPS-XXXX)
function generateAdmissionNo(index) {
  return `BJPS-${String(index).padStart(4, '0')}`;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (SERVICE_ROLE_KEY === 'PASTE_YOUR_NEW_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Paste your service role key into the script first.');
    process.exit(1);
  }

  console.log('🏫 Bala Ji Public School — Bulk Student Import\n');

  // 1. Fetch classes map
  console.log('📋 Fetching classes...');
  const classes = await supabaseGet('classes?select=id,class_name');
  if (!classes.length) {
    console.error('❌ No classes found in DB. Make sure the classes table is populated.');
    process.exit(1);
  }
  const classMap = {};
  classes.forEach(c => { classMap[c.class_name] = c.id; });
  console.log(`   Found: ${classes.map(c => c.class_name).join(', ')}\n`);

  // 2. Fetch active session
  console.log('📅 Fetching active academic session...');
  const sessions = await supabaseGet('academic_sessions?status=eq.active&select=id,session_name');
  if (!sessions.length) {
    console.error('❌ No active academic session found. Create one in the Admin portal first.');
    process.exit(1);
  }
  const activeSession = sessions[0];
  console.log(`   Active session: ${activeSession.session_name}\n`);

  // 3. Fetch existing admission numbers to find the next one
  console.log('🔢 Fetching existing admission numbers...');
  const existing = await supabaseGet('students?select=admission_no&order=admission_no.asc');
  let nextAdmissionIndex = 1;
  if (existing.length) {
    const nums = existing
      .map(s => parseInt((s.admission_no || '').replace('BJPS-', '')))
      .filter(n => !isNaN(n));
    if (nums.length) nextAdmissionIndex = Math.max(...nums) + 1;
  }
  console.log(`   Starting admission numbers from BJPS-${String(nextAdmissionIndex).padStart(4, '0')}\n`);

  // 4. Load all CSVs
  let allStudents = [];
  for (const csvFile of CSV_FILES) {
    const filePath = path.join(__dirname, csvFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found, skipping: ${csvFile}`);
      continue;
    }
    const rows = parseCSV(filePath);
    allStudents = allStudents.concat(rows);
    console.log(`📁 Loaded ${csvFile}: ${rows.length} students`);
  }
  console.log(`\n📊 Total students to import: ${allStudents.length}\n`);
  console.log('─'.repeat(60));

  // 5. Import each student
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];
    const admissionNo = generateAdmissionNo(nextAdmissionIndex + i);
    const email = `${admissionNo}@bjps.com`;
    const password = admissionNo;
    const className = student.class_name?.trim();

    if (!className || !classMap[className]) {
      const msg = `Row ${i + 1}: Unknown class "${className}" — skipped`;
      console.warn(`⚠️  ${msg}`);
      errors.push(msg);
      failed++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${allStudents.length}] ${admissionNo} — ${student.first_name} ${student.last_name} (${className})... `);

    try {
      // Step A: Create auth user
      const authUser = await createAuthUser(email, password);
      if (!authUser.id) {
        throw new Error(authUser.msg || authUser.message || JSON.stringify(authUser));
      }

      // Step B: Insert student record
      const studentRecord = await supabasePost('students', {
        user_id: authUser.id,
        admission_no: admissionNo,
        first_name: student.first_name?.trim() || '',
        last_name: student.last_name?.trim() || '',
        dob: student.dob || null,
        gender: student.gender?.trim() || '',
        father_name: student.father_name?.trim() || '',
        mother_name: student.mother_name?.trim() || '',
        parent_phone: student.parent_phone?.trim() || '',
        address: student.address?.trim() || '',
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });

      if (!studentRecord[0]?.id) {
        throw new Error('Student insert failed: ' + JSON.stringify(studentRecord));
      }

      // Step C: Insert enrollment
      const enrollment = await supabasePost('student_enrollments', {
        student_id: studentRecord[0].id,
        session_id: activeSession.id,
        class_id: classMap[className],
        roll_no: student.roll_no?.trim() || '',
        status: 'active',
      });

      if (!enrollment[0]?.id) {
        throw new Error('Enrollment insert failed: ' + JSON.stringify(enrollment));
      }

      console.log('✅');
      success++;

    } catch (err) {
      console.log('❌');
      const msg = `Row ${i + 1} (${admissionNo} ${student.first_name}): ${err.message}`;
      errors.push(msg);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 150));
  }

  // 6. Summary
  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅ Successfully imported: ${success} students`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} students`);
    console.log('\nFailed entries:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log('\n🎉 Import complete!');
}

main().catch(console.error);