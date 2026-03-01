/**
 * Seed script for tenant database EC_nitihdh01
 * Adds 50 records for every table with realistic Indian election data
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const TENANT_ID = '1cca10ba-58eb-4ca3-af6d-aaa61c43b515';
const DB_URL = 'postgresql://postgres:admin@localhost:5333/EC_nitihdh01';

// Indian names data
const firstNames = ['Rajesh','Amit','Sunil','Vijay','Rahul','Deepak','Anil','Manoj','Sanjay','Ajay','Ravi','Dinesh','Ramesh','Ashok','Vinod','Pradeep','Suresh','Mukesh','Rakesh','Yogesh','Priya','Sunita','Anita','Meena','Kavita','Neha','Pooja','Ritu','Geeta','Suman','Lakshmi','Sarita','Rekha','Nisha','Asha','Bharti','Seema','Kiran','Shanti','Rani','Mohan','Krishna','Gopal','Hari','Shankar','Ganesh','Naresh','Mahesh','Pawan','Lalit'];
const lastNames = ['Kumar','Singh','Sharma','Verma','Gupta','Yadav','Patel','Mishra','Chauhan','Jha','Pandey','Dubey','Tiwari','Srivastava','Rao','Reddy','Nair','Menon','Das','Roy','Thakur','Joshi','Saxena','Agrawal','Mehta','Shah','Desai','Patil','More','Pawar','Shinde','Kadam','Jadhav','Gaikwad','Kulkarni','Deshpande','Iyer','Pillai','Nambiar','Krishnan','Prasad','Rajan','Bose','Ghosh','Mukherjee','Banerjee','Chatterjee','Sen','Dutta','Sarkar'];
const districts = ['Patna','Gaya','Nalanda','Muzaffarpur','Bhagalpur','Darbhanga','Samastipur','Vaishali','Saran','Munger','Begusarai','Madhubani','Siwan','Purnia','Katihar','Aurangabad','Jehanabad','Arwal','Rohtas','Buxar'];
const states = ['Bihar'];
const constituency_names = ['Patna Sahib','Hajipur','Muzaffarpur','Darbhanga','Madhubani','Samastipur','Begusarai','Nalanda','Gaya','Aurangabad','Bhagalpur','Purnia','Katihar','Munger','Saran','Siwan','Vaishali','Jehanabad','Arwal','Buxar','Patna City','Bankipur','Kumhrar','Rajgir','Bihar Sharif','Barh','Mokama','Maner','Phulwari','Danapur','Digha','Kankarbagh','Kadamkuan','Sultanganj','Banka','Jamui','Lakhisarai','Sheikhpura','Nawada','Dehri','Sasaram','Bikramganj','Dinara','Karakat','Arrah','Shahpur','Jagdishpur','Chapra','Mairwa','Gopalganj'];
const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain'];
const casteCategories = [{name:'General',full:'General Category'},{name:'OBC',full:'Other Backward Classes'},{name:'SC',full:'Scheduled Caste'},{name:'ST',full:'Scheduled Tribe'},{name:'EWS',full:'Economically Weaker Section'}];
const castes = ['Rajput','Brahmin','Yadav','Kurmi','Koeri','Bhumihar','Kayastha','Vaishya','Paswan','Musahar','Chamar','Dusadh','Tharu','Santhal','Kharwar','Oraon','Munda','Teli','Kalwar','Sonar'];
const languages = ['Hindi','Urdu','Maithili','Bhojpuri','Magahi','Angika','Bajjika','English','Sanskrit','Bengali'];
const partyNames = [{name:'Bharatiya Janata Party',short:'BJP',color:'#FF6600'},{name:'Janata Dal (United)',short:'JDU',color:'#006600'},{name:'Rashtriya Janata Dal',short:'RJD',color:'#00FF00'},{name:'Indian National Congress',short:'INC',color:'#00BFFF'},{name:'Lok Janshakti Party',short:'LJP',color:'#800080'},{name:'All India Majlis-e-Ittehadul Muslimeen',short:'AIMIM',color:'#008000'},{name:'Communist Party of India',short:'CPI',color:'#FF0000'},{name:'Bahujan Samaj Party',short:'BSP',color:'#0000FF'},{name:'Hindustani Awam Morcha',short:'HAM',color:'#FFA500'},{name:'Vikassheel Insaan Party',short:'VIP',color:'#FFFF00'}];
const voterCategoryNames = ['New Voter','Senior Citizen','First Time Voter','NRI Voter','PWD Voter','Government Employee','Farmer','Business Owner','Student','Retired'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPhone() { return `${randInt(7,9)}${String(randInt(100000000,999999999)).padStart(9,'0')}`; }
function randDate(startYear=2024, endYear=2026) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString();
}
function randPastDate() { return randDate(2020, 2025); }

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to EC_nitihdh01');

  // ============ USERS (49 more, 1 admin already exists) ============
  console.log('Seeding users...');
  const userIds = [];
  const roles = ['CENTRAL_ADMIN','CONSTITUENCY_ADMIN','CAMPAIGN_MANAGER','COORDINATOR','SECTOR_OFFICER','BOOTH_INCHARGE','VOLUNTEER','AGENT','POLLING_AGENT','COUNTING_AGENT'];
  const passwordHash = await bcrypt.hash('User@123', 10);
  for (let i = 0; i < 49; i++) {
    const id = uuid();
    userIds.push(id);
    const fn = rand(firstNames); const ln = rand(lastNames);
    await client.query(`INSERT INTO users (id, tenant_id, first_name, last_name, email, mobile, password_hash, role, status, can_access_all_constituencies, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [id, TENANT_ID, fn, ln, `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@test.com`, randPhone(), passwordHash, rand(roles), 'ACTIVE', i < 5]);
  }
  // Get admin user id
  const adminRes = await client.query(`SELECT id FROM users WHERE role='CENTRAL_ADMIN' LIMIT 1`);
  if (adminRes.rows[0]) userIds.push(adminRes.rows[0].id);
  console.log(`  Created 49 users (total 50)`);

  // ============ CONSTITUENCIES ============
  console.log('Seeding constituencies...');
  const constituencyIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    constituencyIds.push(id);
    await client.query(`INSERT INTO constituencies (id, tenant_id, name, constituency_type, state, district, code, total_voters, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [id, TENANT_ID, constituency_names[i] || `Constituency-${i+1}`, rand(['ASSEMBLY','PARLIAMENT','LOCAL_BODY']), 'Bihar', rand(districts), `CON-${String(i+1).padStart(3,'0')}`, randInt(50000,200000), true]);
  }
  console.log(`  Created 50 constituencies`);

  // ============ ELECTIONS ============
  console.log('Seeding elections...');
  const electionIds = [];
  const electionTypes = ['ASSEMBLY','PARLIAMENT','LOCAL_BODY','PANCHAYAT','MUNICIPAL','BY_ELECTION'];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    electionIds.push(id);
    const cid = constituencyIds[i % constituencyIds.length];
    const cname = constituency_names[i % constituency_names.length] || `Constituency-${i+1}`;
    await client.query(`INSERT INTO elections (id, tenant_id, constituency_id, name, election_type, state, constituency, district, status, total_voters, total_male_voters, total_female_voters, total_other_voters, total_booths, total_parts, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
      [id, TENANT_ID, cid, `${cname} ${rand(electionTypes)} Election 2026`, rand(electionTypes), 'Bihar', cname, rand(districts), rand(['DRAFT','ACTIVE','COMPLETED']), randInt(50000,150000), randInt(25000,80000), randInt(20000,70000), randInt(100,500), randInt(50,300), randInt(10,50)]);
  }
  // Use first election as primary
  const primaryElection = electionIds[0];
  console.log(`  Created 50 elections`);

  // ============ PARTIES ============
  console.log('Seeding parties...');
  const partyIds = [];
  for (let i = 0; i < 10; i++) {
    const id = uuid();
    partyIds.push(id);
    const p = partyNames[i];
    await client.query(`INSERT INTO parties (id, election_id, party_name, party_short_name, party_full_name, party_color, display_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [id, primaryElection, p.name, p.short, p.name, p.color, i, true]);
  }
  // Add more parties for other elections
  for (let i = 10; i < 50; i++) {
    const id = uuid();
    partyIds.push(id);
    await client.query(`INSERT INTO parties (id, election_id, party_name, party_short_name, party_color, display_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [id, electionIds[i % electionIds.length], `Independent-${i}`, `IND${i}`, `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`, i, true]);
  }
  console.log(`  Created 50 parties`);

  // ============ CANDIDATES ============
  console.log('Seeding candidates...');
  const candidateIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    candidateIds.push(id);
    await client.query(`INSERT INTO candidates (id, election_id, party_id, name, age, gender, education, profession, is_our_candidate, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [id, electionIds[i % electionIds.length], partyIds[i % partyIds.length], `${rand(firstNames)} ${rand(lastNames)}`, randInt(25,70), rand(['MALE','FEMALE','OTHER']), rand(['Graduate','Post Graduate','PhD','12th Pass','10th Pass']), rand(['Politician','Businessman','Lawyer','Teacher','Social Worker','Farmer']), i < 10, true]);
  }
  console.log(`  Created 50 candidates`);

  // ============ PARTS ============
  console.log('Seeding parts...');
  const partIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    partIds.push(id);
    await client.query(`INSERT INTO parts (id, election_id, part_number, booth_name, part_type, address, pincode, total_voters, total_sections, male_voters, female_voters, other_voters, is_vulnerable, vulnerability, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
      [id, primaryElection, i+1, `Polling Station ${i+1} - ${rand(districts)}`, rand(['URBAN','RURAL','SEMI_URBAN']), `Ward ${randInt(1,30)}, ${rand(districts)}`, `8${randInt(10,99)}0${randInt(10,99)}`, randInt(500,2000), randInt(1,5), randInt(250,1000), randInt(200,900), randInt(5,50), Math.random()>0.7, rand(['NOT_ASSIGNED','NONE','CRITICAL','SENSITIVE','HYPERSENSITIVE'])]);
  }
  console.log(`  Created 50 parts`);

  // ============ SECTIONS ============
  console.log('Seeding sections...');
  const sectionIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    sectionIds.push(id);
    await client.query(`INSERT INTO sections (id, election_id, part_id, section_number, section_name, total_voters, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [id, primaryElection, partIds[i % partIds.length], i+1, `Section ${i+1}`, randInt(100,500), true]);
  }
  console.log(`  Created 50 sections`);

  // ============ BOOTHS ============
  console.log('Seeding booths...');
  const boothIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    boothIds.push(id);
    await client.query(`INSERT INTO booths (id, election_id, part_id, booth_number, booth_name, address, total_voters, male_voters, female_voters, other_voters, vulnerability_status, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
      [id, primaryElection, partIds[i % partIds.length], `B${String(i+1).padStart(3,'0')}`, `Booth ${i+1} - ${rand(districts)}`, `${rand(districts)}, Bihar`, randInt(300,1500), randInt(150,750), randInt(130,700), randInt(5,30), rand(['NONE','CRITICAL','SENSITIVE','HYPERSENSITIVE']), true]);
  }
  console.log(`  Created 50 booths`);

  // ============ RELIGIONS ============
  console.log('Seeding religions...');
  const religionIds = [];
  for (let i = 0; i < religions.length; i++) {
    const id = uuid();
    religionIds.push(id);
    await client.query(`INSERT INTO religions (id, election_id, religion_name, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [id, primaryElection, religions[i], i, true]);
  }
  console.log(`  Created ${religions.length} religions`);

  // ============ CASTE CATEGORIES ============
  console.log('Seeding caste categories...');
  const casteCatIds = [];
  for (let i = 0; i < casteCategories.length; i++) {
    const id = uuid();
    casteCatIds.push(id);
    await client.query(`INSERT INTO caste_categories (id, election_id, category_name, category_full_name, reservation_percent, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, primaryElection, casteCategories[i].name, casteCategories[i].full, [0,27,15,7.5,10][i], i, true]);
  }
  console.log(`  Created ${casteCategories.length} caste categories`);

  // ============ CASTES ============
  console.log('Seeding castes...');
  const casteIds = [];
  for (let i = 0; i < castes.length; i++) {
    const id = uuid();
    casteIds.push(id);
    await client.query(`INSERT INTO castes (id, election_id, caste_category_id, religion_id, caste_name, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, primaryElection, casteCatIds[i % casteCatIds.length], religionIds[i % religionIds.length], castes[i], i, true]);
  }
  console.log(`  Created ${castes.length} castes`);

  // ============ SUB CASTES ============
  console.log('Seeding sub castes...');
  let subCasteCount = 0;
  const directions = ['North','South','East','West','Central'];
  for (let i = 0; i < 50; i++) {
    try {
      const casteIdx = i % castes.length;
      const dirIdx = Math.floor(i / castes.length) % directions.length;
      await client.query(`INSERT INTO sub_castes (id, election_id, caste_id, sub_caste_name, voter_count, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [uuid(), primaryElection, casteIds[casteIdx], `${castes[casteIdx]} (${directions[dirIdx]}-${i})`, randInt(100,5000), i, true]);
      subCasteCount++;
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created ${subCasteCount} sub castes`);

  // ============ LANGUAGES ============
  console.log('Seeding languages...');
  const languageIds = [];
  for (let i = 0; i < languages.length; i++) {
    const id = uuid();
    languageIds.push(id);
    await client.query(`INSERT INTO languages (id, election_id, language_name, language_code, writing_direction, voter_count, display_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [id, primaryElection, languages[i], languages[i].substring(0,2).toLowerCase(), 'ltr', randInt(5000,50000), i, true]);
  }
  console.log(`  Created ${languages.length} languages`);

  // ============ VOTER CATEGORIES ============
  console.log('Seeding voter categories...');
  const voterCatIds = [];
  for (let i = 0; i < voterCategoryNames.length; i++) {
    const id = uuid();
    voterCatIds.push(id);
    await client.query(`INSERT INTO voter_categories (id, election_id, category_name, category_description, category_color, display_order, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, primaryElection, voterCategoryNames[i], `Category for ${voterCategoryNames[i]}`, `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`, i, true]);
  }
  console.log(`  Created ${voterCategoryNames.length} voter categories`);

  // ============ VOTER SCHEMES ============
  console.log('Seeding voter schemes...');
  const schemeNames = ['PM Kisan','PM Awas Yojana','Ujjwala Yojana','Jan Dhan','Ayushman Bharat','Swachh Bharat','Mudra Yojana','Fasal Bima','Kisan Credit Card','Skill India','Digital India','Make in India','Startup India','Stand Up India','MGNREGA','Mid Day Meal','Beti Bachao','Sukanya Samriddhi','Atal Pension','PM Vishwakarma','Lakhpati Didi','PM Surya Ghar','Jal Jeevan','Poshan Abhiyan','One Nation One Ration','Garib Kalyan','PM Gatishakti','Amrit Sarovar','SVAMITVA','Green Energy','Namami Gange','Smart City','AMRUT','Deendayal Upadhyaya','Antyodaya Anna','National Rural Health','Rashtriya Swasthya','Integrated Child','Sarva Shiksha','Rashtriya Madhyamik','National Apprentice','PM CARES','PM Relief Fund','Electoral Bond','Voter Helpline','Digital Voter ID','Online Registration','Voter Verification','Special Voters List','Armed Forces Voters','Overseas Voters'];
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO voter_schemes (id, election_id, name, code, description, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [uuid(), primaryElection, schemeNames[i], `SCH-${String(i+1).padStart(3,'0')}`, `Government scheme: ${schemeNames[i]}`, i]);
  }
  console.log(`  Created 50 voter schemes`);

  // ============ FAMILIES ============
  console.log('Seeding families...');
  const familyIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    familyIds.push(id);
    const ln = rand(lastNames);
    await client.query(`INSERT INTO families (id, election_id, part_id, family_name, head_name, address, house_no, mobile, total_members, party_affiliation, support_level, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [id, primaryElection, partIds[i % partIds.length], `${ln} Family`, `${rand(firstNames)} ${ln}`, `House ${randInt(1,500)}, Ward ${randInt(1,30)}, ${rand(districts)}`, `H-${randInt(1,500)}`, randPhone(), randInt(2,12), rand(partyNames).short, randInt(1,5)]);
  }
  console.log(`  Created 50 families`);

  // ============ VOTERS (50) ============
  console.log('Seeding voters...');
  const voterIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    voterIds.push(id);
    const fn = rand(firstNames); const ln = rand(lastNames);
    const gender = Math.random() > 0.5 ? 'MALE' : (Math.random() > 0.2 ? 'FEMALE' : 'OTHER');
    await client.query(`INSERT INTO voters (id, election_id, part_id, section_id, booth_id, family_id, epic_number, sl_number, name, father_name, gender, age, mobile, house_number, address, religion_id, caste_category_id, caste_id, language_id, party_id, voter_category_id, political_leaning, influence_level, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW(),NOW())`,
      [id, primaryElection, partIds[i % partIds.length], sectionIds[i % sectionIds.length], boothIds[i % boothIds.length], familyIds[i % familyIds.length],
       `BIH/${String(randInt(100,999))}/${String(randInt(100000,999999))}`, i+1, `${fn} ${ln}`, `${rand(firstNames)} ${ln}`,
       gender, randInt(18,85), randPhone(), `H-${randInt(1,500)}`, `Ward ${randInt(1,30)}, ${rand(districts)}, Bihar`,
       religionIds[i % religionIds.length], casteCatIds[i % casteCatIds.length], casteIds[i % casteIds.length], languageIds[i % languageIds.length],
       partyIds[i % partyIds.length], voterCatIds[i % voterCatIds.length], rand(['LOYAL','SWING','OPPOSITION','UNKNOWN']), rand(['HIGH','MEDIUM','LOW','NONE'])]);
  }
  console.log(`  Created 50 voters`);

  // ============ SCHEMES ============
  console.log('Seeding schemes...');
  const providers = ['CENTRAL_GOVT','STATE_GOVT','LOCAL_GOVT','NGO','PRIVATE'];
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO schemes (id, election_id, scheme_name, scheme_short_name, scheme_description, scheme_by, scheme_value, value_type, beneficiary_count, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], `Scheme ${i+1}: ${rand(['Housing','Education','Health','Agriculture','Employment','Water','Energy','Transport','Digital','Women'])}`, `S${i+1}`, `Government scheme for welfare`, rand(providers), randInt(1000,100000), rand(['ONE_TIME','MONTHLY','YEARLY','PER_UNIT']), randInt(100,50000), true]);
  }
  console.log(`  Created 50 schemes`);

  // ============ CADRES ============
  console.log('Seeding cadres...');
  const cadreIds = [];
  const cadreUsers = userIds.slice(0, 50);
  for (let i = 0; i < Math.min(50, cadreUsers.length); i++) {
    const id = uuid();
    cadreIds.push(id);
    try {
      await client.query(`INSERT INTO cadres (id, user_id, election_id, cadre_type, designation, zone, sector, ward, target_voters, is_active, joined_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW(),NOW())`,
        [id, cadreUsers[i], primaryElection, rand(['COORDINATOR','SECTOR_OFFICER','BOOTH_INCHARGE','VOLUNTEER','AGENT']), rand(['Zone Commander','Sector Head','Booth Captain','Field Worker']), `Zone-${randInt(1,10)}`, `Sector-${randInt(1,20)}`, `Ward-${randInt(1,30)}`, randInt(100,2000), true]);
    } catch(e) { /* skip duplicate userId */ }
  }
  console.log(`  Created ${cadreIds.length} cadres`);

  // ============ CADRE ASSIGNMENTS ============
  console.log('Seeding cadre assignments...');
  if (cadreIds.length > 0) {
    for (let i = 0; i < 50; i++) {
      try {
        await client.query(`INSERT INTO cadre_assignments (id, cadre_id, assignment_type, entity_id, entity_type, start_date, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [uuid(), cadreIds[i % cadreIds.length], rand(['BOOTH','PART','SECTION','WARD']), uuid(), rand(['booth','part','section']), randPastDate(), true]);
      } catch(e) { /* skip */ }
    }
  }
  console.log(`  Created cadre assignments`);

  // ============ CADRE LOCATIONS ============
  console.log('Seeding cadre locations...');
  if (cadreIds.length > 0) {
    for (let i = 0; i < 50; i++) {
      try {
        await client.query(`INSERT INTO cadre_locations (id, cadre_id, latitude, longitude, accuracy, timestamp, created_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
          [uuid(), cadreIds[i % cadreIds.length], 25.5 + Math.random() * 2, 84.5 + Math.random() * 2, randInt(5,50)]);
      } catch(e) { /* skip */ }
    }
  }
  console.log(`  Created cadre locations`);

  // ============ SURVEYS ============
  console.log('Seeding surveys...');
  const surveyIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    surveyIds.push(id);
    await client.query(`INSERT INTO surveys (id, election_id, title, description, questions, is_active, total_responses, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [id, electionIds[i % electionIds.length], `Survey ${i+1}: ${rand(['Voter Satisfaction','Development Issues','Candidate Rating','Infrastructure','Healthcare','Education Quality','Safety Concerns','Employment Status','Water Supply','Road Conditions'])}`, `Survey to measure ${rand(['voter opinion','public sentiment','policy impact'])}`, JSON.stringify([{q:'Rate 1-5',type:'rating'},{q:'Comments',type:'text'}]), true, randInt(0,500)]);
  }
  console.log(`  Created 50 surveys`);

  // ============ SURVEY RESPONSES ============
  console.log('Seeding survey responses...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO survey_responses (id, survey_id, voter_id, answers, submitted_at, created_at) VALUES ($1,$2,$3,$4,NOW(),NOW())`,
      [uuid(), surveyIds[i % surveyIds.length], voterIds[i % voterIds.length], JSON.stringify({rating: randInt(1,5), comment: 'Sample response'})]);
  }
  console.log(`  Created 50 survey responses`);

  // ============ VOTING HISTORY ============
  console.log('Seeding voting histories...');
  const historyIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    historyIds.push(id);
    const year = 2015 + (i % 10);
    await client.query(`INSERT INTO voting_histories (id, tenant_id, election_year, election_type, election_name, state, constituency, total_voters, votes_polled, turnout_percent, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [id, TENANT_ID, year, rand(['ASSEMBLY','PARLIAMENT','LOCAL_BODY']), `${constituency_names[i % constituency_names.length]} ${year}`, 'Bihar', constituency_names[i % constituency_names.length], randInt(100000,300000), randInt(50000,200000), randInt(45,75)]);
  }
  console.log(`  Created 50 voting histories`);

  // ============ VOTER VOTING HISTORY ============
  console.log('Seeding voter voting histories...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO voter_voting_histories (id, voter_id, history_id, has_voted, voted_for, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [uuid(), voterIds[i % voterIds.length], historyIds[i % historyIds.length], Math.random() > 0.3, rand(partyNames).short]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created voter voting histories`);

  // ============ BOOTH AGENTS ============
  console.log('Seeding booth agents...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO booth_agents (id, election_id, booth_id, name, mobile, agent_type, is_active, assigned_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),NOW())`,
      [uuid(), primaryElection, boothIds[i % boothIds.length], `${rand(firstNames)} ${rand(lastNames)}`, randPhone(), rand(['POLLING_AGENT','COUNTING_AGENT','OBSERVER']), true]);
  }
  console.log(`  Created 50 booth agents`);

  // ============ POLL DAY VOTES ============
  console.log('Seeding poll day votes...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO poll_day_votes (id, election_id, booth_id, epic_no, serial_no, has_voted, voted_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())`,
        [uuid(), primaryElection, boothIds[i % boothIds.length], `EPIC${String(i).padStart(6,'0')}`, i+1, Math.random() > 0.3]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created poll day votes`);

  // ============ FEEDBACK ISSUES ============
  console.log('Seeding feedback issues...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO feedback_issues (id, tenant_id, voter_id, issue_type, category, title, description, priority, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [uuid(), TENANT_ID, voterIds[i % voterIds.length], rand(['complaint','suggestion','query','appreciation']), rand(['infrastructure','governance','health','education','water','sanitation']), `Issue ${i+1}: ${rand(['Road repair needed','Water supply irregular','Street light broken','Drainage blocked','School needs repair'])}`, 'Detailed description of the issue', rand(['low','medium','high','critical']), rand(['open','in_progress','resolved','closed'])]);
  }
  console.log(`  Created 50 feedback issues`);

  // ============ REPORTS ============
  console.log('Seeding reports...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO reports (id, election_id, report_type, title, status, generated_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], rand(['voter_list','booth_wise','caste_wise','party_wise','turnout','summary']), `Report ${i+1}: ${rand(['Voter Analysis','Booth Report','Caste Distribution','Party Strength','Turnout Analysis'])}`, rand(['pending','completed','failed'])]);
  }
  console.log(`  Created 50 reports`);

  // ============ AI ANALYTICS RESULTS ============
  console.log('Seeding AI analytics results...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO ai_analytics_results (id, election_id, analysis_type, results, confidence, model_used, credits_used, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], rand(['sentiment','prediction','clustering','anomaly','trend']), JSON.stringify({score: Math.random().toFixed(2)}), Math.random(), rand(['gpt-4','claude-3','gemini-pro']), randInt(1,50), rand(['pending','completed','failed'])]);
  }
  console.log(`  Created 50 AI analytics results`);

  // ============ TENANT CONFIGS ============
  console.log('Seeding tenant config...');
  try {
    await client.query(`INSERT INTO tenant_configs (id, tenant_id, config_key, config_value, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())`,
      [uuid(), TENANT_ID, 'app_settings', JSON.stringify({theme:'light',language:'hi',timezone:'Asia/Kolkata',currency:'INR'})]);
  } catch(e) { /* already exists */ }
  console.log(`  Created tenant config`);

  // ============ VOTER SLIP TEMPLATES ============
  console.log('Seeding voter slip templates...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO voter_slip_templates (id, election_id, template_name, template_type, template_data, is_default, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], `Template ${i+1}`, rand(['standard','compact','detailed','photo','minimal']), JSON.stringify({layout:'standard',fields:['name','epic','booth','part']}), i===0, true]);
  }
  console.log(`  Created 50 voter slip templates`);

  // ============ APP BANNERS ============
  console.log('Seeding app banners...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO app_banners (id, election_id, title, image_url, link_url, position, sort_order, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], `Banner ${i+1}: ${rand(['Vote for Change','Development First','Unity in Diversity','Progress for All'])}`, `/banners/banner_${i+1}.jpg`, null, rand(['top','bottom','sidebar']), i, true]);
  }
  console.log(`  Created 50 app banners`);

  // ============ EC INTEGRATIONS ============
  console.log('Seeding EC integrations...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO ec_integrations (id, election_id, integration_type, config, sync_status, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], rand(['voter_roll','booth_data','candidate_data','result_data','turnout_data']), JSON.stringify({url:'https://eci.gov.in',api_key:'test'}), rand(['synced','pending','failed']), true]);
  }
  console.log(`  Created 50 EC integrations`);

  // ============ EC SYNC LOGS ============
  console.log('Seeding EC sync logs...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO ec_sync_logs (id, election_id, sync_type, status, records_processed, records_failed, started_at, completed_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())`,
      [uuid(), electionIds[i % electionIds.length], rand(['full_sync','incremental','voter_update','booth_update']), rand(['completed','failed','in_progress']), randInt(100,10000), randInt(0,50)]);
  }
  console.log(`  Created 50 EC sync logs`);

  // ============ DATA CAFFE EMBEDS ============
  console.log('Seeding DataCaffe embeds...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO data_caffe_embeds (id, tenant_id, embed_type, title, config, access_key, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [uuid(), TENANT_ID, rand(['chart','table','map','dashboard','widget']), `Embed ${i+1}: ${rand(['Voter Stats','Booth Map','Turnout Chart','Party Distribution'])}`, JSON.stringify({type:'chart',data:'voters'}), `key_${uuid().substring(0,12)}`, true]);
  }
  console.log(`  Created 50 DataCaffe embeds`);

  // ============ AUDIT LOGS ============
  console.log('Seeding audit logs...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, ip_address, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [uuid(), TENANT_ID, userIds[i % userIds.length], rand(['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT']), rand(['voter','election','booth','part','cadre','survey','report']), uuid(), `192.168.${randInt(1,255)}.${randInt(1,255)}`]);
  }
  console.log(`  Created 50 audit logs`);

  // ============ NB PARSED NEWS ============
  console.log('Seeding NB parsed news...');
  const newsIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    newsIds.push(id);
    await client.query(`INSERT INTO nb_parsed_news (id, tenant_id, title, content, summary, source, language, category, sentiment, relevance_score, is_processed, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [id, TENANT_ID, `News ${i+1}: ${rand(['BJP wins','Opposition rally','New policy','Infrastructure project','Election update','Campaign trail','Voter registration','Development push','Reform bill','Cabinet meeting'])}`, 'Full news article content here with detailed coverage of the event.', 'Brief summary of the news article.', rand(['NDTV','Times of India','Hindustan Times','The Hindu','India Today','Republic','ANI','PTI']), rand(['Hindi','English','Urdu']), rand(['politics','economy','social','infrastructure','education']), rand(['positive','negative','neutral']), Math.random(), true]);
  }
  console.log(`  Created 50 NB parsed news`);

  // ============ NB NEWS ANALYSIS ============
  console.log('Seeding NB news analyses...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_news_analyses (id, tenant_id, news_id, analysis_type, analysis, confidence, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [uuid(), TENANT_ID, newsIds[i % newsIds.length], rand(['sentiment','impact','relevance','factcheck']), JSON.stringify({score: Math.random().toFixed(2), summary: 'Analysis result'}), Math.random()]);
  }
  console.log(`  Created 50 NB news analyses`);

  // ============ NB PARTY LINES ============
  console.log('Seeding NB party lines...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_party_lines (id, tenant_id, topic, party_line, talking_points, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [uuid(), TENANT_ID, rand(['Economy','Healthcare','Education','Infrastructure','Employment','Security','Agriculture','Technology','Women Empowerment','Youth Development']), `Our party stance on this important topic.`, JSON.stringify(['Point 1','Point 2','Point 3']), true]);
  }
  console.log(`  Created 50 NB party lines`);

  // ============ NB SPEECH POINTS ============
  console.log('Seeding NB speech points...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_speech_points (id, tenant_id, category, title, content, language, usage_count, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), TENANT_ID, rand(['development','welfare','governance','reform','promise']), `Speech Point ${i+1}`, `Key talking point for speeches and rallies about ${rand(['development','progress','change','growth'])}`, rand(['Hindi','English','Bhojpuri']), randInt(0,100), true]);
  }
  console.log(`  Created 50 NB speech points`);

  // ============ NB ACTION PLANS ============
  console.log('Seeding NB action plans...');
  const actionPlanIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    actionPlanIds.push(id);
    await client.query(`INSERT INTO nb_action_plans (id, tenant_id, title, description, priority, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [id, TENANT_ID, `Action Plan ${i+1}: ${rand(['Door to Door Campaign','Rally Organization','Social Media Push','Voter Registration Drive','Community Meeting'])}`, 'Detailed plan description', rand(['low','medium','high','critical']), rand(['pending','in_progress','completed','cancelled'])]);
  }
  console.log(`  Created 50 NB action plans`);

  // ============ NB ACTION EXECUTIONS ============
  console.log('Seeding NB action executions...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_action_executions (id, tenant_id, action_plan_id, executed_by, notes, status, executed_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [uuid(), TENANT_ID, actionPlanIds[i % actionPlanIds.length], rand(firstNames) + ' ' + rand(lastNames), 'Execution notes and observations', rand(['completed','partial','failed']), ]);
  }
  console.log(`  Created 50 NB action executions`);

  // ============ NB CAMPAIGN SPEECHES ============
  console.log('Seeding NB campaign speeches...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_campaign_speeches (id, tenant_id, title, speech_type, content, language, duration, target_audience, usage_count, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [uuid(), TENANT_ID, `Speech ${i+1}: ${rand(['Victory Address','Rally Speech','Community Address','Youth Outreach','Women Empowerment'])}`, rand(['rally','community','press','internal','digital']), 'Full speech content with key messaging points and calls to action.', rand(['Hindi','English','Bhojpuri','Maithili']), randInt(5,60), rand(['general','youth','women','farmers','workers']), randInt(0,50)]);
  }
  console.log(`  Created 50 NB campaign speeches`);

  // ============ NB BROADCASTS ============
  console.log('Seeding NB broadcasts...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO nb_broadcasts (id, tenant_id, title, content, broadcast_type, status, recipient_count, delivered_count, read_count, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [uuid(), TENANT_ID, `Broadcast ${i+1}`, `Important message to ${rand(['all members','booth workers','zone commanders','volunteers'])}`, rand(['sms','whatsapp','email','push','in_app']), rand(['draft','sent','scheduled','cancelled']), randInt(100,10000), randInt(50,9000), randInt(10,5000)]);
  }
  console.log(`  Created 50 NB broadcasts`);

  // ============ TENANT WEBSITES ============
  console.log('Seeding tenant websites...');
  const websiteIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    websiteIds.push(id);
    await client.query(`INSERT INTO tenant_websites (id, tenant_id, subdomain, site_name, tagline, description, primary_color, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [id, TENANT_ID, `site-${uuid().substring(0,8)}`, `${rand(lastNames)} Campaign Site ${i+1}`, `Building a better ${rand(districts)}`, 'Official campaign website', `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`, rand(['DRAFT','PUBLISHED','UNPUBLISHED'])]);
  }
  console.log(`  Created 50 tenant websites`);

  // ============ WEBSITE PAGES ============
  console.log('Seeding website pages...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO website_pages (id, website_id, slug, title, content, page_type, is_published, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), websiteIds[i % websiteIds.length], `page-${i+1}`, `Page ${i+1}: ${rand(['Home','About','Contact','Gallery','News','Events','Manifesto','Team','FAQ','Donate'])}`, JSON.stringify({blocks:[{type:'text',content:'Page content here'}]}), rand(['home','about','contact','custom','gallery']), true, i]);
  }
  console.log(`  Created 50 website pages`);

  // ============ WEBSITE MEDIA ============
  console.log('Seeding website media...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO website_media (id, website_id, file_name, file_url, file_type, file_size, alt_text, category, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), websiteIds[i % websiteIds.length], `media_${i+1}.${rand(['jpg','png','pdf','mp4'])}`, `/media/media_${i+1}.jpg`, rand(['image/jpeg','image/png','application/pdf','video/mp4']), randInt(10000,5000000), `Media file ${i+1}`, rand(['banner','gallery','document','video'])]);
  }
  console.log(`  Created 50 website media`);

  // ============ FUND ACCOUNTS ============
  console.log('Seeding fund accounts...');
  const fundAccountIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    fundAccountIds.push(id);
    await client.query(`INSERT INTO fund_accounts (id, tenant_id, account_name, account_type, bank_name, account_number, ifsc_code, current_balance, is_default, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [id, TENANT_ID, `Account ${i+1} - ${rand(['Campaign Fund','Donation Account','Expense Account','Emergency Fund','Event Fund'])}`, rand(['savings','current','fixed_deposit']), rand(['SBI','PNB','BOB','ICICI','HDFC','Axis','Canara','Union']), `${randInt(1000,9999)}${randInt(10000000,99999999)}`, `${rand(['SBIN','PUNB','BARB','ICIC','HDFC','UTIB'])}0${randInt(100000,999999)}`, randInt(10000,5000000), i===0, true]);
  }
  console.log(`  Created 50 fund accounts`);

  // ============ FUND DONATIONS ============
  console.log('Seeding fund donations...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO fund_donations (id, tenant_id, account_id, donor_name, donor_contact, amount, payment_mode, donation_date, receipt_no, purpose, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [uuid(), TENANT_ID, fundAccountIds[i % fundAccountIds.length], `${rand(firstNames)} ${rand(lastNames)}`, randPhone(), randInt(500,500000), rand(['cash','upi','neft','cheque','rtgs']), randPastDate(), `RCP-${String(i+1).padStart(5,'0')}`, rand(['general','campaign','event','infrastructure'])]);
  }
  console.log(`  Created 50 fund donations`);

  // ============ FUND EXPENSES ============
  console.log('Seeding fund expenses...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO fund_expenses (id, tenant_id, account_id, category, description, amount, payment_mode, expense_date, vendor_name, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [uuid(), TENANT_ID, fundAccountIds[i % fundAccountIds.length], rand(['travel','printing','advertising','venue','food','equipment','salary','misc']), `Expense for ${rand(['rally','meeting','campaign material','transport','catering'])}`, randInt(500,200000), rand(['cash','upi','neft','cheque']), randPastDate(), `${rand(firstNames)} ${rand(['Enterprises','Services','Traders','Agency'])}`, rand(['pending','approved','rejected','paid'])]);
  }
  console.log(`  Created 50 fund expenses`);

  // ============ FUND TRANSACTIONS ============
  console.log('Seeding fund transactions...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO fund_transactions (id, tenant_id, account_id, transaction_type, amount, balance_after, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [uuid(), TENANT_ID, fundAccountIds[i % fundAccountIds.length], rand(['DONATION','EXPENSE','TRANSFER','REFUND','ADJUSTMENT']), randInt(1000,100000), randInt(10000,5000000), `Transaction ${i+1}`]);
  }
  console.log(`  Created 50 fund transactions`);

  // ============ PARTY EVENTS ============
  console.log('Seeding party events...');
  const partyEventIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    partyEventIds.push(id);
    await client.query(`INSERT INTO party_events (id, tenant_id, election_id, title, description, event_type, venue, address, start_date, end_date, status, expected_attendees, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
      [id, TENANT_ID, electionIds[i % electionIds.length], `Event ${i+1}: ${rand(['Grand Rally','Town Hall','Road Show','Pad Yatra','Nukkad Sabha','Press Conference','Worker Meeting','Youth Convention'])}`, `Event description and agenda`, rand(['rally','meeting','roadshow','convention','press_meet','cultural','fundraiser']), `${rand(['Maidan','Hall','Grounds','Stadium','Auditorium'])} - ${rand(districts)}`, `${rand(districts)}, Bihar`, randDate(), randDate(), rand(['DRAFT','SCHEDULED','ONGOING','COMPLETED','CANCELLED']), randInt(100,50000)]);
  }
  console.log(`  Created 50 party events`);

  // ============ INVENTORY ITEMS ============
  console.log('Seeding inventory items...');
  const inventoryIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    inventoryIds.push(id);
    await client.query(`INSERT INTO inventory_items (id, tenant_id, name, sku, description, unit, quantity, min_stock, max_stock, cost_price, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [id, TENANT_ID, `${rand(['T-Shirts','Caps','Flags','Banners','Posters','Pamphlets','Badges','Stickers','Wristbands','Scarves'])} - ${rand(['Small','Medium','Large','XL','Standard'])}`, `SKU-${String(i+1).padStart(4,'0')}`, `Campaign inventory item`, rand(['pcs','kg','box','bundle','set']), randInt(50,10000), randInt(10,100), randInt(1000,50000), randInt(10,5000), true]);
  }
  console.log(`  Created 50 inventory items`);

  // ============ INVENTORY ALLOCATIONS ============
  console.log('Seeding inventory allocations...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO inventory_allocations (id, tenant_id, item_id, election_id, allocated_to, allocated_to_name, quantity, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), TENANT_ID, inventoryIds[i % inventoryIds.length], electionIds[i % electionIds.length], userIds[i % userIds.length], `${rand(firstNames)} ${rand(lastNames)}`, randInt(10,500), rand(['pending','allocated','dispatched','received','returned'])]);
  }
  console.log(`  Created 50 inventory allocations`);

  // ============ INTERNAL NOTIFICATIONS ============
  console.log('Seeding internal notifications...');
  const notifIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    notifIds.push(id);
    await client.query(`INSERT INTO internal_notifications (id, tenant_id, title, message, notification_type, priority, target_audience, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [id, TENANT_ID, `Notification ${i+1}`, `Important update: ${rand(['Meeting scheduled','Rally tomorrow','New assignment','Task deadline','Report ready'])}`, rand(['info','alert','warning','reminder','announcement']), rand(['low','medium','high','urgent']), JSON.stringify({roles: [rand(roles)]}), rand(['DRAFT','SENT','SCHEDULED'])]);
  }
  console.log(`  Created 50 internal notifications`);

  // ============ NOTIFICATION RECIPIENTS ============
  console.log('Seeding notification recipients...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO notification_recipients (id, notification_id, user_id, channel, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [uuid(), notifIds[i % notifIds.length], userIds[i % userIds.length], rand(['in_app','push','email','sms']), rand(['pending','delivered','read'])]);
    } catch(e) { /* skip */ }
  }
  console.log(`  Created notification recipients`);

  // ============ CHAT CONVERSATIONS ============
  console.log('Seeding chat conversations...');
  const conversationIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    conversationIds.push(id);
    await client.query(`INSERT INTO chat_conversations (id, tenant_id, title, conversation_type, created_by, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [id, TENANT_ID, `Chat ${i+1}: ${rand(['Campaign Team','Zone Leaders','Booth Workers','Admin Group','Strategy Team'])}`, rand(['DIRECT','GROUP','BROADCAST','SUPPORT']), userIds[i % userIds.length], true]);
  }
  console.log(`  Created 50 chat conversations`);

  // ============ CHAT PARTICIPANTS ============
  console.log('Seeding chat participants...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO chat_participants (id, conversation_id, user_id, role, is_active, joined_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW(),NOW())`,
        [uuid(), conversationIds[i % conversationIds.length], userIds[i % userIds.length], rand(['admin','member','moderator']), true]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created chat participants`);

  // ============ CHAT MESSAGES ============
  console.log('Seeding chat messages...');
  const messageIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    messageIds.push(id);
    await client.query(`INSERT INTO chat_messages (id, conversation_id, sender_id, content, message_type, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [id, conversationIds[i % conversationIds.length], userIds[i % userIds.length], `Message ${i+1}: ${rand(['Meeting at 5 PM','Task completed','Need update','Rally preparations done','Voter data uploaded'])}`, rand(['text','image','document','audio'])]);
  }
  console.log(`  Created 50 chat messages`);

  // ============ MESSAGE REACTIONS ============
  console.log('Seeding message reactions...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES ($1,$2,$3,$4,NOW())`,
        [uuid(), messageIds[i % messageIds.length], userIds[i % userIds.length], rand(['👍','❤️','😂','🔥','👏'])]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created message reactions`);

  // ============ MESSAGE READ RECEIPTS ============
  console.log('Seeding message read receipts...');
  for (let i = 0; i < 50; i++) {
    try {
      await client.query(`INSERT INTO message_read_receipts (id, message_id, user_id, read_at, created_at) VALUES ($1,$2,$3,NOW(),NOW())`,
        [uuid(), messageIds[i % messageIds.length], userIds[i % userIds.length]]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created message read receipts`);

  // ============ CANDIDATE DOCUMENTS ============
  console.log('Seeding candidate documents...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO candidate_documents (id, candidate_id, document_name, document_type, storage_provider, file_url, mime_type, file_size, is_public, uploaded_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW(),NOW())`,
      [uuid(), candidateIds[i % candidateIds.length], `Document ${i+1}`, rand(['RESUME','AFFIDAVIT','CRIMINAL_RECORD','ASSETS','PHOTO_ID','OTHER']), 'LOCAL', `/docs/candidate_${i+1}.pdf`, 'application/pdf', randInt(10000,5000000), Math.random()>0.5]);
  }
  console.log(`  Created 50 candidate documents`);

  // ============ CANDIDATE SOCIAL MEDIA ============
  console.log('Seeding candidate social media...');
  const socialMediaIds = [];
  const platforms = ['FACEBOOK','TWITTER','INSTAGRAM','YOUTUBE','LINKEDIN','WHATSAPP'];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    socialMediaIds.push(id);
    try {
      await client.query(`INSERT INTO candidate_social_media (id, candidate_id, platform, profile_url, username, followers, following, posts, engagement_rate, verified_status, last_updated, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW(),NOW())`,
        [id, candidateIds[i % candidateIds.length], platforms[i % platforms.length], `https://${platforms[i%platforms.length].toLowerCase()}.com/candidate${i}`, `candidate${i}`, randInt(1000,500000), randInt(100,5000), randInt(50,5000), Math.random()*10, Math.random()>0.7]);
    } catch(e) { /* skip duplicate candidateId+platform */ }
  }
  console.log(`  Created candidate social media`);

  // ============ SOCIAL MEDIA STATS ============
  console.log('Seeding social media stats...');
  for (let i = 0; i < Math.min(50, socialMediaIds.length); i++) {
    await client.query(`INSERT INTO social_media_stats (id, social_media_id, followers, following, posts, likes, comments, shares, views, engagement_rate, recorded_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [uuid(), socialMediaIds[i % socialMediaIds.length], randInt(1000,500000), randInt(100,5000), randInt(50,5000), randInt(500,50000), randInt(50,5000), randInt(10,1000), randInt(10000,1000000), Math.random()*10]);
  }
  console.log(`  Created social media stats`);

  // ============ CANDIDATE BATTLE CARDS ============
  console.log('Seeding candidate battle cards...');
  for (let i = 0; i < Math.min(50, candidateIds.length - 1); i++) {
    try {
      await client.query(`INSERT INTO candidate_battle_cards (id, candidate_id, opponent_id, title, summary, our_strengths, opponent_weaknesses, key_issues, talking_points, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [uuid(), candidateIds[i], candidateIds[(i+1) % candidateIds.length], `Battle Card: vs ${rand(firstNames)} ${rand(lastNames)}`, 'Strategic comparison and talking points', JSON.stringify(['Strong grassroots','Development record','Youth appeal']), JSON.stringify(['Corruption charges','Poor attendance','No local connect']), JSON.stringify(['Infrastructure','Employment','Healthcare']), JSON.stringify(['We delivered on promises','Track record speaks']), true]);
    } catch(e) { /* skip duplicate */ }
  }
  console.log(`  Created candidate battle cards`);

  // ============ INVENTORY CATEGORIES ============
  console.log('Seeding inventory categories...');
  const invCatNames = ['Apparel','Stationary','Promotional','Logistics','Event Supplies','Electronics','Furniture','Food & Beverages','Banners & Posters','Miscellaneous'];
  for (let i = 0; i < invCatNames.length; i++) {
    await client.query(`INSERT INTO inventory_categories (id, tenant_id, name, description, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [uuid(), TENANT_ID, invCatNames[i], `Category for ${invCatNames[i]}`, true]);
  }
  console.log(`  Created inventory categories`);

  // ============ INVENTORY MOVEMENTS ============
  console.log('Seeding inventory movements...');
  for (let i = 0; i < 50; i++) {
    const qty = randInt(1,500);
    const prevQty = randInt(100,5000);
    await client.query(`INSERT INTO inventory_movements (id, tenant_id, item_id, movement_type, quantity, previous_quantity, new_quantity, reason, reference_type, remarks, moved_by, moved_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [uuid(), TENANT_ID, inventoryIds[i % inventoryIds.length], rand(['IN','OUT','ADJUSTMENT','TRANSFER']), qty, prevQty, prevQty + qty, rand(['purchase','allocation','return','donation']), rand(['purchase','allocation','return','donation']), `Movement ${i+1}`, rand(firstNames)]);
  }
  console.log(`  Created 50 inventory movements`);

  // ============ EVENT ATTENDEES ============
  console.log('Seeding event attendees...');
  for (let i = 0; i < 50; i++) {
    const fn = rand(firstNames); const ln = rand(lastNames);
    await client.query(`INSERT INTO event_attendees (id, event_id, user_id, name, phone, email, role, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [uuid(), partyEventIds[i % partyEventIds.length], userIds[i % userIds.length], `${fn} ${ln}`, randPhone(), `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@test.com`, rand(['speaker','attendee','organizer','volunteer','vip']), rand(['registered','confirmed','attended','cancelled'])]);
  }
  console.log(`  Created 50 event attendees`);

  // ============ EVENT TASKS ============
  console.log('Seeding event tasks...');
  for (let i = 0; i < 50; i++) {
    const assigneeName = `${rand(firstNames)} ${rand(lastNames)}`;
    await client.query(`INSERT INTO event_tasks (id, event_id, title, description, assigned_to, assigned_to_name, due_date, priority, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [uuid(), partyEventIds[i % partyEventIds.length], `Task ${i+1}: ${rand(['Setup stage','Arrange chairs','Sound check','Security','Registration','Catering','Transport','Decorations'])}`, 'Task details', userIds[i % userIds.length], assigneeName, randDate(), rand(['low','medium','high','urgent']), rand(['pending','in_progress','completed','cancelled'])]);
  }
  console.log(`  Created 50 event tasks`);

  // ============ TENANT AI CREDITS ============
  console.log('Seeding tenant AI credits...');
  const aiCreditsId = uuid();
  await client.query(`INSERT INTO tenant_ai_credits (id, tenant_id, total_credits, used_credits, bonus_credits, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
    [aiCreditsId, TENANT_ID, 10000, 2500, 500]);
  console.log(`  Created tenant AI credits`);

  // ============ AI CREDIT TRANSACTIONS ============
  console.log('Seeding AI credit transactions...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO ai_credit_transactions (id, tenant_credits_id, transaction_type, credits, description, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [uuid(), aiCreditsId, rand(['purchase','usage','refund','bonus']), randInt(1, 500), `AI credit transaction ${i+1}`]);
  }
  console.log(`  Created 50 AI credit transactions`);

  // ============ AI USAGE LOGS ============
  console.log('Seeding AI usage logs...');
  for (let i = 0; i < 50; i++) {
    await client.query(`INSERT INTO ai_usage_logs (id, tenant_credits_id, user_id, feature_key, credits_used, input_tokens, output_tokens, model_used, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [uuid(), aiCreditsId, userIds[i % userIds.length], rand(['sentiment_analysis','voter_prediction','speech_generation','data_analytics','report_generation']), randInt(1,50), randInt(100,5000), randInt(50,2000), rand(['gpt-4','claude-3','gemini-pro']), rand(['success','failed','pending'])]);
  }
  console.log(`  Created 50 AI usage logs`);

  console.log('\n=== SEEDING COMPLETE ===');
  console.log('All tables seeded with 50 records each for EC_nitihdh01');

  await client.end();
}

seed().catch(e => { console.error('Seed error:', e); process.exit(1); });
