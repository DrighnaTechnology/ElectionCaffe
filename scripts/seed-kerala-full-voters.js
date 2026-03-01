const { Client } = require('pg');

const client = new Client({ host: 'localhost', port: 5333, user: 'postgres', password: 'postgres', database: 'EC_nitish' });

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomMobile() { return String(pick([6,7,8,9])) + String(rand(100000000, 999999999)); }
function randomEpic() {
  const l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return l[rand(0,25)] + l[rand(0,25)] + l[rand(0,25)] + String(rand(1000000, 9999999));
}

const FIRST_NAMES_M = ['Rajesh','Suresh','Anil','Vijay','Ravi','Mohan','Ajith','Pradeep','Santhosh','Manoj','Babu','Sreekumar','Anoop','Jayan','Vinod','Prasad','Satheesh','Biju','Dileep','Harikumar','Jayakumar','Gopakumar','Sajan','Thomas','Mathew','Joseph','Antony','Sebastian','George','John','Abraham','Shaji','Murali','Deepu','Nishanth','Arun','Vivek','Rahul','Kiran','Akhil','Unnikrishnan','Vishnu','Krishna','Gopal','Sunil','Santhakumaran','Rajeev','Sreejith','Sajeev','Muraleedharan'];
const FIRST_NAMES_F = ['Lakshmi','Sunitha','Rani','Priya','Deepa','Anjali','Sreelatha','Beena','Bindu','Reshma','Kavitha','Jaya','Mini','Suja','Latha','Geetha','Remya','Divya','Nisha','Asha','Mary','Tessy','Lissy','Mercy','Grace','Rosa','Thresia','Annamma','Elsamma','Sarala','Usha','Meera','Athira','Ammu','Devika','Sreekala','Parvathy','Radhika','Subha','Indira'];
const LAST_NAMES = ['Nair','Menon','Pillai','Kumar','Varma','Krishnan','Unnikrishnan','Rajan','Gopalan','Chandran','Mohan','Das','Panicker','Kurup','Warrier','Iyer','Namboothiri','Pothan','Cherian','Philip','Mathew','Thomas','John','Joseph','Abraham','Kurian','Varghese','George','Sebastian','Xavier'];
const FATHER_NAMES_M = ['Krishnan','Gopalan','Raman','Narayanan','Padmanabhan','Shankar','Velayudhan','Damodaran','Madhavan','Balakrishnan','Achuthan','Kunjappan','Varghese','Mathai','Ouseph','Paulose','Chacko','Kurien','Hamza','Ibrahim','Suleiman','Basheer','Aboobacker'];

const HOUSE_NAMES = ['Kizhakkethil','Padinjattethil','Vadakkethil','Thekkethil','Thottathil','Puthenveedu','Pazhayaveedu','Mundakkal','Edathinamannil','Mannaparambil','Kuttikkamannil','Vazhappilly','Nellimoottil','Thoppil','Muttathil','Pulickathara','Palathingal','Erumathala','Veliyanad','Naduvilemuri'];
const AREAS = ['Kochuveli','Vettukad','Pattom','Kesavadasapuram','Kowdiar','Vanchiyoor','Thampanoor','Palayam','Statue','Jagathi','Peroorkada','Ulloor','Karamana','Nemom','Thirumala','Medical College','Sreekaryam','Poojappura','Kannanmoola','Manacaud','Chalai','Attakulangara','Beemapally','Shanghumugham','Vazhuthacaud','Thycaud'];
const PROFESSIONS = ['Farmer','Teacher','Doctor','Engineer','Driver','Shopkeeper','Fisherman','Auto Rickshaw Driver','Government Employee','Retired','Homemaker','Lawyer','Nurse','IT Professional','Business','Construction Worker','Electrician','Plumber','Tailor','Cook'];
const EDUCATIONS = ['Illiterate','Primary','Middle School','High School','Higher Secondary','Graduate','Post Graduate','Professional','Diploma','PhD'];

