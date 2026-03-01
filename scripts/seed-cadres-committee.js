const { Client } = require('pg');

const client = new Client({ host: 'localhost', port: 5333, user: 'postgres', password: 'postgres', database: 'EC_nitish' });

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomMobile() { return String(pick([6,7,8,9])) + String(rand(100000000, 999999999)); }

const FIRST_NAMES_M = ['Rajesh','Suresh','Anil','Vijay','Ravi','Mohan','Ajith','Pradeep','Santhosh','Manoj','Sreekumar','Anoop','Jayan','Vinod','Prasad','Satheesh','Biju','Dileep','Harikumar','Thomas','Mathew','Joseph','Antony','Sebastian','George','John','Abraham','Shaji','Murali','Arun','Vivek','Rahul','Kiran','Akhil','Unnikrishnan','Vishnu','Krishna','Gopal','Sunil','Sreejith','Sajeev','Rajeev','Jayakumar','Gopakumar','Sajan','Deepu','Nishanth'];
const FIRST_NAMES_F = ['Lakshmi','Sunitha','Rani','Priya','Deepa','Anjali','Sreelatha','Beena','Bindu','Reshma','Kavitha','Jaya','Mini','Suja','Latha','Geetha','Remya','Divya','Nisha','Asha','Mary','Tessy','Lissy','Mercy','Grace','Sarala','Usha','Meera','Athira','Ammu','Devika'];
const LAST_NAMES = ['Nair','Menon','Pillai','Kumar','Varma','Krishnan','Rajan','Gopalan','Chandran','Das','Panicker','Kurup','Warrier','Pothan','Cherian','Philip','Thomas','Joseph','Varghese','George','Sebastian'];

const CADRE_TYPES = ['BOOTH_WORKER','SECTOR_INCHARGE','COORDINATOR','PARTY_WORKER','VOLUNTEER','YOUTH_WING','MAHILA_WING'];
const COMMITTEE_ROLES = ['BOOTH_PRESIDENT','BOOTH_AGENT','RELIEF_AGENT','POLLING_AGENT','TRANSPORT_INCHARGE','SOCIAL_MEDIA_INCHARGE','VOLUNTEER'];
const DESIGNATIONS = ['Block President','Ward Secretary','Mandal President','Booth Incharge','Youth Wing Leader','Mahila Wing Leader','IT Cell Member','Social Media Head','Panchayat Member','Ward Member',null,null,null];

