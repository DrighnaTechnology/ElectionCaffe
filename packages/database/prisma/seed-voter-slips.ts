/**
 * Voter Slip Demo Data Seed Script
 * Creates comprehensive voter data for voter slip generation with:
 * - EPIC Numbers
 * - Serial List Numbers
 * - Names (English & Local language)
 * - Father/Husband Names
 * - Age & Gender
 * - House Numbers & Addresses
 * - Linked to Parts/Booths with complete booth details
 *
 * Run with: npx tsx prisma/seed-voter-slips.ts
 */

import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

// Tenant databases to seed
const TENANT_DBS = [
  {
    name: 'EC_BJP_TN',
    electionId: 'bjp-tn-election-2024',
    state: 'Tamil Nadu',
    language: 'tamil',
    areas: [
      { name: 'Mylapore', local: 'மயிலாப்பூர்' },
      { name: 'T Nagar', local: 'தி. நகர்' },
      { name: 'Adyar', local: 'அடையாறு' },
      { name: 'Velachery', local: 'வேளச்சேரி' },
      { name: 'Anna Nagar', local: 'அண்ணா நகர்' },
    ]
  },
  {
    name: 'EC_BJP_UP',
    electionId: 'bjp-up-election-2024',
    state: 'Uttar Pradesh',
    language: 'hindi',
    areas: [
      { name: 'Hazratganj', local: 'हज़रतगंज' },
      { name: 'Gomti Nagar', local: 'गोमती नगर' },
      { name: 'Aliganj', local: 'आलीगंज' },
      { name: 'Indira Nagar', local: 'इंदिरा नगर' },
      { name: 'Rajajipuram', local: 'राजाजीपुरम' },
    ]
  },
  {
    name: 'EC_AIDMK_TN',
    electionId: 'aidmk-tn-election-2024',
    state: 'Tamil Nadu',
    language: 'tamil',
    areas: [
      { name: 'Karaikudi', local: 'காரைக்குடி' },
      { name: 'Sivaganga', local: 'சிவகங்கை' },
      { name: 'Devakottai', local: 'தேவகோட்டை' },
      { name: 'Manamadurai', local: 'மானாமதுரை' },
      { name: 'Ilayankudi', local: 'இளையான்குடி' },
    ]
  },
];

// Tamil Names
const TAMIL_MALE_NAMES = [
  { en: 'Arun Kumar', local: 'அருண் குமார்' },
  { en: 'Murugan Selvam', local: 'முருகன் செல்வம்' },
  { en: 'Karthik Rajan', local: 'கார்த்திக் ராஜன்' },
  { en: 'Senthil Nathan', local: 'செந்தில் நாதன்' },
  { en: 'Raja Gopal', local: 'ராஜா கோபால்' },
  { en: 'Suresh Babu', local: 'சுரேஷ் பாபு' },
  { en: 'Mani Vannan', local: 'மணி வண்ணன்' },
  { en: 'Venkatesh Iyer', local: 'வெங்கடேஷ் ஐயர்' },
  { en: 'Prabu Deva', local: 'பிரபு தேவா' },
  { en: 'Vijay Anand', local: 'விஜய் ஆனந்த்' },
  { en: 'Dinesh Kumar', local: 'தினேஷ் குமார்' },
  { en: 'Saravanan Pillai', local: 'சரவணன் பிள்ளை' },
  { en: 'Ganesh Moorthy', local: 'கணேஷ் மூர்த்தி' },
  { en: 'Balaji Srinivasan', local: 'பாலாஜி ஸ்ரீனிவாசன்' },
  { en: 'Ramesh Pandian', local: 'ரமேஷ் பாண்டியன்' },
];

