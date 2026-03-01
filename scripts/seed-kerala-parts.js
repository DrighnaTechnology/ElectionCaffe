const { Client } = require('pg');

const DB = 'EC_nitish';
const client = new Client({ host: 'localhost', port: 5333, user: 'postgres', password: 'postgres', database: DB });

// Real Thiruvananthapuram Assembly Constituency (LAC 134) polling booths
// GPS coordinates are approximate based on actual ward locations
const WARD_COORDS = {
  'Titanium/Kochuveli':      { lat: 8.4976, lng: 76.9326 },
  'Veli':                     { lat: 8.4945, lng: 76.9290 },
  'Vettukadu':                { lat: 8.4919, lng: 76.9359 },
  'Sanghumukham':             { lat: 8.4998, lng: 76.9192 },
  'Palkulangara':             { lat: 8.5019, lng: 76.9388 },
  'Chackai':                  { lat: 8.5061, lng: 76.9287 },
  'Vallakkadavu':             { lat: 8.4886, lng: 76.9347 },
  'Perumthanni':              { lat: 8.4856, lng: 76.9381 },
  'Pettah':                   { lat: 8.4965, lng: 76.9489 },
  'Thampanoor':               { lat: 8.4896, lng: 76.9534 },
  'Rishimangalam':            { lat: 8.4923, lng: 76.9482 },
  'Secretariat':              { lat: 8.5024, lng: 76.9494 },
  'Palayam':                  { lat: 8.5062, lng: 76.9555 },
  'Vazhuthacaud':             { lat: 8.5033, lng: 76.9591 },
  'Jagathy':                  { lat: 8.4990, lng: 76.9612 },
  'Thycaud':                  { lat: 8.4951, lng: 76.9557 },
  'Valiyasala':               { lat: 8.4921, lng: 76.9515 },
  'Chenthitta':               { lat: 8.4862, lng: 76.9494 },
  'Chalai':                   { lat: 8.4832, lng: 76.9508 },
  'Karamana':                 { lat: 8.4797, lng: 76.9572 },
  'Nedumcaud':                { lat: 8.4759, lng: 76.9567 },
  'Manacaud':                 { lat: 8.4706, lng: 76.9519 },
  'Sreevaraham':              { lat: 8.4697, lng: 76.9471 },
  'Puthen Street':            { lat: 8.4799, lng: 76.9462 },
  'Valiyathura':              { lat: 8.4799, lng: 76.9329 },
  'Beemapalli':               { lat: 8.4730, lng: 76.9310 },
  'Manikyavilakam':           { lat: 8.4688, lng: 76.9334 },
  'Poonthura':                { lat: 8.4631, lng: 76.9293 },
  'Fort':                     { lat: 8.4889, lng: 76.9441 },
  'Sreekandeswaram':          { lat: 8.4926, lng: 76.9453 },
  'Kuryathi':                 { lat: 8.4673, lng: 76.9467 },
  'Attakulangara':            { lat: 8.4841, lng: 76.9487 },
};

// Small jitter to differentiate booths in same school
function jitter(base, i) {
  return base + (Math.random() - 0.5) * 0.002 + (i % 5) * 0.0003;
}