async function run() {
  await client.connect();
  const electionId = '831795f6-3709-48d9-ac00-19df7e20efe0';

  // Get all parts
  const partsRes = await client.query('SELECT id, part_number FROM parts WHERE election_id=$1 ORDER BY part_number', [electionId]);
  const parts = partsRes.rows;
  console.log('Parts:', parts.length);

  // ===== STEP 1: Create ~450 Users + Cadres (3 per part on average) =====
  // We need enough cadres so each part gets 2-5 committee members
  const targetCadres = parts.length * 3; // ~450 cadres
  console.log(`\nCreating ${targetCadres} cadres...`);

  // Clear old committee data
  await client.query('DELETE FROM booth_committee_members WHERE election_id=$1', [electionId]);
  console.log('Cleared old committee data');

  // Don't delete existing cadres/users — just add new ones
  const existingCadres = await client.query('SELECT id FROM cadres WHERE election_id=$1', [electionId]);
  console.log(`Existing cadres: ${existingCadres.rows.length}`);

  const newCadresNeeded = Math.max(0, targetCadres - existingCadres.rows.length);
  console.log(`New cadres to create: ${newCadresNeeded}`);

  const allCadreIds = existingCadres.rows.map(r => r.id);

  await client.query('BEGIN');

  for (let i = 0; i < newCadresNeeded; i++) {
    const isFemale = Math.random() < 0.35;
    const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const lastName = pick(LAST_NAMES);
    const mobile = randomMobile();
    const cadreType = pick(CADRE_TYPES);
    const designation = pick(DESIGNATIONS);
    const ward = `Ward ${rand(1, 32)}`;

    // Create user (tenant_id from existing users, status='ACTIVE', dummy password_hash)
    const userRes = await client.query(
      `INSERT INTO users (id, tenant_id, first_name, last_name, mobile, password_hash, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), '15f6739c-501d-49e9-a265-44a948343743', $1, $2, $3, '$2b$10$seededdummyhashnotforlogin000000000000000000000000000', 'VOLUNTEER', 'ACTIVE', NOW(), NOW()) RETURNING id`,
      [firstName, lastName, mobile]
    );
    const userId = userRes.rows[0].id;

    // Create cadre
    const cadreRes = await client.query(
      `INSERT INTO cadres (id, user_id, election_id, cadre_type, designation, ward, is_active, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW(), NOW()) RETURNING id`,
      [userId, electionId, cadreType, designation, ward]
    );
    allCadreIds.push(cadreRes.rows[0].id);

    if ((i + 1) % 100 === 0) {
      await client.query('COMMIT');
      await client.query('BEGIN');
      console.log(`  Created ${i + 1}/${newCadresNeeded} cadres...`);
    }
  }

  await client.query('COMMIT');
  console.log(`Total cadres available: ${allCadreIds.length}`);

  // ===== STEP 2: Assign cadres to booth committees =====
  console.log('\nAssigning booth committee members...');

  // Shuffle cadre IDs for random assignment
  const shuffled = [...allCadreIds].sort(() => Math.random() - 0.5);
  let cadreIdx = 0;
  let totalAssigned = 0;

  await client.query('BEGIN');

  for (const part of parts) {
    // Each part gets 2-5 committee members
    const memberCount = rand(2, 5);
    const assignedRoles = new Set();

    for (let m = 0; m < memberCount; m++) {
      if (cadreIdx >= shuffled.length) {
        // Reshuffle if we run out
        shuffled.push(...[...allCadreIds].sort(() => Math.random() - 0.5));
      }

      const cadreId = shuffled[cadreIdx % shuffled.length];
      cadreIdx++;

      // Pick a role not yet assigned to this part
      let role;
      const availableRoles = COMMITTEE_ROLES.filter(r => !assignedRoles.has(r));
      if (availableRoles.length > 0) {
        // First member always Booth President, second always Booth Agent
        if (m === 0) role = 'BOOTH_PRESIDENT';
        else if (m === 1) role = 'BOOTH_AGENT';
        else role = pick(availableRoles);
      } else {
        role = 'VOLUNTEER';
      }
      assignedRoles.add(role);

      try {
        await client.query(
          `INSERT INTO booth_committee_members (id, election_id, part_id, cadre_id, role, is_active, assigned_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW(), NOW())
           ON CONFLICT (part_id, cadre_id) DO NOTHING`,
          [electionId, part.id, cadreId, role]
        );
        totalAssigned++;
      } catch (e) {
        // Skip conflicts silently
      }
    }

    if (part.part_number % 25 === 0) {
      await client.query('COMMIT');
      await client.query('BEGIN');
      console.log(`  Part ${part.part_number}: assigned ${memberCount} members (total: ${totalAssigned})`);
    }
  }

  await client.query('COMMIT');

  // ===== STEP 3: Summary =====
  const cadreCount = await client.query('SELECT COUNT(*) as cnt FROM cadres WHERE election_id=$1', [electionId]);
  const committeCount = await client.query('SELECT COUNT(*) as cnt FROM booth_committee_members WHERE election_id=$1', [electionId]);
  const roleSummary = await client.query(
    "SELECT role, COUNT(*) as cnt FROM booth_committee_members WHERE election_id=$1 GROUP BY role ORDER BY cnt DESC",
    [electionId]
  );
  const partsWithCommittee = await client.query(
    "SELECT COUNT(DISTINCT part_id) as cnt FROM booth_committee_members WHERE election_id=$1",
    [electionId]
  );

  console.log('\n===== SUMMARY =====');
  console.log('Total cadres:', cadreCount.rows[0].cnt);
  console.log('Total committee members:', committeCount.rows[0].cnt);
  console.log('Parts with committee:', partsWithCommittee.rows[0].cnt, '/', parts.length);
  console.log('\nRole distribution:');
  roleSummary.rows.forEach(r => console.log(`  ${r.role}: ${r.cnt}`));

  console.log('\nDone!');
  await client.end();
}

run().catch(e => { console.error(e); client.end(); });