const TAMIL_FEMALE_NAMES = [
  { en: 'Lakshmi Devi', local: 'லட்சுமி தேவி' },
  { en: 'Saraswathi Ammal', local: 'சரஸ்வதி அம்மாள்' },
  { en: 'Parvathi Rani', local: 'பார்வதி ராணி' },
  { en: 'Meenakshi Sundari', local: 'மீனாட்சி சுந்தரி' },
  { en: 'Kamala Devi', local: 'கமலா தேவி' },
  { en: 'Amutha Lakshmi', local: 'அமுதா லட்சுமி' },
  { en: 'Jayanthi Devi', local: 'ஜெயந்தி தேவி' },
  { en: 'Kalyani Ammal', local: 'கல்யாணி அம்மாள்' },
  { en: 'Shanthi Priya', local: 'சாந்தி பிரியா' },
  { en: 'Sumathi Devi', local: 'சுமதி தேவி' },
  { en: 'Mangala Lakshmi', local: 'மங்களா லட்சுமி' },
  { en: 'Lalitha Devi', local: 'லலிதா தேவி' },
  { en: 'Sulochana Ammal', local: 'சுலோச்சனா அம்மாள்' },
  { en: 'Janaki Devi', local: 'ஜானகி தேவி' },
  { en: 'Padmavathi', local: 'பத்மாவதி' },
];

// Hindi Names
const HINDI_MALE_NAMES = [
  { en: 'Rajesh Kumar', local: 'राजेश कुमार' },
  { en: 'Suresh Yadav', local: 'सुरेश यादव' },
  { en: 'Ramesh Sharma', local: 'रमेश शर्मा' },
  { en: 'Anil Verma', local: 'अनिल वर्मा' },
  { en: 'Vijay Singh', local: 'विजय सिंह' },
  { en: 'Sanjay Gupta', local: 'संजय गुप्ता' },
  { en: 'Manoj Tiwari', local: 'मनोज तिवारी' },
  { en: 'Amit Tripathi', local: 'अमित त्रिपाठी' },
  { en: 'Rakesh Mishra', local: 'राकेश मिश्रा' },
  { en: 'Dinesh Pandey', local: 'दिनेश पांडे' },
  { en: 'Ashok Dubey', local: 'अशोक दुबे' },
  { en: 'Vinod Srivastava', local: 'विनोद श्रीवास्तव' },
  { en: 'Pramod Maurya', local: 'प्रमोद मौर्य' },
  { en: 'Ravi Chauhan', local: 'रवि चौहान' },
  { en: 'Mohan Rajput', local: 'मोहन राजपूत' },
];

const HINDI_FEMALE_NAMES = [
  { en: 'Sunita Devi', local: 'सुनीता देवी' },
  { en: 'Geeta Rani', local: 'गीता रानी' },
  { en: 'Savita Kumari', local: 'सविता कुमारी' },
  { en: 'Meena Devi', local: 'मीना देवी' },
  { en: 'Rekha Sharma', local: 'रेखा शर्मा' },
  { en: 'Anita Verma', local: 'अनिता वर्मा' },
  { en: 'Neeta Singh', local: 'नीता सिंह' },
  { en: 'Shobha Gupta', local: 'शोभा गुप्ता' },
  { en: 'Kiran Devi', local: 'किरण देवी' },
  { en: 'Poonam Yadav', local: 'पूनम यादव' },
  { en: 'Sarita Kumari', local: 'सरिता कुमारी' },
  { en: 'Mamta Devi', local: 'ममता देवी' },
  { en: 'Sarla Sharma', local: 'सरला शर्मा' },
  { en: 'Usha Rani', local: 'उषा रानी' },
  { en: 'Kamla Devi', local: 'कमला देवी' },
];

// Helper functions
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEpicNo(state: string): string {
  const prefixes = state === 'Tamil Nadu'
    ? ['TN/', 'MDQ', 'CHE', 'MDU', 'TRP']
    : ['UP/', 'LKO', 'VNS', 'AGR', 'KNP'];
  const prefix = getRandomElement(prefixes);
  const number = Math.floor(1000000 + Math.random() * 9000000).toString();
  return prefix + number;
}

function generateHouseNo(): string {
  const prefixes = ['', 'A-', 'B-', 'C-', '1/', '2/', '3/'];
  const num = Math.floor(1 + Math.random() * 500);
  const suffix = Math.random() > 0.8 ? getRandomElement(['A', 'B', 'C']) : '';
  return getRandomElement(prefixes) + num + suffix;
}

