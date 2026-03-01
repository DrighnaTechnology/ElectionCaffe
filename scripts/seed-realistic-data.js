/**
 * Seed script for realistic, varied demographic data
 * Replaces uniform modulo-cycling distributions with weighted random selection
 * Target: nitish-scooby tenant (EC_nitish) on localhost:5333
 *
 * Run: cd ElectionCaffe && node scripts/seed-realistic-data.js
 */
const { Client } = require('pg');
const { v4: uuid } = require('uuid');

// =============== CONFIG ===============
const CORE_DB_URL = 'postgresql://postgres:admin@localhost:5333/electioncaffecore';
const TENANT_SLUG = 'nitish-scooby';
const VOTER_COUNT = 350; // Enough for varied charts
const PART_COUNT = 12;

// =============== REALISTIC DISTRIBUTIONS ===============

// Bihar demographics (roughly accurate)
const RELIGION_DISTRIBUTION = [
  { name: 'Hindu',     weight: 0.83 },
  { name: 'Muslim',    weight: 0.12 },
  { name: 'Christian', weight: 0.02 },
  { name: 'Sikh',      weight: 0.01 },
  { name: 'Buddhist',  weight: 0.01 },
  { name: 'Jain',      weight: 0.01 },
];

const CASTE_CATEGORY_DISTRIBUTION = [
  { name: 'General', fullName: 'General Category', weight: 0.15 },
  { name: 'OBC',     fullName: 'Other Backward Classes', weight: 0.45 },
  { name: 'SC',      fullName: 'Scheduled Caste', weight: 0.22 },
  { name: 'ST',      fullName: 'Scheduled Tribe', weight: 0.08 },
  { name: 'EWS',     fullName: 'Economically Weaker Section', weight: 0.10 },
];

// Castes mapped to caste categories
const CASTE_DATA = [
  { name: 'Rajput',    category: 'General',  weight: 0.06 },
  { name: 'Brahmin',   category: 'General',  weight: 0.05 },
  { name: 'Bhumihar',  category: 'General',  weight: 0.04 },
  { name: 'Kayastha',  category: 'General',  weight: 0.03 },
  { name: 'Yadav',     category: 'OBC',      weight: 0.14 },
  { name: 'Kurmi',     category: 'OBC',      weight: 0.10 },
  { name: 'Koeri',     category: 'OBC',      weight: 0.08 },
  { name: 'Teli',      category: 'OBC',      weight: 0.06 },
  { name: 'Kushwaha',  category: 'OBC',      weight: 0.05 },
  { name: 'Mallah',    category: 'OBC',      weight: 0.04 },
  { name: 'Paswan',    category: 'SC',       weight: 0.09 },
  { name: 'Chamar',    category: 'SC',       weight: 0.07 },
  { name: 'Dusadh',    category: 'SC',       weight: 0.05 },
  { name: 'Musahar',   category: 'SC',       weight: 0.03 },
  { name: 'Tharu',     category: 'ST',       weight: 0.04 },
  { name: 'Santhal',   category: 'ST',       weight: 0.03 },
  { name: 'Oraon',     category: 'ST',       weight: 0.02 },
  { name: 'Vaishya',   category: 'EWS',      weight: 0.02 },
];

const LANGUAGE_DISTRIBUTION = [
  { name: 'Hindi',      weight: 0.35 },
  { name: 'Bhojpuri',   weight: 0.22 },
  { name: 'Maithili',   weight: 0.18 },
  { name: 'Magahi',     weight: 0.10 },
  { name: 'Urdu',       weight: 0.07 },
  { name: 'Angika',     weight: 0.04 },
  { name: 'Bajjika',    weight: 0.02 },
  { name: 'English',    weight: 0.01 },
  { name: 'Bengali',    weight: 0.01 },
];

const PARTY_DISTRIBUTION = [
  { name: 'Bharatiya Janata Party',    short: 'BJP',   color: '#FF6600', weight: 0.28 },
  { name: 'Janata Dal (United)',       short: 'JDU',   color: '#006600', weight: 0.22 },
  { name: 'Rashtriya Janata Dal',      short: 'RJD',   color: '#00CC00', weight: 0.18 },
  { name: 'Indian National Congress',  short: 'INC',   color: '#00BFFF', weight: 0.10 },
  { name: 'Lok Janshakti Party',       short: 'LJP',   color: '#800080', weight: 0.07 },
  { name: 'Hindustani Awam Morcha',    short: 'HAM',   color: '#FFA500', weight: 0.05 },
  { name: 'Communist Party of India',  short: 'CPI',   color: '#FF0000', weight: 0.03 },
  { name: 'Bahujan Samaj Party',       short: 'BSP',   color: '#0000FF', weight: 0.04 },
  { name: 'Vikassheel Insaan Party',   short: 'VIP',   color: '#FFD700', weight: 0.02 },
  { name: 'Independent',              short: 'IND',   color: '#808080', weight: 0.01 },
];