// Real booth data from Thiruvananthapuram constituency
const booths = [
  { n: 1, name: "St. Joseph Lower Primary School Kochuveli", ward: "Titanium/Kochuveli", type: "URBAN" },
  { n: 2, name: "St. Joseph Lower Primary School Kochuveli", ward: "Titanium/Kochuveli", type: "URBAN" },
  { n: 3, name: "St. Joseph Lower Primary School Kochuveli", ward: "Veli", type: "URBAN" },
  { n: 4, name: "St. Joseph Lower Primary School Kochuveli", ward: "Titanium/Kochuveli", type: "URBAN" },
  { n: 5, name: "St. Mary's High School Vettukadu", ward: "Vettukadu", type: "URBAN" },
  { n: 6, name: "St. Mary's High School Vettukadu", ward: "Vettukadu", type: "URBAN" },
  { n: 7, name: "St. Mary's High School Vettukadu", ward: "Vettukadu", type: "URBAN" },
  { n: 8, name: "St. Mary's High School Vettukadu", ward: "Vettukadu", type: "URBAN" },
  { n: 9, name: "St. Mary's High School Vettukadu", ward: "Veli", type: "URBAN" },
  { n: 10, name: "St. Mary's High School Vettukadu", ward: "Veli", type: "URBAN" },
  { n: 11, name: "Sanghumukham Lower Primary School", ward: "Sanghumukham", type: "URBAN" },
  { n: 12, name: "Sanghumukham Lower Primary School", ward: "Sanghumukham", type: "URBAN" },
  { n: 13, name: "Sanghumukham Lower Primary School", ward: "Sanghumukham", type: "URBAN" },
  { n: 14, name: "NSS High School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 15, name: "Govt. Upper Primary School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 16, name: "Govt. Upper Primary School Chackai", ward: "Chackai", type: "URBAN" },
  { n: 17, name: "Govt. Upper Primary School Chackai", ward: "Chackai", type: "URBAN" },
  { n: 18, name: "Govt. Upper Primary School Chackai", ward: "Chackai", type: "URBAN" },
  { n: 19, name: "Govt. Upper Primary School Chackai", ward: "Chackai", type: "URBAN" },
  { n: 20, name: "St. Roches Convent Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 21, name: "St. Roches Convent Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 22, name: "St. Roches Convent High School Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 23, name: "St. Roches Convent High School Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 24, name: "St. Roches Convent High School Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 25, name: "Jama'ath Lower Primary School Vallakkadavu", ward: "Vallakkadavu", type: "URBAN" },
  { n: 26, name: "Jama'ath Lower Primary School Vallakkadavu", ward: "Vallakkadavu", type: "URBAN" },
  { n: 27, name: "St. Roches Convent Sanghumukham", ward: "Sanghumukham", type: "URBAN" },
  { n: 28, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 29, name: "Govt. Upper Primary School Chackai", ward: "Chackai", type: "URBAN" },
  { n: 30, name: "Govt. Upper Primary School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 31, name: "Govt. Upper Primary School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 32, name: "NSS High School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 33, name: "NSS High School Palkulangara", ward: "Palkulangara", type: "URBAN" },
  { n: 34, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 35, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 36, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 37, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 38, name: "Govt. Upper Primary School Eanchayckal", ward: "Perumthanni", type: "URBAN" },
  { n: 39, name: "St. Ann's LPS Pallimukku", ward: "Pettah", type: "URBAN" },
  { n: 40, name: "St. Ann's LPS Pallimukku", ward: "Pettah", type: "URBAN" },
  { n: 41, name: "Govt. Boys High School Pettah", ward: "Pettah", type: "URBAN" },
  { n: 42, name: "St. Ann's LPS Pallimukku", ward: "Pettah", type: "URBAN" },
  { n: 43, name: "S.M.V.H.S.S Thiruvananthapuram", ward: "Thampanoor", type: "URBAN" },
  { n: 44, name: "Govt. Girls High School Vanchiyoor", ward: "Thampanoor", type: "URBAN" },
  { n: 45, name: "Sree Chithira Thirunal Grandasala", ward: "Rishimangalam", type: "URBAN" },
  { n: 46, name: "Sree Chithira Thirunal Grandasala", ward: "Rishimangalam", type: "URBAN" },
  { n: 47, name: "Govt. Boys High School Pettah", ward: "Pettah", type: "URBAN" },
  { n: 48, name: "St. Joseph High School TVM", ward: "Rishimangalam", type: "URBAN" },
  { n: 49, name: "St. Joseph High School TVM", ward: "Rishimangalam", type: "URBAN" },
  { n: 50, name: "St. Joseph High School TVM", ward: "Rishimangalam", type: "URBAN" },
  { n: 51, name: "Sports Council Office TVPM", ward: "Secretariat", type: "URBAN" },
  { n: 52, name: "Sports Council Office TVPM", ward: "Secretariat", type: "URBAN" },
  { n: 53, name: "Sanskrit College Thiruvananthapuram", ward: "Palayam", type: "URBAN" },
  { n: 54, name: "Sanskrit College Thiruvananthapuram", ward: "Palayam", type: "URBAN" },
  { n: 55, name: "College of Fine Arts", ward: "Palayam", type: "URBAN" },
  { n: 56, name: "Crush Building (D.E.O Office)", ward: "Secretariat", type: "URBAN" },
  { n: 57, name: "Govt. UPS Thampanoor", ward: "Thampanoor", type: "URBAN" },
  { n: 58, name: "S.M.V.H.S.S Thiruvananthapuram", ward: "Thampanoor", type: "URBAN" },
  { n: 59, name: "Girls Mission School Fort", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 60, name: "Girls Mission School Fort", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 61, name: "Fort High School TVM", ward: "Fort", type: "URBAN" },
  { n: 62, name: "Govt. Fort Upper Primary School", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 63, name: "Sanskrit High School Fort", ward: "Fort", type: "URBAN" },
  { n: 64, name: "Govt. Fort UPS TVM", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 65, name: "Sanskrit High School Fort", ward: "Fort", type: "URBAN" },
  { n: 66, name: "Govt. Fort Upper Primary School", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 67, name: "Govt. Fort UPS TVM", ward: "Sreekandeswaram", type: "URBAN" },
  { n: 68, name: "Fort High School TVM", ward: "Fort", type: "URBAN" },
  { n: 69, name: "Sathyan Smaraka Hall", ward: "Palayam", type: "URBAN" },
  { n: 70, name: "Sathyan Smaraka Hall", ward: "Palayam", type: "URBAN" },
  { n: 71, name: "Govt. Cotton Hill MGHSS", ward: "Palayam", type: "URBAN" },
  { n: 72, name: "Govt. Cotton Hill MGHSS", ward: "Vazhuthacaud", type: "URBAN" },
  { n: 73, name: "Govt. Cotton Hill MGHSS", ward: "Vazhuthacaud", type: "URBAN" },
  { n: 74, name: "Govt. Cotton Hill MGHSS", ward: "Vazhuthacaud", type: "URBAN" },
  { n: 75, name: "Govt. Model HS Thiruvananthapuram", ward: "Secretariat", type: "URBAN" },
  { n: 76, name: "Govt. Model BHSS Thiruvananthapuram", ward: "Secretariat", type: "URBAN" },
  { n: 77, name: "Ulloor Smaraka Reading Room", ward: "Jagathy", type: "URBAN" },
  { n: 78, name: "Govt. GHS Jagathy", ward: "Jagathy", type: "URBAN" },
  { n: 79, name: "Govt. GHS Jagathy", ward: "Jagathy", type: "URBAN" },
  { n: 80, name: "Govt. GHS Jagathy", ward: "Jagathy", type: "URBAN" },
  { n: 81, name: "People's Reading Room Kannettumukku", ward: "Jagathy", type: "URBAN" },
  { n: 82, name: "Govt. Model BHSS Thiruvananthapuram", ward: "Secretariat", type: "URBAN" },
  { n: 83, name: "Govt. LPS Mettukada", ward: "Thycaud", type: "URBAN" },
  { n: 84, name: "Govt. Model HS LPS Thiruvananthapuram", ward: "Thycaud", type: "URBAN" },
  { n: 85, name: "Govt. Model HS LPS Thiruvananthapuram", ward: "Thycaud", type: "URBAN" },
  { n: 86, name: "Govt. Model HS LPS Thiruvananthapuram", ward: "Thycaud", type: "URBAN" },
  { n: 87, name: "Govt. Model HS LPS Thiruvananthapuram", ward: "Thycaud", type: "URBAN" },
  { n: 88, name: "Sree Swathi Thirunal Sangeetha Academy", ward: "Thampanoor", type: "URBAN" },
  { n: 89, name: "Sree Swathi Thirunal Sangeetha Academy", ward: "Thampanoor", type: "URBAN" },
  { n: 90, name: "Govt. B.H.S Chalai", ward: "Valiyasala", type: "URBAN" },
  { n: 91, name: "Govt. B.H.S Chalai", ward: "Valiyasala", type: "URBAN" },
  { n: 92, name: "Thamizh HSS Chalai", ward: "Chenthitta", type: "URBAN" },
  { n: 93, name: "Thamizh HSS Chalai", ward: "Chenthitta", type: "URBAN" },
  { n: 94, name: "Thamizh HSS Chalai", ward: "Chenthitta", type: "URBAN" },
  { n: 95, name: "Govt. B.H.S Chalai", ward: "Valiyasala", type: "URBAN" },
  { n: 96, name: "Thamizh Sangham Office Melarannoor", ward: "Valiyasala", type: "URBAN" },
  { n: 97, name: "Sree Vidyadiraja NSS Karayogam", ward: "Karamana", type: "URBAN" },
  { n: 98, name: "Poojapura Govt. Staff Quarters", ward: "Karamana", type: "URBAN" },
  { n: 99, name: "Poojapura Govt. Staff Quarters", ward: "Karamana", type: "URBAN" },
  { n: 100, name: "Chattambiswami NSS Karayoga Mandiram", ward: "Karamana", type: "URBAN" },
  { n: 101, name: "Kerala Water Authority Pumping Station", ward: "Chalai", type: "URBAN" },
  { n: 102, name: "Kerala Water Authority Pumping Station", ward: "Chalai", type: "URBAN" },
  { n: 103, name: "Central HS Attakulangara", ward: "Attakulangara", type: "URBAN" },
  { n: 104, name: "Sahodara Samajam NSS Karayogam", ward: "Nedumcaud", type: "URBAN" },
  { n: 105, name: "Central HS Attakulangara", ward: "Attakulangara", type: "URBAN" },
  { n: 106, name: "Central HS Attakulangara", ward: "Attakulangara", type: "URBAN" },
  { n: 107, name: "Central HS Attakulangara", ward: "Attakulangara", type: "URBAN" },
  { n: 108, name: "Govt. LPS Kuryathi", ward: "Kuryathi", type: "URBAN" },
  { n: 109, name: "Govt. LPS Kuryathi", ward: "Kuryathi", type: "URBAN" },
  { n: 110, name: "Govt. Upper Primary School Valiyathura", ward: "Valiyathura", type: "URBAN" },
  { n: 111, name: "Govt. Upper Primary School Valiyathura", ward: "Valiyathura", type: "URBAN" },
  { n: 112, name: "Govt. Upper Primary School Valiyathura", ward: "Valiyathura", type: "URBAN" },
  { n: 113, name: "St. Antony's Higher Secondary School", ward: "Beemapalli", type: "URBAN" },
  { n: 114, name: "St. Antony's Higher Secondary School", ward: "Beemapalli", type: "URBAN" },
  { n: 115, name: "St. Antony's HSS Valiyathura", ward: "Valiyathura", type: "URBAN" },
  { n: 116, name: "St. Antony's HSS Valiyathura", ward: "Vallakkadavu", type: "URBAN" },
  { n: 117, name: "St. Antony's HSS Valiyathura", ward: "Vallakkadavu", type: "URBAN" },
  { n: 118, name: "Sree Pattom Thanupilla M UPS", ward: "Puthen Street", type: "URBAN" },
  { n: 119, name: "Sree Pattom Thanupilla M UPS", ward: "Puthen Street", type: "URBAN" },
  { n: 120, name: "Sree Pattom Thanupilla M UPS", ward: "Puthen Street", type: "URBAN" },
  { n: 121, name: "Fort Upper Primary School Sathram", ward: "Puthen Street", type: "URBAN" },
  { n: 122, name: "Fort Upper Primary School Sathram", ward: "Fort", type: "URBAN" },
  { n: 123, name: "Fort Upper Primary School Sathram", ward: "Puthen Street", type: "URBAN" },
  { n: 124, name: "Ponnara Sreedhar Memorial UPS", ward: "Sreevaraham", type: "URBAN" },
  { n: 125, name: "Govt. G.H.S.S Manacaud", ward: "Manacaud", type: "URBAN" },
  { n: 126, name: "Ponnara Sreedhar Memorial UPS", ward: "Sreevaraham", type: "URBAN" },
  { n: 127, name: "Ponnara Sreedhar Memorial UPS", ward: "Sreevaraham", type: "URBAN" },
  { n: 128, name: "Govt. Girls Higher Secondary School Manacaud", ward: "Manacaud", type: "URBAN" },
  { n: 129, name: "Govt. Girls Higher Secondary School Manacaud", ward: "Manacaud", type: "URBAN" },
  { n: 130, name: "Ponnara Sreedhar Memorial UPS", ward: "Sreevaraham", type: "URBAN" },
  { n: 131, name: "Sree Pattom Thanupilla M UPS", ward: "Sreevaraham", type: "URBAN" },
  { n: 132, name: "Govt. Upper Primary School Beemapalli", ward: "Beemapalli", type: "URBAN" },
  { n: 133, name: "Govt. Upper Primary School Beemapalli", ward: "Beemapalli", type: "URBAN" },
  { n: 134, name: "Govt. Upper Primary School Beemapalli", ward: "Beemapalli", type: "URBAN" },
  { n: 135, name: "Govt. Upper Primary School Beemapalli", ward: "Beemapalli", type: "URBAN" },
  { n: 136, name: "Govt. Upper Primary School Beemapalli", ward: "Beemapalli", type: "URBAN" },
  { n: 137, name: "St. Philomina's Convent Girls HSS", ward: "Manikyavilakam", type: "URBAN" },
  { n: 138, name: "St. Philomina's Convent Girls HSS", ward: "Manikyavilakam", type: "URBAN" },
  { n: 139, name: "St. Philomina's Convent Girls HSS", ward: "Manikyavilakam", type: "URBAN" },
  { n: 140, name: "St. Philomina's Convent Girls HSS", ward: "Manikyavilakam", type: "URBAN" },
  { n: 141, name: "St. Philomina's Convent Girls HSS", ward: "Manikyavilakam", type: "URBAN" },
  { n: 142, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 143, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 144, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 145, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 146, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 147, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 148, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
  { n: 149, name: "St. Thomas Higher Secondary School", ward: "Poonthura", type: "URBAN" },
];

async function run() {
  await client.connect();

  // 1. Fix VulnerabilityType enum in this tenant DB
  console.log('Fixing VulnerabilityType enum...');
  try {
    // Update existing rows to NOT_ASSIGNED first
    await client.query(`UPDATE parts SET vulnerability = 'NOT_ASSIGNED' WHERE vulnerability NOT IN ('NOT_ASSIGNED')`);
    await client.query(`UPDATE booths SET vulnerability_status = 'NOT_ASSIGNED' WHERE vulnerability_status NOT IN ('NOT_ASSIGNED')`);

    // Drop and recreate enum
    await client.query(`ALTER TABLE parts ALTER COLUMN vulnerability DROP DEFAULT`);
    await client.query(`ALTER TABLE booths ALTER COLUMN vulnerability_status DROP DEFAULT`);
    await client.query(`ALTER TABLE parts ALTER COLUMN vulnerability TYPE text`);
    await client.query(`ALTER TABLE booths ALTER COLUMN vulnerability_status TYPE text`);
    await client.query(`DROP TYPE IF EXISTS "VulnerabilityType" CASCADE`);
    await client.query(`CREATE TYPE "VulnerabilityType" AS ENUM ('NOT_ASSIGNED', 'NORMAL', 'LOW', 'MEDIUM', 'HIGH')`);
    await client.query(`ALTER TABLE parts ALTER COLUMN vulnerability TYPE "VulnerabilityType" USING vulnerability::"VulnerabilityType"`);
    await client.query(`ALTER TABLE booths ALTER COLUMN vulnerability_status TYPE "VulnerabilityType" USING vulnerability_status::"VulnerabilityType"`);
    await client.query(`ALTER TABLE parts ALTER COLUMN vulnerability SET DEFAULT 'NOT_ASSIGNED'::"VulnerabilityType"`);
    await client.query(`ALTER TABLE booths ALTER COLUMN vulnerability_status SET DEFAULT 'NOT_ASSIGNED'::"VulnerabilityType"`);
    console.log('  Enum updated successfully');
  } catch (e) {
    console.log('  Enum update error (may already be correct):', e.message);
  }

  // 2. Get the election ID
  const electionRes = await client.query(`SELECT id FROM elections LIMIT 1`);
  if (electionRes.rows.length === 0) {
    console.error('No elections found!');
    await client.end();
    return;
  }
  const electionId = electionRes.rows[0].id;
  console.log('Election ID:', electionId);

  // 3. Delete existing parts (and cascade)
  console.log('Deleting existing parts...');
  await client.query(`DELETE FROM voters WHERE election_id = $1`, [electionId]);
  await client.query(`DELETE FROM sections WHERE election_id = $1`, [electionId]);
  await client.query(`DELETE FROM parts WHERE election_id = $1`, [electionId]);
  console.log('  Cleared existing data');

  // 4. Insert real Kerala parts
  console.log('Inserting 149 Thiruvananthapuram booths...');
  const vulnerabilities = ['NOT_ASSIGNED', 'NORMAL', 'LOW', 'MEDIUM', 'HIGH'];
  let inserted = 0;

  for (const booth of booths) {
    const ward = WARD_COORDS[booth.ward];
    if (!ward) {
      console.log(`  WARNING: No coords for ward "${booth.ward}", skipping booth ${booth.n}`);
      continue;
    }

    const lat = jitter(ward.lat, booth.n);
    const lng = jitter(ward.lng, booth.n);

    // Realistic voter counts: 600-1500 per booth
    const totalVoters = 600 + Math.floor(Math.random() * 900);
    const maleVoters = Math.floor(totalVoters * (0.44 + Math.random() * 0.08));
    const femaleVoters = totalVoters - maleVoters - Math.floor(Math.random() * 5);
    const otherVoters = totalVoters - maleVoters - femaleVoters;

    // Random vulnerability — mostly NORMAL/NOT_ASSIGNED, ~10% sensitive
    const vulnRand = Math.random();
    const vulnerability = vulnRand < 0.5 ? 'NOT_ASSIGNED' : vulnRand < 0.75 ? 'NORMAL' : vulnRand < 0.88 ? 'LOW' : vulnRand < 0.95 ? 'MEDIUM' : 'HIGH';

    await client.query(`
      INSERT INTO parts (id, election_id, part_number, booth_name, booth_name_local, part_type, address, latitude, longitude, total_voters, male_voters, female_voters, other_voters, vulnerability, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11, $12::"VulnerabilityType", NOW(), NOW())
    `, [
      electionId,
      booth.n,
      booth.name,
      booth.type,
      `Corp Ward, ${booth.ward}, Thiruvananthapuram`,
      lat,
      lng,
      totalVoters,
      maleVoters,
      femaleVoters,
      otherVoters,
      vulnerability,
    ]);
    inserted++;
  }

  console.log(`  Inserted ${inserted} parts`);

  // 5. Update election stats
  await client.query(`
    UPDATE elections SET total_parts = $1, total_booths = $1 WHERE id = $2
  `, [inserted, electionId]);

  // 6. Verify
  const count = await client.query(`SELECT COUNT(*) as cnt FROM parts WHERE election_id = $1`, [electionId]);
  console.log(`Verification: ${count.rows[0].cnt} parts in DB`);

  const sample = await client.query(`SELECT part_number, booth_name, latitude, longitude, vulnerability FROM parts WHERE election_id = $1 ORDER BY part_number LIMIT 5`, [electionId]);
  console.log('Sample data:');
  sample.rows.forEach(r => console.log(`  Part ${r.part_number}: ${r.booth_name} (${r.latitude}, ${r.longitude}) [${r.vulnerability}]`));

  await client.end();
  console.log('Done!');
}

run().catch(e => { console.error(e); client.end(); });