function generatePhone(): string {
  const prefixes = ['63', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const prefix = getRandomElement(prefixes);
  const number = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix + number;
}

function generateDOB(minAge: number = 18, maxAge: number = 85): Date {
  const today = new Date();
  const age = Math.floor(minAge + Math.random() * (maxAge - minAge));
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(1 + Math.random() * 28);
  return new Date(birthYear, birthMonth, birthDay);
}

async function seedVotersForTenant(
  dbName: string,
  electionId: string,
  state: string,
  language: string,
  areas: { name: string; local: string }[]
) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Seeding voter slip data for ${dbName}...`);

    // Check existing voter count
    const existingCount = await (client as any).voter.count();
    if (existingCount > 50) {
      console.log(`  ⏭️  Voters already exist (${existingCount} found), skipping...`);
      return;
    }

    // Get election
    let election = await client.election.findFirst({
      where: { id: electionId },
    });

    if (!election) {
      election = await client.election.findFirst();
    }

    if (!election) {
      console.log(`  ⚠️  No elections found for ${dbName}, skipping...`);
      return;
    }

    const actualElectionId = election.id;
    console.log(`  Using election: ${election.electionName}`);

    // Get or create Parts (Polling Booths)
    let parts = await client.part.findMany({ where: { electionId: actualElectionId } });

    if (parts.length === 0) {
      console.log('  Creating polling booths/parts...');
      // Create parts with detailed booth information
      for (let i = 0; i < 5; i++) {
        const area = areas[i % areas.length];
        const part = await client.part.create({
          data: {
            electionId: actualElectionId,
            partNumber: i + 1,
            boothName: `${area.name} Government Higher Secondary School`,
            boothNameLocal: `${area.local} அரசு மேல்நிலைப்பள்ளி`,
            address: `${area.name} Main Road, Near ${area.name} Bus Stand`,
            landmark: `${area.name} Police Station`,
            pincode: `${600000 + i * 10}`,
            latitude: 13.0827 + (Math.random() - 0.5) * 0.1,
            longitude: 80.2707 + (Math.random() - 0.5) * 0.1,
            schoolName: `${area.name} Government Higher Secondary School`,
            partType: i < 3 ? 'URBAN' : 'SEMI_URBAN',
            totalVoters: 500,
          },
        });
        parts.push(part);
      }
      console.log(`  ✅ Created ${parts.length} polling booths`);
    }

    // Get or create Booths
    let booths = await (client as any).booth.findMany({ where: { electionId: actualElectionId } });

    if (booths.length === 0) {
      console.log('  Creating booths...');
      for (const part of parts) {
        for (let boothNum = 1; boothNum <= 2; boothNum++) {
          const booth = await (client as any).booth.create({
            data: {
              electionId: actualElectionId,
              partId: part.id,
              boothNumber: (parts.indexOf(part)) * 2 + boothNum,
              boothName: `${part.boothName} - Room ${boothNum}`,
              boothNameLocal: `${part.boothNameLocal} - அறை ${boothNum}`,
              address: part.address,
              latitude: part.latitude,
              longitude: part.longitude,
              totalVoters: 250,
            },
          });
          booths.push(booth);
        }
      }
      console.log(`  ✅ Created ${booths.length} booths`);
    }

    // Get names based on language
    const maleNames = language === 'tamil' ? TAMIL_MALE_NAMES : HINDI_MALE_NAMES;
    const femaleNames = language === 'tamil' ? TAMIL_FEMALE_NAMES : HINDI_FEMALE_NAMES;

    // Create voters with complete voter slip data
    console.log('  Creating voters with voter slip data...');
    let voterCount = 0;

    for (const part of parts) {
      const partBooths = booths.filter((b: any) => b.partId === part.id);
      const area = areas.find(a => part.boothName?.includes(a.name)) || areas[0];

      // Create 100 voters per part (500 total)
      for (let i = 0; i < 100; i++) {
        const isMale = Math.random() > 0.48; // Slight female majority
        const gender = isMale ? 'MALE' : 'FEMALE';
        const nameData = isMale ? getRandomElement(maleNames) : getRandomElement(femaleNames);
        const fatherNameData = getRandomElement(maleNames);
        const dob = generateDOB(18, 85);
        const age = new Date().getFullYear() - dob.getFullYear();
        const booth = partBooths.length > 0 ? getRandomElement(partBooths) : null;

        await (client as any).voter.create({
          data: {
            electionId: actualElectionId,
            partId: part.id,
            boothId: booth?.id || null,
            epicNumber: generateEpicNo(state),
            slNumber: voterCount + 1,
            name: nameData.en,
            nameLocal: nameData.local,
            fatherName: isMale || Math.random() > 0.5 ? fatherNameData.en : null,
            husbandName: !isMale && Math.random() > 0.5 ? fatherNameData.en : null,
            relationType: isMale ? 'FATHER' : (Math.random() > 0.5 ? 'HUSBAND' : 'FATHER'),
            gender,
            age,
            dateOfBirth: dob,
            mobile: Math.random() > 0.3 ? generatePhone() : null,
            houseNumber: generateHouseNo(),
            address: `${generateHouseNo()}, ${area.name}, ${state}`,
            politicalLeaning: getRandomElement(['LOYAL', 'SWING', 'OPPOSITION', 'UNKNOWN']),
            influenceLevel: Math.random() > 0.9 ? 'HIGH' : (Math.random() > 0.7 ? 'MEDIUM' : 'LOW'),
            isActive: true,
          },
        });

        voterCount++;
        if (voterCount % 100 === 0) {
          process.stdout.write(`\r  Created ${voterCount} voters...`);
        }
      }
    }

    console.log(`\n  ✅ Created ${voterCount} voters with complete voter slip data`);

    // Update part voter counts
    for (const part of parts) {
      const count = await (client as any).voter.count({ where: { partId: part.id } });
      await client.part.update({
        where: { id: part.id },
        data: { totalVoters: count },
      });
    }

    console.log(`  ✅ Updated voter counts for all parts`);

  } catch (error) {
    console.error(`  ❌ Error seeding voters for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting voter slip data seed...\n');
  console.log('This will create voters with complete data for voter slip generation:');
  console.log('  - EPIC Numbers');
  console.log('  - Serial List Numbers (SL No)');
  console.log('  - Names in English & Local Language');
  console.log('  - Father/Husband Names');
  console.log('  - Age, Gender, DOB');
  console.log('  - House Numbers & Addresses');
  console.log('  - Polling Booth Details\n');

  for (const tenant of TENANT_DBS) {
    await seedVotersForTenant(
      tenant.name,
      tenant.electionId,
      tenant.state,
      tenant.language,
      tenant.areas
    );
  }

  console.log('\n✨ Voter slip data seed completed!');
  console.log('\n📋 Voter slip fields populated:');
  console.log('  ✓ epicNumber - EPIC registration number (e.g., TN/1234567)');
  console.log('  ✓ slNumber - Serial number on voter list (1, 2, 3...)');
  console.log('  ✓ name - Full name in English');
  console.log('  ✓ nameLocal - Name in local language (Tamil/Hindi)');
  console.log('  ✓ fatherName/husbandName - Relation name');
  console.log('  ✓ relationType - FATHER/HUSBAND/MOTHER');
  console.log('  ✓ gender - MALE/FEMALE');
  console.log('  ✓ age - Calculated from DOB');
  console.log('  ✓ dateOfBirth - Date of birth');
  console.log('  ✓ houseNumber - House/Door number');
  console.log('  ✓ address - Full address');
  console.log('  ✓ partId - Links to Part (Polling Booth)');
  console.log('  ✓ boothId - Links to specific booth room');
  console.log('\n📍 Part (Polling Booth) fields:');
  console.log('  ✓ partNumber - Booth number (1, 2, 3...)');
  console.log('  ✓ boothName - Booth name (e.g., "Mylapore Govt School")');
  console.log('  ✓ boothNameLocal - Booth name in local language');
  console.log('  ✓ address - Booth address');
  console.log('  ✓ landmark - Nearby landmark');
}

main().catch(console.error);