const VOTER_CATEGORY_DISTRIBUTION = [
  { name: 'Regular Voter',       weight: 0.45 },
  { name: 'First Time Voter',    weight: 0.15 },
  { name: 'Senior Citizen',      weight: 0.12 },
  { name: 'Youth Voter',         weight: 0.10 },
  { name: 'NRI Voter',           weight: 0.02 },
  { name: 'PWD Voter',           weight: 0.04 },
  { name: 'Government Employee', weight: 0.05 },
  { name: 'Farmer',              weight: 0.07 },
];

// Gender: India avg ~52% male, 47% female, ~1% other
const GENDER_DISTRIBUTION = [
  { name: 'MALE',   weight: 0.52 },
  { name: 'FEMALE', weight: 0.47 },
  { name: 'OTHER',  weight: 0.01 },
];

// Age distribution matching India demographics
const AGE_DISTRIBUTION = [
  { min: 18, max: 25, weight: 0.18 },
  { min: 26, max: 35, weight: 0.24 },
  { min: 36, max: 45, weight: 0.22 },
  { min: 46, max: 55, weight: 0.16 },
  { min: 56, max: 65, weight: 0.12 },
  { min: 66, max: 85, weight: 0.08 },
];

const POLITICAL_LEANING_DIST = [
  { name: 'LOYAL',      weight: 0.32 },
  { name: 'SWING',      weight: 0.28 },
  { name: 'OPPOSITION', weight: 0.25 },
  { name: 'UNKNOWN',    weight: 0.15 },
];

const INFLUENCE_DIST = [
  { name: 'HIGH',   weight: 0.10 },
  { name: 'MEDIUM', weight: 0.30 },
  { name: 'LOW',    weight: 0.40 },
  { name: 'NONE',   weight: 0.20 },
];

// Indian names
const firstNamesMale = ['Rajesh','Amit','Sunil','Vijay','Rahul','Deepak','Anil','Manoj','Sanjay','Ajay','Ravi','Dinesh','Ramesh','Ashok','Vinod','Pradeep','Suresh','Mukesh','Rakesh','Yogesh','Mohan','Krishna','Gopal','Hari','Shankar','Ganesh','Naresh','Mahesh','Pawan','Lalit','Arvind','Birendra','Chandan','Dhirendra','Gaurav','Hemant','Jagdish','Kamlesh','Laxman','Nagendra','Omprakash','Prabhat','Rajendra','Santosh','Tribhuvan','Upendra','Vishwanath','Wakeel','Yashwant','Zaheer'];
const firstNamesFemale = ['Priya','Sunita','Anita','Meena','Kavita','Neha','Pooja','Ritu','Geeta','Suman','Lakshmi','Sarita','Rekha','Nisha','Asha','Bharti','Seema','Kiran','Shanti','Rani','Babita','Champa','Durga','Farha','Gauri','Hemlata','Indira','Jyoti','Kamla','Lata','Mamta','Nirmala','Padma','Pushpa','Radha','Savitri','Tulsi','Uma','Vandana','Yashodhara'];
const lastNames = ['Kumar','Singh','Sharma','Verma','Gupta','Yadav','Patel','Mishra','Chauhan','Jha','Pandey','Dubey','Tiwari','Srivastava','Thakur','Joshi','Prasad','Das','Roy','Paswan','Manjhi','Ram','Mehta','Sahni','Choudhary'];
const districts = ['Patna','Gaya','Nalanda','Muzaffarpur','Bhagalpur','Darbhanga','Samastipur','Vaishali','Saran','Munger','Begusarai','Madhubani'];
const boothNames = ['Government Primary School','Panchayat Bhawan','Community Hall','Middle School','Anganwadi Center','Block Office','High School','Inter College','Town Hall','Municipal Office','District Court Complex','Health Sub Centre'];