async function run() {
  await client.connect();

  const electionId = '831795f6-3709-48d9-ac00-19df7e20efe0';

  // ===== STEP 1: Add Kerala-specific master data =====
  console.log('Adding Kerala-specific master data...');

  // Add Malayalam language if not exists
  let malayalamId;
  const mlCheck = await client.query("SELECT id FROM languages WHERE language_name='Malayalam' AND election_id=$1", [electionId]);
  if (mlCheck.rows.length === 0) {
    const mlRes = await client.query("INSERT INTO languages (id, election_id, language_name, language_code, writing_direction, voter_count, display_order, is_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'Malayalam', 'ml', 'ltr', 0, 1, true, NOW(), NOW()) RETURNING id", [electionId]);
    malayalamId = mlRes.rows[0].id;
    console.log('  Added Malayalam language');
  } else {
    malayalamId = mlCheck.rows[0].id;
  }

  // Get existing language IDs
  const langRows = await client.query("SELECT id, language_name FROM languages WHERE election_id=$1", [electionId]);
  const langMap = {};
  langRows.rows.forEach(r => { langMap[r.language_name] = r.id; });

  // Get existing religion IDs
  const relRows = await client.query("SELECT id, religion_name FROM religions WHERE election_id=$1", [electionId]);
  const religionMap = {};
  relRows.rows.forEach(r => { religionMap[r.religion_name] = r.id; });

  // Get existing caste category IDs
  const catRows = await client.query("SELECT id, category_name FROM caste_categories WHERE election_id=$1", [electionId]);
  const casteCatMap = {};
  catRows.rows.forEach(r => { casteCatMap[r.category_name] = r.id; });

  // Add Kerala-specific castes if not exists
  const keralaCastes = [
    { name: 'Nair', category: 'General' },
    { name: 'Ezhava', category: 'OBC' },
    { name: 'Thiyya', category: 'OBC' },
    { name: 'Pulaya', category: 'SC' },
    { name: 'Paraya', category: 'SC' },
    { name: 'Kurava', category: 'SC' },
    { name: 'Latin Catholic', category: 'General' },
    { name: 'Syrian Christian', category: 'General' },
    { name: 'Mappila', category: 'OBC' },
    { name: 'Vishwakarma', category: 'OBC' },
    { name: 'Dheevara', category: 'OBC' },
    { name: 'Scheduled Tribe', category: 'ST' },
  ];

  const casteIdMap = {};
  // First load existing castes
  const existingCastes = await client.query("SELECT id, caste_name, caste_category_id FROM castes WHERE election_id=$1", [electionId]);
  existingCastes.rows.forEach(r => { casteIdMap[r.caste_name] = { id: r.id, catId: r.caste_category_id }; });

  for (const kc of keralaCastes) {
    if (!casteIdMap[kc.name]) {
      const catId = casteCatMap[kc.category];
      if (!catId) { console.log('  WARNING: category not found:', kc.category); continue; }
      const res = await client.query(
        "INSERT INTO castes (id, election_id, caste_category_id, caste_name, display_order, is_active, created_at) VALUES (gen_random_uuid(), $1, $2, $3, 0, true, NOW()) RETURNING id",
        [electionId, catId, kc.name]
      );
      casteIdMap[kc.name] = { id: res.rows[0].id, catId };
      console.log('  Added caste:', kc.name);
    }
  }

  // Add Kerala parties if not exist
  const keralaParties = ['CPI(M)', 'CPI', 'IUML', 'Kerala Congress (M)', 'NCP', 'JD(S)'];
  const partyRows = await client.query("SELECT id, party_name FROM parties WHERE election_id=$1", [electionId]);
  const partyMap = {};
  partyRows.rows.forEach(r => { partyMap[r.party_name] = r.id; });

  for (const p of keralaParties) {
    if (!partyMap[p]) {
      const res = await client.query(
        "INSERT INTO parties (id, election_id, party_name, party_short_name, party_color, is_default, is_neutral, display_order, is_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $2, '#808080', false, false, 0, true, NOW(), NOW()) RETURNING id",
        [electionId, p]
      );
      partyMap[p] = res.rows[0].id;
      console.log('  Added party:', p);
    }
  }

  // Get voter categories
  const vcRows = await client.query("SELECT id, category_name FROM voter_categories WHERE election_id=$1", [electionId]);
  const voterCatMap = {};
  vcRows.rows.forEach(r => { voterCatMap[r.category_name] = r.id; });

  console.log('\nMaster data ready. Updating voters...\n');

  // ===== STEP 2: Define Kerala demographics for weighted random selection =====

  // Kerala Thiruvananthapuram religion distribution: ~65% Hindu, ~20% Christian, ~13% Muslim, ~2% others
  const religionWeights = [
    { id: religionMap['Hindu'], name: 'Hindu', weight: 65 },
    { id: religionMap['Christian'], name: 'Christian', weight: 20 },
    { id: religionMap['Muslim'], name: 'Muslim', weight: 13 },
    { id: religionMap['Buddhist'], name: 'Buddhist', weight: 1 },
    { id: religionMap['Jain'], name: 'Jain', weight: 0.5 },
    { id: religionMap['Sikh'], name: 'Sikh', weight: 0.5 },
  ].filter(r => r.id);

  // Caste distribution by religion
  const hinduCastes = [
    { name: 'Nair', weight: 30 },
    { name: 'Ezhava', weight: 35 },
    { name: 'Brahmin', weight: 5 },  // Namboothiri
    { name: 'Thiyya', weight: 5 },
    { name: 'Pulaya', weight: 8 },
    { name: 'Paraya', weight: 5 },
    { name: 'Vishwakarma', weight: 5 },
    { name: 'Dheevara', weight: 4 },
    { name: 'Kurava', weight: 3 },
  ].filter(c => casteIdMap[c.name]);

  const christianCastes = [
    { name: 'Latin Catholic', weight: 50 },
    { name: 'Syrian Christian', weight: 50 },
  ].filter(c => casteIdMap[c.name]);

  const muslimCastes = [
    { name: 'Mappila', weight: 100 },
  ].filter(c => casteIdMap[c.name]);

  // Language: ~92% Malayalam, ~4% Tamil, ~2% Hindi, ~2% others
  const languageWeights = [
    { id: langMap['Malayalam'], weight: 92 },
    { id: langMap['Tamil'], weight: 4 },
    { id: langMap['Hindi'], weight: 2 },
    { id: langMap['English'], weight: 1 },
    { id: langMap['Kannada'], weight: 0.5 },
    { id: langMap['Telugu'], weight: 0.5 },
  ].filter(l => l.id);

  // Party: Thiruvananthapuram is traditionally Left leaning
  // CPI(M) ~30%, INC ~22%, BJP ~20%, CPI ~8%, IUML ~5%, Others ~15%
  const partyWeights = [
    { id: partyMap['CPI(M)'], weight: 30 },
    { id: partyMap['INC'], weight: 22 },
    { id: partyMap['BJP'], weight: 20 },
    { id: partyMap['CPI'], weight: 8 },
    { id: partyMap['IUML'], weight: 5 },
    { id: partyMap['Kerala Congress (M)'], weight: 3 },
    { id: partyMap['NCP'], weight: 2 },
    { id: partyMap['Independent'], weight: 5 },
    { id: partyMap['JD(S)'], weight: 2 },
    { id: null, weight: 3 },  // no party
  ].filter(p => p.id || p.weight);

  // Political leaning
  const leaningWeights = [
    { val: 'LOYAL', weight: 30 },
    { val: 'SWING', weight: 35 },
    { val: 'OPPOSITION', weight: 15 },
    { val: 'UNKNOWN', weight: 20 },
  ];

  // Influence
  const influenceWeights = [
    { val: 'NONE', weight: 60 },
    { val: 'LOW', weight: 20 },
    { val: 'MEDIUM', weight: 12 },
    { val: 'HIGH', weight: 8 },
  ];

  // ===== STEP 3: Get all voters and update them =====
  const votersRes = await client.query(
    "SELECT id, name, gender, age FROM voters WHERE election_id=$1",
    [electionId]
  );
  const voters = votersRes.rows;
  console.log(`Updating ${voters.length} voters with full demographic data...`);

  const UPDATE_SQL = `UPDATE voters SET
    date_of_birth=$2, father_name=$3, relation_type=$4::"RelationType",
    house_number=$5, address=$6,
    religion_id=$7, caste_category_id=$8, caste_id=$9, language_id=$10,
    profession=$11, education=$12,
    party_id=$13, voter_category_id=$14,
    political_leaning=$15::"PoliticalLeaning", influence_level=$16::"InfluenceLevel",
    updated_at=NOW()
    WHERE id=$1`;

  let count = 0;
  await client.query('BEGIN');

  for (const voter of voters) {
    // Date of birth from age
    const age = voter.age || rand(18, 85);
    const birthYear = 2026 - age;
    const dob = new Date(birthYear, rand(0, 11), rand(1, 28));

    // Father/Husband name
    const fatherName = pick(FATHER_NAMES_M) + ' ' + pick(LAST_NAMES);
    const relationType = voter.gender === 'FEMALE' && age > 25 && Math.random() < 0.6 ? 'HUSBAND' : 'FATHER';

    // House & address
    const houseNumber = String(rand(1, 500)) + '/' + String(rand(1, 99));
    const houseName = pick(HOUSE_NAMES);
    const area = pick(AREAS);
    const fullAddress = `${houseName}, ${area}, Thiruvananthapuram, Kerala 695${String(rand(1, 99)).padStart(3, '0')}`;

    // Religion (weighted)
    const religion = pickWeighted(religionWeights);
    const religionId = religion.id;

    // Caste based on religion
    let casteInfo = null;
    if (religion.name === 'Hindu' && hinduCastes.length > 0) {
      const c = pickWeighted(hinduCastes);
      casteInfo = casteIdMap[c.name];
    } else if (religion.name === 'Christian' && christianCastes.length > 0) {
      const c = pickWeighted(christianCastes);
      casteInfo = casteIdMap[c.name];
    } else if (religion.name === 'Muslim' && muslimCastes.length > 0) {
      const c = pickWeighted(muslimCastes);
      casteInfo = casteIdMap[c.name];
    }
    const casteCategoryId = casteInfo ? casteInfo.catId : null;
    const casteId = casteInfo ? casteInfo.id : null;

    // Language
    const languageId = pickWeighted(languageWeights).id;

    // Profession based on age and gender
    let profession;
    if (age < 22) profession = 'Student';
    else if (age > 60) profession = Math.random() < 0.7 ? 'Retired' : pick(PROFESSIONS);
    else if (voter.gender === 'FEMALE' && Math.random() < 0.25) profession = 'Homemaker';
    else profession = pick(PROFESSIONS);

    // Education based on age
    let education;
    if (age < 25) education = pick(['Higher Secondary', 'Graduate', 'Post Graduate', 'Professional']);
    else if (age < 40) education = pick(['Graduate', 'Post Graduate', 'Professional', 'Higher Secondary', 'Diploma']);
    else if (age < 60) education = pick(['High School', 'Higher Secondary', 'Graduate', 'Middle School', 'Diploma']);
    else education = pick(['Primary', 'Middle School', 'High School', 'Illiterate', 'Higher Secondary']);

    // Party
    const partyPick = pickWeighted(partyWeights);
    const partyId = partyPick.id || null;

    // Voter category based on age
    let voterCategoryId;
    if (age >= 18 && age <= 19) voterCategoryId = voterCatMap['First-time Voter'] || voterCatMap['First Time Voter'];
    else if (age >= 18 && age <= 30) voterCategoryId = voterCatMap['Youth Voter'];
    else if (age >= 60) voterCategoryId = voterCatMap['Senior Citizen'];
    else voterCategoryId = voterCatMap['Regular Voter'];

    // Political leaning
    const leaning = pickWeighted(leaningWeights).val;
    const influence = pickWeighted(influenceWeights).val;

    await client.query(UPDATE_SQL, [
      voter.id,
      dob, fatherName, relationType,
      houseNumber, fullAddress,
      religionId, casteCategoryId, casteId, languageId,
      profession, education,
      partyId, voterCategoryId,
      leaning, influence,
    ]);

    count++;
    if (count % 2000 === 0) {
      await client.query('COMMIT');
      await client.query('BEGIN');
      console.log(`  Updated ${count}/${voters.length} voters...`);
    }
  }

  await client.query('COMMIT');
  console.log(`  Updated ${count}/${voters.length} voters.`);

  // ===== STEP 4: Update language voter counts =====
  console.log('\nUpdating language voter counts...');
  const langCounts = await client.query(
    "SELECT language_id, COUNT(*) as cnt FROM voters WHERE election_id=$1 AND language_id IS NOT NULL GROUP BY language_id",
    [electionId]
  );
  for (const lc of langCounts.rows) {
    await client.query("UPDATE languages SET voter_count=$1, updated_at=NOW() WHERE id=$2", [parseInt(lc.cnt), lc.language_id]);
  }

  // Print summary
  console.log('\n===== SUMMARY =====');
  const relSummary = await client.query(
    "SELECT r.religion_name, COUNT(v.id) as cnt FROM voters v JOIN religions r ON v.religion_id=r.id WHERE v.election_id=$1 GROUP BY r.religion_name ORDER BY cnt DESC",
    [electionId]
  );
  console.log('\nReligion distribution:');
  relSummary.rows.forEach(r => console.log(`  ${r.religion_name}: ${r.cnt}`));

  const casteSummary = await client.query(
    "SELECT c.caste_name, COUNT(v.id) as cnt FROM voters v JOIN castes c ON v.caste_id=c.id WHERE v.election_id=$1 GROUP BY c.caste_name ORDER BY cnt DESC LIMIT 10",
    [electionId]
  );
  console.log('\nTop castes:');
  casteSummary.rows.forEach(r => console.log(`  ${r.caste_name}: ${r.cnt}`));

  const partySummary = await client.query(
    "SELECT p.party_name, COUNT(v.id) as cnt FROM voters v JOIN parties p ON v.party_id=p.id WHERE v.election_id=$1 GROUP BY p.party_name ORDER BY cnt DESC",
    [electionId]
  );
  console.log('\nParty distribution:');
  partySummary.rows.forEach(r => console.log(`  ${r.party_name}: ${r.cnt}`));

  const langSummary = await client.query(
    "SELECT l.language_name, COUNT(v.id) as cnt FROM voters v JOIN languages l ON v.language_id=l.id WHERE v.election_id=$1 GROUP BY l.language_name ORDER BY cnt DESC",
    [electionId]
  );
  console.log('\nLanguage distribution:');
  langSummary.rows.forEach(r => console.log(`  ${r.language_name}: ${r.cnt}`));

  const dobCount = await client.query("SELECT COUNT(*) as cnt FROM voters WHERE election_id=$1 AND date_of_birth IS NOT NULL", [electionId]);
  console.log('\nVoters with DOB:', dobCount.rows[0].cnt);

  const addrCount = await client.query("SELECT COUNT(*) as cnt FROM voters WHERE election_id=$1 AND address IS NOT NULL", [electionId]);
  console.log('Voters with address:', addrCount.rows[0].cnt);

  console.log('\nDone!');
  await client.end();
}

run().catch(e => { console.error(e); client.end(); });