// =============== HELPERS ===============
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPhone() { return `${randInt(7,9)}${String(randInt(100000000,999999999)).padStart(9,'0')}`; }

/** Weighted random selection from distribution array */
function weightedRandom(distribution) {
  const r = Math.random();
  let cumulative = 0;
  for (const item of distribution) {
    cumulative += item.weight;
    if (r <= cumulative) return item;
  }
  return distribution[distribution.length - 1];
}

/** Generate DOB from age range */
function generateDOB(minAge, maxAge) {
  const age = randInt(minAge, maxAge);
  const year = 2026 - age;
  const month = randInt(0, 11);
  const day = randInt(1, 28);
  return { dob: new Date(year, month, day).toISOString(), age };
}

// =============== MAIN ===============
async function seed() {
  // Step 1: Find tenant database
  console.log('Connecting to core database...');
  const coreClient = new Client({ connectionString: CORE_DB_URL });
  await coreClient.connect();

  // Get columns first
  const colResult = await coreClient.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND table_schema = 'public'`
  );
  const columns = colResult.rows.map(r => r.column_name);
  console.log('Tenant table columns:', columns.join(', '));

  // Find the tenant - use snake_case or camelCase based on what exists
  const hasSnakeCase = columns.includes('database_name');
  const dbNameCol = hasSnakeCase ? 'database_name' : '"databaseName"';
  const dbHostCol = hasSnakeCase ? 'database_host' : '"databaseHost"';
  const dbPortCol = hasSnakeCase ? 'database_port' : '"databasePort"';
  const dbUserCol = hasSnakeCase ? 'database_user' : '"databaseUser"';
  const dbPassCol = hasSnakeCase ? 'database_password' : '"databasePassword"';

  let tenantResult;
  try {
    tenantResult = await coreClient.query(
      `SELECT id, slug, ${dbNameCol} as db_name, ${dbHostCol} as db_host, ${dbPortCol} as db_port, ${dbUserCol} as db_user, ${dbPassCol} as db_pass FROM tenants WHERE slug = $1 LIMIT 1`,
      [TENANT_SLUG]
    );
  } catch (e) {
    // If column names fail, try alternative
    console.log('Column name query failed, trying raw select...');
    tenantResult = await coreClient.query(`SELECT * FROM tenants WHERE slug = $1 LIMIT 1`, [TENANT_SLUG]);
  }

  if (tenantResult.rows.length === 0) {
    console.error(`Tenant "${TENANT_SLUG}" not found!`);
    // List available tenants
    const allTenants = await coreClient.query('SELECT slug FROM tenants LIMIT 20');
    console.log('Available tenants:', allTenants.rows.map(r => r.slug).join(', '));
    await coreClient.end();
    process.exit(1);
  }

  const tenant = tenantResult.rows[0];
  console.log('Found tenant:', JSON.stringify(tenant, null, 2));

  // Build tenant DB connection URL
  const tenantDbName = tenant.db_name || tenant.databaseName || `EC_${TENANT_SLUG.replace(/-/g, '_')}`;
  const tenantDbHost = tenant.db_host || tenant.databaseHost || 'localhost';
  const tenantDbPort = tenant.db_port || tenant.databasePort || 5333;
  const tenantDbUser = tenant.db_user || tenant.databaseUser || 'postgres';
  const tenantDbPass = tenant.db_pass || tenant.databasePassword || 'admin';

  const tenantDbUrl = `postgresql://${tenantDbUser}:${tenantDbPass}@${tenantDbHost}:${tenantDbPort}/${tenantDbName}`;
  console.log(`Connecting to tenant DB: ${tenantDbName} on ${tenantDbHost}:${tenantDbPort}`);
  await coreClient.end();

  // Step 2: Connect to tenant database
  const client = new Client({ connectionString: tenantDbUrl });
  await client.connect();
  console.log(`Connected to ${tenantDbName}`);

  const TENANT_ID = tenant.id;

  // Step 3: Find or create election
  let electionResult = await client.query(`SELECT id, name FROM elections WHERE status = 'ACTIVE' LIMIT 1`);
  if (electionResult.rows.length === 0) {
    electionResult = await client.query(`SELECT id, name FROM elections LIMIT 1`);
  }

  let electionId;
  if (electionResult.rows.length === 0) {
    // Create election
    electionId = uuid();
    await client.query(`INSERT INTO elections (id, tenant_id, name, election_type, state, constituency, district, status, total_voters, total_male_voters, total_female_voters, total_other_voters, total_booths, total_parts, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
      [electionId, TENANT_ID, 'Bihar Assembly Election 2026', 'ASSEMBLY', 'Bihar', 'Patna Sahib', 'Patna', 'ACTIVE', 0, 0, 0, 0, 0, 0]);
    console.log('Created new election:', electionId);
  } else {
    electionId = electionResult.rows[0].id;
    console.log('Using existing election:', electionResult.rows[0].name, `(${electionId})`);
  }

  // Step 4: Delete old voters (to replace with realistic data)
  const oldVoterCount = await client.query(`SELECT COUNT(*) as cnt FROM voters WHERE election_id = $1`, [electionId]);
  console.log(`Existing voters: ${oldVoterCount.rows[0].cnt}`);

  // Delete dependant records first
  console.log('Cleaning old data...');
  await client.query(`DELETE FROM poll_day_votes WHERE election_id = $1`, [electionId]);
  await client.query(`DELETE FROM voter_voting_histories WHERE voter_id IN (SELECT id FROM voters WHERE election_id = $1)`, [electionId]);
  await client.query(`DELETE FROM survey_responses WHERE voter_id IN (SELECT id FROM voters WHERE election_id = $1)`, [electionId]);
  await client.query(`DELETE FROM feedback_issues WHERE voter_id IN (SELECT id FROM voters WHERE election_id = $1)`, [electionId]);
  await client.query(`DELETE FROM voters WHERE election_id = $1`, [electionId]);
  console.log('Old voter data cleaned');

  // Step 5: Create/Update master data with realistic IDs

  // --- Religions ---
  console.log('Seeding religions...');
  const religionIds = {};
  for (const rel of RELIGION_DISTRIBUTION) {
    const existing = await client.query(`SELECT id FROM religions WHERE election_id = $1 AND religion_name = $2`, [electionId, rel.name]);
    if (existing.rows.length > 0) {
      religionIds[rel.name] = existing.rows[0].id;
    } else {
      const id = uuid();
      await client.query(`INSERT INTO religions (id, election_id, religion_name, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
        [id, electionId, rel.name, Object.keys(religionIds).length, true]);
      religionIds[rel.name] = id;
    }
  }
  console.log(`  ${Object.keys(religionIds).length} religions ready`);

  // --- Caste Categories ---
  console.log('Seeding caste categories...');
  const casteCatIds = {};
  const reservationPcts = { 'General': 0, 'OBC': 27, 'SC': 15, 'ST': 7.5, 'EWS': 10 };
  for (const cat of CASTE_CATEGORY_DISTRIBUTION) {
    const existing = await client.query(`SELECT id FROM caste_categories WHERE election_id = $1 AND category_name = $2`, [electionId, cat.name]);
    if (existing.rows.length > 0) {
      casteCatIds[cat.name] = existing.rows[0].id;
    } else {
      const id = uuid();
      await client.query(`INSERT INTO caste_categories (id, election_id, category_name, category_full_name, reservation_percent, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id, electionId, cat.name, cat.fullName, reservationPcts[cat.name] || 0, Object.keys(casteCatIds).length, true]);
      casteCatIds[cat.name] = id;
    }
  }
  console.log(`  ${Object.keys(casteCatIds).length} caste categories ready`);

  // --- Castes ---
  console.log('Seeding castes...');
  const casteIds = {};
  for (const caste of CASTE_DATA) {
    const catId = casteCatIds[caste.category];
    if (!catId) continue;
    const existing = await client.query(`SELECT id FROM castes WHERE election_id = $1 AND caste_name = $2`, [electionId, caste.name]);
    if (existing.rows.length > 0) {
      casteIds[caste.name] = existing.rows[0].id;
    } else {
      const id = uuid();
      const relId = religionIds['Hindu']; // Most castes are Hindu in Bihar
      await client.query(`INSERT INTO castes (id, election_id, caste_category_id, religion_id, caste_name, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id, electionId, catId, relId, caste.name, Object.keys(casteIds).length, true]);
      casteIds[caste.name] = id;
    }
  }
  console.log(`  ${Object.keys(casteIds).length} castes ready`);

  // --- Languages ---
  console.log('Seeding languages...');
  const languageIds = {};
  for (const lang of LANGUAGE_DISTRIBUTION) {
    const existing = await client.query(`SELECT id FROM languages WHERE election_id = $1 AND language_name = $2`, [electionId, lang.name]);
    if (existing.rows.length > 0) {
      languageIds[lang.name] = existing.rows[0].id;
    } else {
      const id = uuid();
      await client.query(`INSERT INTO languages (id, election_id, language_name, language_code, writing_direction, voter_count, display_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
        [id, electionId, lang.name, lang.name.substring(0, 2).toLowerCase(), 'ltr', 0, Object.keys(languageIds).length, true]);
      languageIds[lang.name] = id;
    }
  }
  console.log(`  ${Object.keys(languageIds).length} languages ready`);

  // --- Parties ---
  console.log('Seeding parties...');
  const partyIds = {};
  for (const party of PARTY_DISTRIBUTION) {
    const existing = await client.query(`SELECT id FROM parties WHERE election_id = $1 AND party_short_name = $2`, [electionId, party.short]);
    if (existing.rows.length > 0) {
      partyIds[party.short] = existing.rows[0].id;
    } else {
      const id = uuid();
      await client.query(`INSERT INTO parties (id, election_id, party_name, party_short_name, party_full_name, party_color, display_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
        [id, electionId, party.name, party.short, party.name, party.color, Object.keys(partyIds).length, true]);
      partyIds[party.short] = id;
    }
  }
  console.log(`  ${Object.keys(partyIds).length} parties ready`);

  // --- Voter Categories ---
  console.log('Seeding voter categories...');
  const voterCatIds = {};
  const catColors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF','#7BC225'];
  for (let i = 0; i < VOTER_CATEGORY_DISTRIBUTION.length; i++) {
    const vc = VOTER_CATEGORY_DISTRIBUTION[i];
    const existing = await client.query(`SELECT id FROM voter_categories WHERE election_id = $1 AND category_name = $2`, [electionId, vc.name]);
    if (existing.rows.length > 0) {
      voterCatIds[vc.name] = existing.rows[0].id;
    } else {
      const id = uuid();
      await client.query(`INSERT INTO voter_categories (id, election_id, category_name, category_description, category_color, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id, electionId, vc.name, `Category for ${vc.name}`, catColors[i], i, true]);
      voterCatIds[vc.name] = id;
    }
  }
  console.log(`  ${Object.keys(voterCatIds).length} voter categories ready`);

  // --- Parts ---
  console.log('Seeding parts...');
  let partResult = await client.query(`SELECT id FROM parts WHERE election_id = $1`, [electionId]);
  const partIds = partResult.rows.map(r => r.id);

  if (partIds.length < PART_COUNT) {
    for (let i = partIds.length; i < PART_COUNT; i++) {
      const id = uuid();
      const totalVoters = randInt(20, 45);
      const maleV = Math.round(totalVoters * 0.52);
      const femaleV = Math.round(totalVoters * 0.47);
      const otherV = totalVoters - maleV - femaleV;
      await client.query(`INSERT INTO parts (id, election_id, part_number, booth_name, part_type, address, pincode, total_voters, total_sections, male_voters, female_voters, other_voters, is_vulnerable, vulnerability, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
        [id, electionId, i + 1, `${boothNames[i % boothNames.length]} - ${districts[i % districts.length]}`, rand(['URBAN', 'RURAL']), `Ward ${randInt(1, 30)}, ${districts[i % districts.length]}`, `8${randInt(10, 99)}0${randInt(10, 99)}`, totalVoters, randInt(1, 3), maleV, femaleV, otherV, Math.random() > 0.7, rand(['NOT_ASSIGNED', 'NONE', 'CRITICAL', 'SENSITIVE', 'HYPERSENSITIVE'])]);
      partIds.push(id);
    }
  }
  console.log(`  ${partIds.length} parts ready`);

  // --- Sections ---
  let sectionResult = await client.query(`SELECT id FROM sections WHERE election_id = $1`, [electionId]);
  const sectionIds = sectionResult.rows.map(r => r.id);
  if (sectionIds.length === 0) {
    for (let i = 0; i < partIds.length; i++) {
      const id = uuid();
      await client.query(`INSERT INTO sections (id, election_id, part_id, section_number, section_name, total_voters, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [id, electionId, partIds[i], i + 1, `Section ${i + 1}`, randInt(20, 40), true]);
      sectionIds.push(id);
    }
  }

  // --- Booths ---
  let boothResult = await client.query(`SELECT id FROM booths WHERE election_id = $1`, [electionId]);
  const boothIds = boothResult.rows.map(r => r.id);
  if (boothIds.length === 0) {
    for (let i = 0; i < partIds.length; i++) {
      const id = uuid();
      await client.query(`INSERT INTO booths (id, election_id, part_id, booth_number, booth_name, address, total_voters, male_voters, female_voters, other_voters, vulnerability_status, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
        [id, electionId, partIds[i], `B${String(i + 1).padStart(3, '0')}`, `Booth ${i + 1} - ${districts[i % districts.length]}`, `${districts[i % districts.length]}, Bihar`, randInt(20, 40), randInt(10, 20), randInt(8, 18), randInt(0, 2), rand(['NONE', 'CRITICAL', 'SENSITIVE']), true]);
      boothIds.push(id);
    }
  }

  // --- Families ---
  let familyResult = await client.query(`SELECT id FROM families WHERE election_id = $1`, [electionId]);
  const familyIds = familyResult.rows.map(r => r.id);
  if (familyIds.length < 50) {
    for (let i = familyIds.length; i < 70; i++) {
      const id = uuid();
      const ln = rand(lastNames);
      await client.query(`INSERT INTO families (id, election_id, part_id, family_name, head_name, address, house_no, mobile, total_members, party_affiliation, support_level, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [id, electionId, partIds[i % partIds.length], `${ln} Family`, `${rand(firstNamesMale)} ${ln}`, `House ${randInt(1, 500)}, Ward ${randInt(1, 30)}, ${rand(districts)}`, `H-${randInt(1, 500)}`, randPhone(), randInt(2, 8), weightedRandom(PARTY_DISTRIBUTION).short, randInt(1, 5)]);
      familyIds.push(id);
    }
  }
  console.log(`  ${familyIds.length} families ready`);

  // Step 6: Create voters with REALISTIC weighted distributions
  console.log(`\nSeeding ${VOTER_COUNT} voters with realistic distributions...`);

  // Track distribution for verification
  const stats = {
    gender: {}, religion: {}, caste: {}, language: {},
    party: {}, voterCategory: {}, leaning: {}, ageGroup: {},
  };

  for (let i = 0; i < VOTER_COUNT; i++) {
    const id = uuid();

    // Weighted random selections
    const gender = weightedRandom(GENDER_DISTRIBUTION);
    const religion = weightedRandom(RELIGION_DISTRIBUTION);
    const caste = weightedRandom(CASTE_DATA);
    const language = weightedRandom(LANGUAGE_DISTRIBUTION);
    const party = weightedRandom(PARTY_DISTRIBUTION);
    const voterCat = weightedRandom(VOTER_CATEGORY_DISTRIBUTION);
    const leaning = weightedRandom(POLITICAL_LEANING_DIST);
    const influence = weightedRandom(INFLUENCE_DIST);
    const ageRange = weightedRandom(AGE_DISTRIBUTION);
    const { dob, age } = generateDOB(ageRange.min, ageRange.max);

    // Pick name based on gender
    const firstName = gender.name === 'FEMALE'
      ? rand(firstNamesFemale)
      : rand(firstNamesMale);
    const lastName = rand(lastNames);
    const fatherName = `${rand(firstNamesMale)} ${lastName}`;

    // ~75% have mobile
    const hasMobile = Math.random() < 0.75;
    // ~85% have DOB
    const hasDOB = Math.random() < 0.85;
    // Some nulls for partial data coverage (makes data completeness charts interesting)
    const hasReligion = Math.random() < 0.82;
    const hasCaste = Math.random() < 0.70;
    const hasLanguage = Math.random() < 0.78;
    const hasParty = Math.random() < 0.55; // Many voters don't declare party
    const hasCategory = Math.random() < 0.65;

    const religionId = hasReligion ? (religionIds[religion.name] || null) : null;
    const casteId = hasCaste ? (casteIds[caste.name] || null) : null;
    const casteCategoryId = hasCaste ? (casteCatIds[caste.category] || null) : null;
    const languageId = hasLanguage ? (languageIds[language.name] || null) : null;
    const partyId = hasParty ? (partyIds[party.short] || null) : null;
    const voterCategoryId = hasCategory ? (voterCatIds[voterCat.name] || null) : null;

    await client.query(`INSERT INTO voters (id, election_id, part_id, section_id, booth_id, family_id, epic_number, sl_number, name, father_name, gender, age, date_of_birth, mobile, house_number, address, religion_id, caste_category_id, caste_id, language_id, party_id, voter_category_id, political_leaning, influence_level, is_family_captain, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW(),NOW())`,
      [
        id, electionId,
        partIds[i % partIds.length],
        sectionIds[i % sectionIds.length],
        boothIds[i % boothIds.length],
        familyIds[i % familyIds.length],
        `BIH/${String(randInt(100, 999))}/${String(randInt(100000, 999999))}`,
        i + 1,
        `${firstName} ${lastName}`,
        fatherName,
        gender.name,
        hasDOB ? age : null,
        hasDOB ? dob : null,
        hasMobile ? randPhone() : null,
        `H-${randInt(1, 500)}`,
        `Ward ${randInt(1, 30)}, ${rand(districts)}, Bihar`,
        religionId,
        casteCategoryId,
        casteId,
        languageId,
        partyId,
        voterCategoryId,
        leaning.name,
        influence.name,
        i % 5 === 0, // Every 5th voter is family captain
      ]);

    // Track stats
    stats.gender[gender.name] = (stats.gender[gender.name] || 0) + 1;
    if (hasReligion) stats.religion[religion.name] = (stats.religion[religion.name] || 0) + 1;
    if (hasCaste) stats.caste[caste.name] = (stats.caste[caste.name] || 0) + 1;
    if (hasLanguage) stats.language[language.name] = (stats.language[language.name] || 0) + 1;
    if (hasParty) stats.party[party.short] = (stats.party[party.short] || 0) + 1;

    // Log progress
    if ((i + 1) % 50 === 0) console.log(`  Created ${i + 1}/${VOTER_COUNT} voters...`);
  }

  // Step 7: Update election totals
  const maleCount = stats.gender['MALE'] || 0;
  const femaleCount = stats.gender['FEMALE'] || 0;
  const otherCount = stats.gender['OTHER'] || 0;

  await client.query(`UPDATE elections SET total_voters = $1, total_male_voters = $2, total_female_voters = $3, total_other_voters = $4, total_parts = $5, total_booths = $6 WHERE id = $7`,
    [VOTER_COUNT, maleCount, femaleCount, otherCount, partIds.length, boothIds.length, electionId]);

  // Update part voter counts
  for (const partId of partIds) {
    const partVoters = await client.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN gender='MALE' THEN 1 END) as male, COUNT(CASE WHEN gender='FEMALE' THEN 1 END) as female, COUNT(CASE WHEN gender='OTHER' THEN 1 END) as other FROM voters WHERE part_id = $1`, [partId]);
    const pv = partVoters.rows[0];
    await client.query(`UPDATE parts SET total_voters = $1, male_voters = $2, female_voters = $3, other_voters = $4 WHERE id = $5`,
      [parseInt(pv.total), parseInt(pv.male), parseInt(pv.female), parseInt(pv.other), partId]);
  }

  // Print distribution summary
  console.log('\n========== DISTRIBUTION SUMMARY ==========');
  console.log('\nGender:');
  for (const [k, v] of Object.entries(stats.gender)) {
    console.log(`  ${k}: ${v} (${((v / VOTER_COUNT) * 100).toFixed(1)}%)`);
  }
  console.log('\nReligion (of those with data):');
  const relTotal = Object.values(stats.religion).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(stats.religion).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${((v / relTotal) * 100).toFixed(1)}%)`);
  }
  console.log('\nCaste (top 10):');
  const casteTotal = Object.values(stats.caste).reduce((a, b) => a + b, 0);
  const sortedCastes = Object.entries(stats.caste).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [k, v] of sortedCastes) {
    console.log(`  ${k}: ${v} (${((v / casteTotal) * 100).toFixed(1)}%)`);
  }
  console.log('\nLanguage:');
  const langTotal = Object.values(stats.language).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(stats.language).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${((v / langTotal) * 100).toFixed(1)}%)`);
  }
  console.log('\nParty Affiliation:');
  const partyTotal = Object.values(stats.party).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(stats.party).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${((v / partyTotal) * 100).toFixed(1)}%)`);
  }

  console.log('\n========================================');
  console.log(`Total voters created: ${VOTER_COUNT}`);
  console.log(`Data completeness:`);
  console.log(`  Mobile: ~75%  |  DOB: ~85%  |  Religion: ~82%`);
  console.log(`  Caste: ~70%   |  Language: ~78%  |  Party: ~55%`);
  console.log('Seed completed successfully!');

  await client.end();
}

seed().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});
