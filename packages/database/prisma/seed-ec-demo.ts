/**
 * EC_Demo Tenant Seed Script
 * Creates comprehensive sample data for all pages in the tenant web app
 *
 * Run with: npx tsx prisma/seed-ec-demo.ts
 */

import { PrismaClient, Gender, PoliticalLeaning, InfluenceLevel, RelationType, CadreRole, AssignmentType, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Database connections
const TENANT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/EC_Demo?schema=public';
const CORE_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore?schema=public';

// Tenant DB client
const prisma = new PrismaClient({
  datasources: {
    db: { url: TENANT_DATABASE_URL }
  }
});

// Core DB client (for fetching tenant ID)
const corePrisma = new PrismaClient({
  datasources: {
    db: { url: CORE_DATABASE_URL }
  }
});

// Helper function to get tenant ID from Core DB
async function getTenantIdFromCore(): Promise<string> {
  const tenant = await corePrisma.tenant.findUnique({
    where: { slug: 'demo' },
    select: { id: true }
  });

  if (!tenant) {
    throw new Error('Demo tenant not found in ElectionCaffeCore. Please run seed-demo-tenant.ts first.');
  }

  console.log(`  ✓ Found tenant ID from ElectionCaffeCore: ${tenant.id}`);
  return tenant.id;
}

// Configuration
const CONFIG = {
  TOTAL_PARTS: 20,
  VOTERS_PER_PART: 500,
  CADRES_PER_PART: 5,
  FAMILIES_PER_PART: 100,
};

// UP Configuration for second election
const UP_CONFIG = {
  TOTAL_PARTS: 15,
  VOTERS_PER_PART: 400,
  CADRES_PER_PART: 4,
  FAMILIES_PER_PART: 80,
};

// Tamil names data
const MALE_FIRST_NAMES = ['Arun', 'Murugan', 'Karthik', 'Senthil', 'Kumar', 'Raja', 'Suresh', 'Mani', 'Venkatesh', 'Prabu', 'Vijay', 'Dinesh', 'Saravanan', 'Ganesh', 'Balaji', 'Ramesh', 'Santosh', 'Prakash', 'Srinivasan', 'Narayanan'];
const FEMALE_FIRST_NAMES = ['Lakshmi', 'Saraswathi', 'Parvathi', 'Meenakshi', 'Kamala', 'Amutha', 'Jayanthi', 'Kalyani', 'Shanthi', 'Sumathi', 'Mangala', 'Lalitha', 'Sulochana', 'Janaki', 'Padmavathi', 'Radha', 'Geetha', 'Saroja', 'Priya', 'Divya'];
const SURNAMES = ['Subramanian', 'Ganapathy', 'Palanisamy', 'Narayanan', 'Venkatesh', 'Srinivasan', 'Ramasamy', 'Perumal', 'Murugan', 'Sundaram', 'Raman', 'Sivan', 'Velu', 'Kasi', 'Mariyappan', 'Selvaraj', 'Kumar', 'Raja', 'Thambi', 'Pandian'];

const KARAIKUDI_AREAS = [
  { name: 'Kovilur', tamil: 'கோவிலூர்' },
  { name: 'Sekarathupatti', tamil: 'சேகரத்துப்பட்டி' },
  { name: 'Peyanpatti', tamil: 'பேயன்பட்டி' },
  { name: 'Kalaiyappa Nagar', tamil: 'காளையப்பாநகர்' },
  { name: 'Alagapuri', tamil: 'ஆலகாபுரி' },
  { name: 'Devakottai', tamil: 'தேவகோட்டை' },
  { name: 'Kallal', tamil: 'கள்ளல்' },
  { name: 'Kanadukathan', tamil: 'கானடுகாதான்' },
  { name: 'Kottaiyur', tamil: 'கொட்டையூர்' },
  { name: 'Pallathur', tamil: 'பள்ளத்தூர்' },
  { name: 'Nattarasankottai', tamil: 'நாட்டரசன்கோட்டை' },
  { name: 'Athangudi', tamil: 'அத்தங்குடி' },
  { name: 'Puduvayal', tamil: 'புதுவயல்' },
  { name: 'Amaravathi', tamil: 'அமராவதி' },
  { name: 'Sakkottai', tamil: 'சக்கோட்டை' },
  { name: 'Karaikudi Town', tamil: 'காரைக்குடி நகரம்' },
  { name: 'Pillayarpatti', tamil: 'பிள்ளையார்பட்டி' },
  { name: 'Kandanur', tamil: 'கண்டனூர்' },
  { name: 'Tirupathur', tamil: 'திருப்பத்தூர்' },
  { name: 'Manamadurai', tamil: 'மானாமதுரை' },
];

// Hindi names for UP election
const UP_MALE_NAMES = ['Rajesh', 'Suresh', 'Ramesh', 'Anil', 'Vijay', 'Sanjay', 'Manoj', 'Amit', 'Rakesh', 'Dinesh', 'Ashok', 'Vinod', 'Pramod', 'Ravi', 'Mohan', 'Shyam', 'Ram', 'Krishna', 'Ganesh', 'Mahesh'];
const UP_FEMALE_NAMES = ['Sunita', 'Geeta', 'Savita', 'Meena', 'Rekha', 'Anita', 'Neeta', 'Shobha', 'Kiran', 'Poonam', 'Sarita', 'Mamta', 'Sarla', 'Usha', 'Kamla', 'Radha', 'Sita', 'Laxmi', 'Durga', 'Parvati'];
const UP_SURNAMES = ['Singh', 'Yadav', 'Sharma', 'Verma', 'Gupta', 'Tiwari', 'Tripathi', 'Mishra', 'Pandey', 'Dubey', 'Srivastava', 'Maurya', 'Chauhan', 'Rajput', 'Patel', 'Kumar', 'Prasad', 'Jaiswal', 'Rawat', 'Saxena'];

const LUCKNOW_AREAS = [
  { name: 'Hazratganj', hindi: 'हज़रतगंज' },
  { name: 'Gomti Nagar', hindi: 'गोमती नगर' },
  { name: 'Aliganj', hindi: 'आलीगंज' },
  { name: 'Indira Nagar', hindi: 'इंदिरा नगर' },
  { name: 'Rajajipuram', hindi: 'राजाजीपुरम' },
  { name: 'Alambagh', hindi: 'आलमबाग' },
  { name: 'Aminabad', hindi: 'अमीनाबाद' },
  { name: 'Chowk', hindi: 'चौक' },
  { name: 'Kaiserbagh', hindi: 'कैसरबाग' },
  { name: 'Naka Hindola', hindi: 'नक्का हिंडोला' },
  { name: 'Mahanagar', hindi: 'महानगर' },
  { name: 'Chinhat', hindi: 'चिनहट' },
  { name: 'Jankipuram', hindi: 'जानकीपुरम' },
  { name: 'Vikas Nagar', hindi: 'विकास नगर' },
  { name: 'Sarojini Nagar', hindi: 'सरोजिनी नगर' },
];

// Helper functions
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefixes = ['63', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const prefix = getRandomElement(prefixes);
  const number = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix + number;
}

function generateEpicNo(): string {
  const prefixes = ['MDQ', 'RVJ', 'YPP', 'TJK', 'MJJ', 'XYT', 'KLT', 'SVK', 'TNV', 'AKR'];
  const epicPrefix = getRandomElement(prefixes);
  const number = Math.floor(1000000 + Math.random() * 9000000).toString();
  return epicPrefix + number;
}

function generateDOB(minAge: number = 18, maxAge: number = 85): Date {
  const today = new Date();
  const age = Math.floor(minAge + Math.random() * (maxAge - minAge));
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(1 + Math.random() * 28);
  return new Date(birthYear, birthMonth, birthDay);
}

function generateHouseNo(): string {
  const prefixes = ['', 'A-', 'B-', 'C-', 'D-', '1/', '2/', '3/'];
  const num = Math.floor(1 + Math.random() * 500);
  const suffix = Math.random() > 0.8 ? getRandomElement(['A', 'B', 'C']) : '';
  return `${getRandomElement(prefixes)}${num}${suffix}`;
}

// Main seed functions
async function seedTenant(tenantId: string) {
  console.log('Creating tenant record in EC_Demo with ID from ElectionCaffeCore...');

  // Create the tenant record with the same ID as in ElectionCaffeCore
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      id: tenantId,
    },
    create: {
      id: tenantId,
      name: 'Demo Tenant',
      slug: 'demo',
      tenantType: 'INDIVIDUAL_CANDIDATE',
      contactEmail: 'demo@electioncaffe.com',
      contactPhone: '9999999990',
      state: 'Tamil Nadu',
      country: 'India',
      databaseType: 'DEDICATED_MANAGED',
      databaseStatus: 'READY',
      databaseName: 'EC_Demo',
      databaseHost: 'localhost',
      databasePort: 5432,
      databaseUser: 'postgres',
      databasePassword: 'postgres',
      databaseSSL: false,
      databaseConnectionUrl: 'postgresql://postgres:postgres@localhost:5432/EC_Demo?schema=public',
      databaseManagedBy: 'PLATFORM',
      databaseMigrationVersion: '1',
      databaseLastCheckedAt: new Date(),
      maxVoters: 50000,
      maxCadres: 200,
      maxElections: 5,
      maxUsers: 50,
      maxConstituencies: 5,
      storageQuotaMB: 5000,
      subscriptionPlan: 'free',
    },
  });

  console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.id})`);
  return tenant;
}

async function seedUsers(tenantId: string) {
  console.log('Creating demo users...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  const users = [
    {
      tenantId,
      firstName: 'Demo',
      lastName: 'Admin',
      email: 'admin@demo.electioncaffe.com',
      mobile: '9000000001',
      passwordHash: hashedPassword,
      role: UserRole.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      canAccessAllConstituencies: true,
    },
    {
      tenantId,
      firstName: 'Campaign',
      lastName: 'Manager',
      email: 'campaign@demo.electioncaffe.com',
      mobile: '9000000002',
      passwordHash: hashedPassword,
      role: UserRole.CAMPAIGN_MANAGER,
      status: UserStatus.ACTIVE,
      canAccessAllConstituencies: true,
    },
    {
      tenantId,
      firstName: 'Demo',
      lastName: 'Coordinator',
      email: 'coordinator@demo.electioncaffe.com',
      mobile: '9000000003',
      passwordHash: hashedPassword,
      role: UserRole.COORDINATOR,
      status: UserStatus.ACTIVE,
      canAccessAllConstituencies: false,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { tenantId_mobile: { tenantId: user.tenantId, mobile: user.mobile } },
      update: {},
      create: user,
    });
  }

  console.log(`  ✓ ${users.length} demo users created`);
  console.log('    - admin@demo.electioncaffe.com / Demo@123 (Tenant Admin)');
  console.log('    - campaign@demo.electioncaffe.com / Demo@123 (Campaign Manager)');
  console.log('    - coordinator@demo.electioncaffe.com / Demo@123 (Coordinator)');
}

async function clearExistingData() {
  console.log('Clearing existing demo data...');

  // Delete in order of dependencies
  await prisma.pollDayVote.deleteMany({});
  await prisma.surveyResponse.deleteMany({});
  await prisma.survey.deleteMany({});
  await prisma.feedbackIssue.deleteMany({});
  await prisma.boothAgent.deleteMany({});
  await prisma.cadreAssignment.deleteMany({});
  await prisma.cadreLocation.deleteMany({});
  await prisma.cadre.deleteMany({});
  await prisma.voterScheme.deleteMany({});
  await prisma.voterVotingHistory.deleteMany({});
  await prisma.voter.deleteMany({});
  await prisma.family.deleteMany({});
  await prisma.booth.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.part.deleteMany({});
  await prisma.scheme.deleteMany({});
  await prisma.voterCategory.deleteMany({});
  await prisma.votingHistory.deleteMany({});
  await prisma.language.deleteMany({});
  await prisma.subCaste.deleteMany({});
  await prisma.caste.deleteMany({});
  await prisma.casteCategory.deleteMany({});
  await prisma.religion.deleteMany({});
  await prisma.election.deleteMany({});

  console.log('  ✓ Existing data cleared');
}

async function seedElection() {
  console.log('Creating election...');

  const election = await prisma.election.create({
    data: {
      id: 'demo-election-2024',
      tenantId: 'demo-tenant',
      name: 'Tamil Nadu Assembly Election 2024',
      nameLocal: 'தமிழ்நாடு சட்டமன்றத் தேர்தல் 2024',
      electionType: 'ASSEMBLY',
      state: 'Tamil Nadu',
      constituency: 'Karaikudi',
      district: 'Sivaganga',
      candidateName: 'Senthil Kumar',
      pollDate: new Date('2024-05-15'),
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-05-20'),
      status: 'ACTIVE',
      totalVoters: CONFIG.TOTAL_PARTS * CONFIG.VOTERS_PER_PART,
      totalParts: CONFIG.TOTAL_PARTS,
      totalBooths: CONFIG.TOTAL_PARTS * 2,
    }
  });

  console.log(`  ✓ Election created: ${election.name}`);
  return election;
}

async function seedMasterData(electionId: string) {
  console.log('Creating master data...');

  // Religions
  const religions = [
    { religionName: 'Hindu', religionNameLocal: 'இந்து', religionColor: '#FF6B00' },
    { religionName: 'Christian', religionNameLocal: 'கிறிஸ்தவர்', religionColor: '#0066CC' },
    { religionName: 'Muslim', religionNameLocal: 'முஸ்லிம்', religionColor: '#00CC66' },
  ];

  const createdReligions: any[] = [];
  for (const [index, rel] of religions.entries()) {
    const religion = await prisma.religion.create({
      data: { electionId, ...rel, displayOrder: index + 1 }
    });
    createdReligions.push(religion);
  }
  console.log('  ✓ Religions created');

  // Caste Categories
  const casteCategories = [
    { categoryName: 'OC', categoryFullName: 'Open Category' },
    { categoryName: 'BC', categoryFullName: 'Backward Classes' },
    { categoryName: 'MBC', categoryFullName: 'Most Backward Classes' },
    { categoryName: 'SC', categoryFullName: 'Scheduled Castes' },
    { categoryName: 'ST', categoryFullName: 'Scheduled Tribes' },
  ];

  const createdCategories: any[] = [];
  for (const [index, cat] of casteCategories.entries()) {
    const category = await prisma.casteCategory.create({
      data: { electionId, ...cat, displayOrder: index + 1 }
    });
    createdCategories.push(category);
  }
  console.log('  ✓ Caste categories created');

  // Castes
  const castes = [
    { casteName: 'Brahmin', casteNameLocal: 'பிராமணர்', categoryIndex: 0 },
    { casteName: 'Mudaliar', casteNameLocal: 'முதலியார்', categoryIndex: 0 },
    { casteName: 'Chettiar', casteNameLocal: 'செட்டியார்', categoryIndex: 0 },
    { casteName: 'Nadar', casteNameLocal: 'நாடார்', categoryIndex: 1 },
    { casteName: 'Gounder', casteNameLocal: 'கவுண்டர்', categoryIndex: 1 },
    { casteName: 'Yadav', casteNameLocal: 'யாதவர்', categoryIndex: 1 },
    { casteName: 'Vanniyar', casteNameLocal: 'வன்னியர்', categoryIndex: 1 },
    { casteName: 'Mukkuvar', casteNameLocal: 'முக்குவர்', categoryIndex: 2 },
    { casteName: 'Vishwakarma', casteNameLocal: 'விஸ்வகர்மா', categoryIndex: 2 },
    { casteName: 'Paraiyar', casteNameLocal: 'பறையர்', categoryIndex: 3 },
    { casteName: 'Pallar', casteNameLocal: 'பள்ளர்', categoryIndex: 3 },
    { casteName: 'Irular', casteNameLocal: 'இருளர்', categoryIndex: 4 },
  ];

  const createdCastes: any[] = [];
  for (const [index, caste] of castes.entries()) {
    const c = await prisma.caste.create({
      data: {
        electionId,
        casteCategoryId: createdCategories[caste.categoryIndex].id,
        casteName: caste.casteName,
        casteNameLocal: caste.casteNameLocal,
        displayOrder: index + 1
      }
    });
    createdCastes.push(c);
  }
  console.log('  ✓ Castes created');

  // Languages
  const languages = [
    { languageName: 'Tamil', languageNameLocal: 'தமிழ்', languageCode: 'TA' },
    { languageName: 'English', languageNameLocal: 'ஆங்கிலம்', languageCode: 'EN' },
    { languageName: 'Telugu', languageNameLocal: 'தெலுங்கு', languageCode: 'TE' },
    { languageName: 'Hindi', languageNameLocal: 'இந்தி', languageCode: 'HI' },
  ];

  const createdLanguages: any[] = [];
  for (const [index, lang] of languages.entries()) {
    const l = await prisma.language.create({
      data: { electionId, ...lang, displayOrder: index + 1 }
    });
    createdLanguages.push(l);
  }
  console.log('  ✓ Languages created');

  // Voter Categories
  const voterCategories = [
    { categoryName: 'Government Employee', categoryNameLocal: 'அரசு ஊழியர்', categoryColor: '#4CAF50' },
    { categoryName: 'Teacher', categoryNameLocal: 'ஆசிரியர்', categoryColor: '#2196F3' },
    { categoryName: 'Farmer', categoryNameLocal: 'விவசாயி', categoryColor: '#8BC34A' },
    { categoryName: 'Businessman', categoryNameLocal: 'வணிகர்', categoryColor: '#FF9800' },
    { categoryName: 'Senior Citizen', categoryNameLocal: 'மூத்த குடிமகன்', categoryColor: '#607D8B' },
    { categoryName: 'Youth', categoryNameLocal: 'இளைஞர்', categoryColor: '#9C27B0' },
  ];

  const createdVoterCategories: any[] = [];
  for (const [index, cat] of voterCategories.entries()) {
    const vc = await prisma.voterCategory.create({
      data: { electionId, ...cat, displayOrder: index + 1 }
    });
    createdVoterCategories.push(vc);
  }
  console.log('  ✓ Voter categories created');

  // Schemes
  const schemes = [
    { schemeName: 'PM-KISAN', schemeDescription: 'Farmer income support', schemeBy: 'UNION_GOVT' as const },
    { schemeName: 'Ayushman Bharat', schemeDescription: 'Health insurance', schemeBy: 'UNION_GOVT' as const },
    { schemeName: 'CM Free Provision', schemeDescription: 'Free rice scheme', schemeBy: 'STATE_GOVT' as const },
    { schemeName: 'Kalaignar Insurance', schemeDescription: 'State health insurance', schemeBy: 'STATE_GOVT' as const },
    { schemeName: 'Free Laptop Scheme', schemeDescription: 'Laptops for students', schemeBy: 'STATE_GOVT' as const },
  ];

  const createdSchemes: any[] = [];
  for (const scheme of schemes) {
    const s = await prisma.scheme.create({
      data: { electionId, ...scheme }
    });
    createdSchemes.push(s);
  }
  console.log('  ✓ Schemes created');

  // Voting History
  const votingHistories = [
    { historyName: 'Lok Sabha 2019', electionType: 'PARLIAMENT', electionYear: 2019, badgeText: 'LS19' },
    { historyName: 'Assembly 2021', electionType: 'ASSEMBLY', electionYear: 2021, badgeText: 'TN21' },
    { historyName: 'Local Body 2022', electionType: 'LOCAL_BODY', electionYear: 2022, badgeText: 'LB22' },
  ];

  const createdVotingHistories: any[] = [];
  for (const vh of votingHistories) {
    const v = await prisma.votingHistory.create({
      data: { electionId, ...vh }
    });
    createdVotingHistories.push(v);
  }
  console.log('  ✓ Voting histories created');

  return {
    religions: createdReligions,
    casteCategories: createdCategories,
    castes: createdCastes,
    languages: createdLanguages,
    voterCategories: createdVoterCategories,
    schemes: createdSchemes,
    votingHistories: createdVotingHistories,
  };
}

async function seedPartsAndBooths(electionId: string) {
  console.log('Creating parts and booths...');

  const parts: any[] = [];
  const booths: any[] = [];
  const sections: any[] = [];

  for (let partNum = 1; partNum <= CONFIG.TOTAL_PARTS; partNum++) {
    const area = KARAIKUDI_AREAS[(partNum - 1) % KARAIKUDI_AREAS.length];

    // Create Part
    const part = await prisma.part.create({
      data: {
        electionId,
        partNumber: partNum,
        boothName: `${area.name} Government School`,
        boothNameLocal: `${area.tamil} அரசுப் பள்ளி`,
        partType: Math.random() > 0.5 ? 'URBAN' : 'RURAL',
        address: `${area.name}, Karaikudi, Sivaganga District`,
        pincode: `630${String(partNum).padStart(3, '0')}`,
        latitude: 10.0689 + (Math.random() - 0.5) * 0.1,
        longitude: 78.7791 + (Math.random() - 0.5) * 0.1,
        totalVoters: CONFIG.VOTERS_PER_PART,
        maleVoters: Math.floor(CONFIG.VOTERS_PER_PART * 0.48),
        femaleVoters: Math.floor(CONFIG.VOTERS_PER_PART * 0.51),
        otherVoters: Math.floor(CONFIG.VOTERS_PER_PART * 0.01),
      }
    });
    parts.push(part);

    // Create Sections (2-3 per part)
    const sectionsPerPart = 2 + Math.floor(Math.random() * 2);
    for (let secNum = 1; secNum <= sectionsPerPart; secNum++) {
      const sectionNumber = (partNum - 1) * 10 + secNum;
      const section = await prisma.section.create({
        data: {
          electionId,
          partId: part.id,
          sectionNumber,
          sectionName: `Section ${sectionNumber} - ${area.name}`,
          sectionNameLocal: `பிரிவு ${sectionNumber} - ${area.tamil}`,
          totalVoters: Math.floor(CONFIG.VOTERS_PER_PART / sectionsPerPart),
        }
      });
      sections.push(section);
    }

    // Create Booths (2 per part)
    for (let boothNum = 1; boothNum <= 2; boothNum++) {
      const globalBoothNum = (partNum - 1) * 2 + boothNum;
      const booth = await prisma.booth.create({
        data: {
          electionId,
          partId: part.id,
          boothNumber: globalBoothNum,
          boothName: `Booth ${globalBoothNum} - ${area.name}`,
          boothNameLocal: `சாவடி ${globalBoothNum} - ${area.tamil}`,
          address: `${area.name} Government School, Room ${boothNum}`,
          latitude: 10.0689 + (Math.random() - 0.5) * 0.05,
          longitude: 78.7791 + (Math.random() - 0.5) * 0.05,
          totalVoters: Math.floor(CONFIG.VOTERS_PER_PART / 2),
        }
      });
      booths.push(booth);
    }

    process.stdout.write(`\r  Creating parts: ${partNum}/${CONFIG.TOTAL_PARTS}`);
  }

  console.log(`\n  ✓ ${parts.length} parts, ${sections.length} sections, ${booths.length} booths created`);
  return { parts, sections, booths };
}

async function seedFamiliesAndVoters(electionId: string, masterData: any, geoData: any) {
  console.log('Creating families and voters...');

  const { religions, castes, languages, voterCategories, schemes, votingHistories } = masterData;
  const { parts, sections, booths } = geoData;

  let totalVotersCreated = 0;
  let totalFamiliesCreated = 0;

  for (const part of parts) {
    const partSections = sections.filter((s: any) => s.partId === part.id);
    const partBooths = booths.filter((b: any) => b.partId === part.id);

    // Create families for this part
    for (let famNum = 1; famNum <= CONFIG.FAMILIES_PER_PART; famNum++) {
      const familySize = 2 + Math.floor(Math.random() * 4); // 2-5 members
      const area = KARAIKUDI_AREAS.find(a => part.boothName.includes(a.name)) || KARAIKUDI_AREAS[0];

      const family = await prisma.family.create({
        data: {
          electionId,
          familyName: `${getRandomElement(SURNAMES)} Family`,
          houseNumber: generateHouseNo(),
          address: `${area.name}, Karaikudi`,
          totalMembers: familySize,
        }
      });
      totalFamiliesCreated++;

      // Create family members (voters)
      for (let memberNum = 0; memberNum < familySize; memberNum++) {
        const isMale = memberNum === 0 ? true : (memberNum === 1 ? false : Math.random() > 0.5);
        const gender: Gender = isMale ? 'MALE' : 'FEMALE';
        const firstName = isMale ? getRandomElement(MALE_FIRST_NAMES) : getRandomElement(FEMALE_FIRST_NAMES);
        const surname = getRandomElement(SURNAMES);
        const dob = generateDOB(memberNum === 0 ? 30 : 18, memberNum === 0 ? 70 : 85);
        const age = new Date().getFullYear() - dob.getFullYear();

        const booth = getRandomElement(partBooths);
        const section = partSections.length > 0 ? getRandomElement(partSections) : null;

        const relationType: RelationType = memberNum === 0 ? 'FATHER' :
          (memberNum === 1 && !isMale ? 'WIFE' :
          (isMale ? 'FATHER' : 'MOTHER'));

        const voter = await prisma.voter.create({
          data: {
            electionId,
            partId: part.id,
            sectionId: section?.id,
            boothId: booth.id,
            familyId: family.id,
            epicNumber: generateEpicNo(),
            slNumber: totalVotersCreated + 1,
            name: `${firstName} ${surname}`,
            nameLocal: `${firstName} ${surname}`,
            fatherName: memberNum > 0 ? `${getRandomElement(MALE_FIRST_NAMES)} ${surname}` : null,
            relationType,
            gender,
            age,
            dateOfBirth: dob,
            mobile: Math.random() > 0.3 ? generatePhone() : null,
            houseNumber: family.houseNumber,
            address: family.address,
            religionId: getRandomElement(religions).id,
            casteCategoryId: getRandomElement(castes).casteCategoryId,
            casteId: getRandomElement(castes).id,
            languageId: getRandomElement(languages).id,
            voterCategoryId: Math.random() > 0.5 ? getRandomElement(voterCategories).id : null,
            politicalLeaning: getRandomElement(['LOYAL', 'SWING', 'OPPOSITION', 'UNKNOWN']) as PoliticalLeaning,
            influenceLevel: Math.random() > 0.9 ? 'HIGH' : (Math.random() > 0.7 ? 'MEDIUM' : 'LOW') as InfluenceLevel,
            isFamilyCaptain: memberNum === 0,
          }
        });

        totalVotersCreated++;

        // Add scheme beneficiary (30% chance)
        if (Math.random() > 0.7) {
          await prisma.voterScheme.create({
            data: {
              voterId: voter.id,
              schemeId: getRandomElement(schemes).id,
              isBeneficiary: true,
              enrollmentDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 28)),
            }
          });
        }

        // Add voting history (60% chance per election)
        for (const vh of votingHistories) {
          if (Math.random() > 0.4) {
            await prisma.voterVotingHistory.create({
              data: {
                voterId: voter.id,
                historyId: vh.id,
                voted: Math.random() > 0.3,
              }
            });
          }
        }
      }
    }

    process.stdout.write(`\r  Creating voters: ${totalVotersCreated} voters, ${totalFamiliesCreated} families`);
  }

  console.log(`\n  ✓ ${totalVotersCreated} voters in ${totalFamiliesCreated} families created`);
  return { totalVotersCreated, totalFamiliesCreated };
}

async function seedCadres(electionId: string, geoData: any) {
  console.log('Creating cadres...');

  const { parts, booths } = geoData;
  let cadreCount = 0;

  for (const part of parts) {
    const partBooths = booths.filter((b: any) => b.partId === part.id);

    // Create cadres for each part
    for (let i = 0; i < CONFIG.CADRES_PER_PART; i++) {
      const isMale = Math.random() > 0.4;
      const firstName = isMale ? getRandomElement(MALE_FIRST_NAMES) : getRandomElement(FEMALE_FIRST_NAMES);
      const surname = getRandomElement(SURNAMES);
      const role: CadreRole = i === 0 ? 'COORDINATOR' : (i === 1 ? 'BOOTH_INCHARGE' : getRandomElement(['VOLUNTEER', 'AGENT']));

      const cadre = await prisma.cadre.create({
        data: {
          electionId,
          name: `${firstName} ${surname}`,
          mobile: generatePhone(),
          email: Math.random() > 0.7 ? `${firstName.toLowerCase()}@example.com` : null,
          role,
          address: `${KARAIKUDI_AREAS[Math.floor(Math.random() * KARAIKUDI_AREAS.length)].name}, Karaikudi`,
          votersUpdated: Math.floor(Math.random() * 100),
          surveysCompleted: Math.floor(Math.random() * 20),
          isActive: true,
        }
      });

      // Assign cadre to part
      await prisma.cadreAssignment.create({
        data: {
          cadreId: cadre.id,
          partId: part.id,
          assignmentType: i === 0 ? 'PRIMARY' : 'SECONDARY' as AssignmentType,
        }
      });

      // Create booth agent for booth incharge
      if (role === 'BOOTH_INCHARGE' && partBooths.length > 0) {
        await prisma.boothAgent.create({
          data: {
            boothId: partBooths[i % partBooths.length].id,
            cadreId: cadre.id,
            agentType: 'polling',
            isActive: true,
          }
        });
      }

      cadreCount++;
    }

    process.stdout.write(`\r  Creating cadres: ${cadreCount}`);
  }

  console.log(`\n  ✓ ${cadreCount} cadres created with assignments`);
}

async function seedSurveys(electionId: string) {
  console.log('Creating surveys...');

  const surveys = [
    {
      surveyName: 'Voter Preference Survey',
      description: 'Understanding voter preferences for the upcoming election',
      questions: JSON.stringify([
        { id: 1, type: 'single', question: 'Which party do you support?', options: ['DMK', 'ADMK', 'BJP', 'Congress', 'Others'] },
        { id: 2, type: 'rating', question: 'Rate our candidate (1-5)' },
        { id: 3, type: 'multi', question: 'What issues matter most?', options: ['Employment', 'Healthcare', 'Education', 'Infrastructure'] },
      ]),
    },
    {
      surveyName: 'Development Priority Survey',
      description: 'Understanding development priorities',
      questions: JSON.stringify([
        { id: 1, type: 'single', question: 'Most important development need?', options: ['Roads', 'Water', 'Electricity', 'Schools', 'Hospitals'] },
        { id: 2, type: 'text', question: 'Any specific suggestions?' },
      ]),
    },
    {
      surveyName: 'Booth Level Feedback',
      description: 'Collecting feedback at booth level',
      questions: JSON.stringify([
        { id: 1, type: 'rating', question: 'Rate local infrastructure (1-5)' },
        { id: 2, type: 'single', question: 'Are you satisfied with current MLA?', options: ['Yes', 'No', 'Neutral'] },
      ]),
    },
  ];

  for (const survey of surveys) {
    await prisma.survey.create({
      data: {
        electionId,
        ...survey,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }

  console.log(`  ✓ ${surveys.length} surveys created`);
}

async function seedFeedbackIssues(electionId: string, geoData: any) {
  console.log('Creating feedback issues...');

  const { parts } = geoData;
  const issueCategories = ['Infrastructure', 'Water', 'Electricity', 'Roads', 'Drainage', 'Healthcare', 'Education'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

  let issueCount = 0;

  for (const part of parts.slice(0, 10)) { // Create issues for first 10 parts
    const numIssues = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numIssues; i++) {
      const category = getRandomElement(issueCategories);

      await prisma.feedbackIssue.create({
        data: {
          electionId,
          partId: part.id,
          issueName: `${category} issue in ${KARAIKUDI_AREAS[part.partNumber % KARAIKUDI_AREAS.length].name}`,
          issueNameLocal: `${KARAIKUDI_AREAS[part.partNumber % KARAIKUDI_AREAS.length].tamil} இல் பிரச்சினை`,
          issueDescription: `Reported ${category.toLowerCase()} related issue that needs attention`,
          category,
          status: getRandomElement(statuses),
          priority: getRandomElement(priorities),
          reportedCount: 1 + Math.floor(Math.random() * 10),
        }
      });
      issueCount++;
    }
  }

  console.log(`  ✓ ${issueCount} feedback issues created`);
}

async function seedPollDayData(electionId: string, geoData: any) {
  console.log('Creating poll day sample data...');

  const { booths } = geoData;
  const voters = await prisma.voter.findMany({
    where: { electionId },
    take: 500, // Get sample of voters
  });

  const cadres = await prisma.cadre.findMany({
    where: { electionId },
    take: 20,
  });

  let voteCount = 0;

  // Create poll day votes for some voters (simulating 40% turnout)
  for (const voter of voters.slice(0, Math.floor(voters.length * 0.4))) {
    if (voter.boothId) {
      await prisma.pollDayVote.create({
        data: {
          electionId,
          boothId: voter.boothId,
          voterId: voter.id,
          cadreId: cadres.length > 0 ? getRandomElement(cadres).id : null,
          votedAt: new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000), // Random time in last 8 hours
        }
      });
      voteCount++;
    }
  }

  console.log(`  ✓ ${voteCount} poll day votes recorded`);
}

async function seedReports(electionId: string) {
  console.log('Creating dashboard reports...');

  const reportTypes = [
    { type: 'VOTER_DEMOGRAPHICS', name: 'Voter Demographics Report', description: 'Analysis of voter demographics by age, gender, caste' },
    { type: 'BOOTH_STATISTICS', name: 'Booth Statistics Report', description: 'Performance metrics for all booths' },
    { type: 'CADRE_PERFORMANCE', name: 'Cadre Performance Report', description: 'Activity tracking for all cadres' },
    { type: 'POLL_DAY_TURNOUT', name: 'Poll Day Turnout Report', description: 'Voter turnout analysis by polling station' },
    { type: 'FEEDBACK_SUMMARY', name: 'Feedback Summary Report', description: 'Summary of voter feedback and issues' },
    { type: 'FAMILY_ANALYSIS', name: 'Family Analysis Report', description: 'Family-wise voting pattern analysis' },
    { type: 'SCHEME_BENEFICIARIES', name: 'Scheme Beneficiaries Report', description: 'Analysis of government scheme beneficiaries' },
    { type: 'CUSTOM', name: 'Campaign Progress Report', description: 'Overall campaign progress metrics' },
  ];

  for (const report of reportTypes) {
    await prisma.report.create({
      data: {
        electionId,
        reportName: report.name,
        reportType: report.type as any,
        description: report.description,
        filters: JSON.stringify({ dateRange: 'last_30_days', includeAllParts: true }),
        format: 'PDF',
        generatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        isScheduled: Math.random() > 0.5,
        scheduleExpr: Math.random() > 0.5 ? '0 0 * * MON' : null,
      }
    });
  }

  console.log(`  ✓ ${reportTypes.length} reports created`);
}

async function seedAIAnalytics(electionId: string) {
  console.log('Creating AI analytics results...');

  const analyticsTypes = [
    {
      type: 'VOTER_SENTIMENT',
      name: 'Voter Sentiment Analysis',
      results: {
        overallSentiment: 0.72,
        positiveVoters: 45,
        negativeVoters: 15,
        neutralVoters: 40,
        topPositiveIssues: ['Infrastructure Development', 'Healthcare Improvements', 'Education Schemes'],
        topNegativeIssues: ['Unemployment', 'Rising Prices', 'Water Scarcity'],
        sentimentByPart: Array.from({ length: 20 }, (_, i) => ({
          partNumber: i + 1,
          sentiment: 0.5 + Math.random() * 0.4,
          sampleSize: 100 + Math.floor(Math.random() * 200),
        })),
      },
      insights: [
        { insight: 'Youth voters (18-30) show 15% higher positive sentiment', confidence: 0.85 },
        { insight: 'Rural parts have higher concerns about water infrastructure', confidence: 0.92 },
        { insight: 'Government scheme beneficiaries are 2x more likely to show positive sentiment', confidence: 0.88 },
      ],
      confidence: 0.87,
    },
    {
      type: 'TURNOUT_PREDICTION',
      name: 'Voter Turnout Prediction',
      results: {
        predictedTurnout: 72.5,
        confidenceInterval: [68.2, 76.8],
        turnoutByPart: Array.from({ length: 20 }, (_, i) => ({
          partNumber: i + 1,
          predictedTurnout: 65 + Math.random() * 20,
          historicalAvg: 70 + Math.random() * 10,
        })),
        factors: {
          weather: 'favorable',
          politicalInterest: 'high',
          incumbentFactor: 0.82,
        },
      },
      insights: [
        { insight: 'Expected 5% increase from 2019 turnout due to new voter registration', confidence: 0.78 },
        { insight: 'Urban parts may see lower turnout due to migration', confidence: 0.72 },
        { insight: 'First-time voters show 80% likelihood to vote', confidence: 0.85 },
      ],
      confidence: 0.82,
    },
    {
      type: 'SWING_VOTER_ANALYSIS',
      name: 'Swing Voter Identification',
      results: {
        totalSwingVoters: 4500,
        swingVoterPercent: 22.5,
        keyDemographics: {
          age: '25-45',
          occupation: ['Business', 'Self-employed'],
          education: 'Graduate+',
        },
        influenceFactors: ['Development', 'Employment', 'Local Issues'],
        swingByPart: Array.from({ length: 20 }, (_, i) => ({
          partNumber: i + 1,
          swingCount: 150 + Math.floor(Math.random() * 150),
          swingPercent: 15 + Math.random() * 20,
        })),
      },
      insights: [
        { insight: 'Business community shows highest swing potential (35%)', confidence: 0.91 },
        { insight: 'Parts 5, 12, 18 have highest concentration of swing voters', confidence: 0.88 },
        { insight: 'Local infrastructure issues are primary concern for swing voters', confidence: 0.85 },
      ],
      confidence: 0.89,
    },
    {
      type: 'BOOTH_RISK_ASSESSMENT',
      name: 'Booth Risk Assessment',
      results: {
        highRiskBooths: [3, 7, 15, 22, 31],
        riskFactors: {
          communalTension: [7, 15],
          politicalClash: [3, 22],
          infrastructureIssues: [31],
        },
        recommendations: [
          { boothId: 7, action: 'Deploy additional security', priority: 'HIGH' },
          { boothId: 15, action: 'Community outreach program', priority: 'HIGH' },
          { boothId: 3, action: 'Coordinate with local leaders', priority: 'MEDIUM' },
        ],
      },
      insights: [
        { insight: '12.5% of booths require additional attention', confidence: 0.92 },
        { insight: 'Historical data shows reduced incidents with early intervention', confidence: 0.85 },
      ],
      confidence: 0.91,
    },
    {
      type: 'CAMPAIGN_EFFECTIVENESS',
      name: 'Campaign Effectiveness Analysis',
      results: {
        overallEffectiveness: 0.78,
        channelPerformance: {
          doorToDoor: 0.85,
          publicMeetings: 0.72,
          socialMedia: 0.68,
          phoneOutreach: 0.75,
        },
        messageResonance: {
          development: 0.82,
          welfare: 0.78,
          employment: 0.71,
          infrastructure: 0.80,
        },
        cadreEfficiency: 0.76,
        voterReach: 65,
      },
      insights: [
        { insight: 'Door-to-door campaigns show highest voter conversion', confidence: 0.88 },
        { insight: 'Development messaging resonates best with 35+ age group', confidence: 0.82 },
        { insight: 'Social media underperforming in rural parts', confidence: 0.79 },
      ],
      confidence: 0.84,
    },
    {
      type: 'DEMOGRAPHIC_INSIGHTS',
      name: 'Demographic Deep Dive',
      results: {
        ageDistribution: {
          '18-25': 18,
          '26-35': 22,
          '36-45': 20,
          '46-60': 25,
          '60+': 15,
        },
        genderRatio: { male: 49, female: 50, other: 1 },
        casteBreakdown: {
          'OC': 25,
          'BC': 35,
          'MBC': 20,
          'SC': 15,
          'ST': 5,
        },
        occupationDistribution: {
          'Agriculture': 30,
          'Business': 15,
          'Government': 10,
          'Private': 20,
          'Self-employed': 15,
          'Others': 10,
        },
      },
      insights: [
        { insight: 'Youth voter registration up 12% from last election', confidence: 0.95 },
        { insight: 'Female voter participation expected to exceed male for first time', confidence: 0.82 },
        { insight: 'BC community shows strongest party alignment', confidence: 0.87 },
      ],
      confidence: 0.93,
    },
  ];

  for (const analytics of analyticsTypes) {
    await prisma.aIAnalyticsResult.create({
      data: {
        electionId,
        analysisType: analytics.type as any,
        analysisName: analytics.name,
        description: `AI-powered ${analytics.name.toLowerCase()} for Karaikudi constituency`,
        parameters: JSON.stringify({ constituency: 'Karaikudi', sampleSize: 5000 }),
        results: JSON.stringify(analytics.results),
        insights: JSON.stringify(analytics.insights),
        confidence: analytics.confidence,
        status: 'COMPLETED',
        processedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      }
    });
  }

  console.log(`  ✓ ${analyticsTypes.length} AI analytics results created`);
}

async function seedNewsInformation(electionId: string) {
  console.log('Creating news and information...');

  const newsItems = [
    {
      title: 'CM announces new water scheme for Sivaganga district',
      titleLocal: 'சிவகங்கை மாவட்டத்திற்கு புதிய நீர் திட்டம் முதல்வர் அறிவிப்பு',
      summary: 'Chief Minister announced Rs. 500 crore water infrastructure project benefiting 50,000 families in Sivaganga district including Karaikudi constituency.',
      category: 'GOVERNMENT_SCHEME',
      priority: 'HIGH',
      geographicLevel: 'DISTRICT',
      source: 'OFFICIAL',
      impactScore: 85,
      sentimentScore: 0.8,
    },
    {
      title: 'Opposition alleges fund misuse in local body elections',
      titleLocal: 'உள்ளாட்சி தேர்தலில் நிதி முறைகேடு என எதிர்க்கட்சி குற்றச்சாட்டு',
      summary: 'Opposition party raises questions about allocation of funds during recent local body elections in the constituency.',
      category: 'POLITICAL',
      priority: 'MEDIUM',
      geographicLevel: 'CONSTITUENCY',
      source: 'MEDIA',
      impactScore: 65,
      sentimentScore: -0.4,
    },
    {
      title: 'New hospital inaugurated in Karaikudi',
      titleLocal: 'காரைக்குடியில் புதிய மருத்துவமனை திறப்பு',
      summary: '200-bed multi-specialty hospital inaugurated to serve healthcare needs of Karaikudi and surrounding areas.',
      category: 'HEALTH',
      priority: 'HIGH',
      geographicLevel: 'CONSTITUENCY',
      source: 'OFFICIAL',
      impactScore: 78,
      sentimentScore: 0.9,
    },
    {
      title: 'Farmers protest over crop insurance delays',
      titleLocal: 'பயிர் காப்பீடு தாமதம் - விவசாயிகள் போராட்டம்',
      summary: 'Farmers from Devakottai and Kallal areas protest over delayed crop insurance payments affecting over 2000 families.',
      category: 'LOCAL_ISSUE',
      priority: 'HIGH',
      geographicLevel: 'SECTION',
      source: 'FIELD_REPORT',
      impactScore: 72,
      sentimentScore: -0.6,
    },
    {
      title: 'Youth employment fair attracts 5000 candidates',
      titleLocal: 'இளைஞர் வேலைவாய்ப்பு கண்காட்சியில் 5000 பேர் பங்கேற்பு',
      summary: 'State government employment fair held in Karaikudi sees participation from major companies offering 500+ jobs.',
      category: 'ECONOMIC',
      priority: 'MEDIUM',
      geographicLevel: 'CONSTITUENCY',
      source: 'MEDIA',
      impactScore: 70,
      sentimentScore: 0.7,
    },
    {
      title: 'Road development project completion announced',
      titleLocal: 'சாலை மேம்பாட்டு திட்டம் நிறைவு அறிவிப்பு',
      summary: 'District collector announces completion of 45km road development project connecting rural parts to Karaikudi town.',
      category: 'INFRASTRUCTURE',
      priority: 'MEDIUM',
      geographicLevel: 'DISTRICT',
      source: 'OFFICIAL',
      impactScore: 75,
      sentimentScore: 0.85,
    },
    {
      title: 'Education scheme benefits 10000 students',
      titleLocal: 'கல்வி திட்டம் 10000 மாணவர்களுக்கு பயன்',
      summary: 'Free laptop and scholarship scheme distributed to students from government schools across the constituency.',
      category: 'EDUCATION',
      priority: 'HIGH',
      geographicLevel: 'CONSTITUENCY',
      source: 'OFFICIAL',
      impactScore: 82,
      sentimentScore: 0.9,
    },
    {
      title: 'Local market renovation plan approved',
      titleLocal: 'உள்ளூர் சந்தை புனரமைப்பு திட்டம் அங்கீகாரம்',
      summary: 'Rs. 5 crore renovation plan for Karaikudi central market approved by local body, expected to benefit 500 vendors.',
      category: 'DEVELOPMENT',
      priority: 'MEDIUM',
      geographicLevel: 'CONSTITUENCY',
      source: 'OFFICIAL',
      impactScore: 68,
      sentimentScore: 0.75,
    },
  ];

  const tenantId = 'demo-tenant';
  for (const news of newsItems) {
    await prisma.newsInformation.create({
      data: {
        tenantId,
        title: news.title,
        titleLocal: news.titleLocal,
        summary: news.summary,
        content: `${news.summary}\n\nThis is detailed content about the news item. It includes more information about the developments and their implications for the constituency.`,
        category: news.category as any,
        priority: news.priority as any,
        status: 'PUBLISHED',
        geographicLevel: news.geographicLevel as any,
        source: news.source as any,
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        country: 'India',
        impactScore: news.impactScore,
        sentimentScore: news.sentimentScore,
        relevanceScore: 0.7 + Math.random() * 0.3,
        publishedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        tags: JSON.stringify([news.category.toLowerCase(), 'karaikudi', 'sivaganga']),
        keywords: JSON.stringify([news.title.split(' ').slice(0, 3).join(' ').toLowerCase()]),
      }
    });
  }

  console.log(`  ✓ ${newsItems.length} news items created`);
}

async function seedActionItems(electionId: string) {
  console.log('Creating action items...');

  const tenantId = 'demo-tenant';
  const actions = [
    {
      title: 'Organize water issue awareness camp',
      titleLocal: 'நீர் பிரச்சினை விழிப்புணர்வு முகாம் ஏற்பாடு',
      description: 'Conduct awareness camp about upcoming water scheme and register beneficiaries in affected areas.',
      actionType: 'FIELD_VISIT',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Media response to opposition allegations',
      titleLocal: 'எதிர்க்கட்சி குற்றச்சாட்டுக்கு ஊடக பதில்',
      description: 'Prepare factual response with documented evidence to counter opposition claims about fund misuse.',
      actionType: 'MEDIA_RESPONSE',
      priority: 'URGENT',
      status: 'APPROVED',
    },
    {
      title: 'Meet with farmers association',
      titleLocal: 'விவசாயிகள் சங்கத்துடன் சந்திப்பு',
      description: 'Schedule meeting with farmers association to discuss crop insurance delays and propose solutions.',
      actionType: 'MEETING',
      priority: 'HIGH',
      status: 'PENDING_REVIEW',
    },
    {
      title: 'Youth outreach program',
      titleLocal: 'இளைஞர் தொடர்பு திட்டம்',
      description: 'Conduct outreach program targeting first-time voters in colleges and youth organizations.',
      actionType: 'VOTER_OUTREACH',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Survey in swing voter areas',
      titleLocal: 'ஊசலாடும் வாக்காளர் பகுதிகளில் கருத்துக்கணிப்பு',
      description: 'Conduct targeted survey in parts 5, 12, 18 to understand concerns of swing voters.',
      actionType: 'SURVEY',
      priority: 'HIGH',
      status: 'SUGGESTED',
    },
    {
      title: 'Resolve drainage issue in Part 7',
      titleLocal: 'பகுதி 7-ல் வடிகால் பிரச்சினை தீர்வு',
      description: 'Coordinate with local body to address drainage complaints reported by multiple voters.',
      actionType: 'ISSUE_RESOLUTION',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Hospital inauguration coverage',
      titleLocal: 'மருத்துவமனை திறப்பு விழா செய்தி',
      description: 'Ensure proper media coverage and voter communication about new hospital benefits.',
      actionType: 'COMMUNICATION',
      priority: 'MEDIUM',
      status: 'COMPLETED',
    },
    {
      title: 'Monitor opposition campaign in Devakottai',
      titleLocal: 'தேவகோட்டையில் எதிர்க்கட்சி பிரச்சாரம் கண்காணிப்பு',
      description: 'Track and report opposition party activities and messaging in Devakottai area.',
      actionType: 'MONITORING',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
  ];

  for (const action of actions) {
    await prisma.actionItem.create({
      data: {
        tenantId,
        title: action.title,
        titleLocal: action.titleLocal,
        description: action.description,
        actionType: action.actionType as any,
        priority: action.priority as any,
        status: action.status as any,
        geographicLevel: 'CONSTITUENCY',
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      }
    });
  }

  console.log(`  ✓ ${actions.length} action items created`);
}

async function seedNBParsedNews(electionId: string) {
  console.log('Creating NB parsed news and analysis...');

  const tenantId = 'demo-tenant';

  const parsedNewsItems = [
    {
      originalTitle: 'CM announces major infrastructure push for Sivaganga',
      parsedTitle: 'Infrastructure Development Initiative - Sivaganga District',
      parsedSummary: 'Chief Minister announced comprehensive infrastructure development plan including roads, water supply, and healthcare facilities for Sivaganga district.',
      keyPoints: [
        'Rs. 1000 crore allocation for district development',
        'Focus on rural connectivity and water infrastructure',
        'New healthcare facilities in key towns',
        'Timeline of 2 years for completion',
      ],
      mentionedParties: ['DMK', 'ADMK'],
      mentionedPersons: ['Chief Minister', 'District Collector', 'Local MLA'],
      mentionedPlaces: ['Sivaganga', 'Karaikudi', 'Devakottai', 'Kallal'],
      mentionedSchemes: ['Jal Jeevan Mission', 'PM Gram Sadak Yojana'],
      sentiment: 'positive',
      sentimentScore: 0.82,
      impactLevel: 'high',
      category: 'Development',
    },
    {
      originalTitle: 'Election Commission announces poll dates for Tamil Nadu by-elections',
      parsedTitle: 'By-Election Schedule Announcement',
      parsedSummary: 'Election Commission has announced dates for by-elections in 5 constituencies including Karaikudi, with voting scheduled for next month.',
      keyPoints: [
        'By-elections in 5 constituencies',
        'Karaikudi included in the list',
        'Model code of conduct in effect',
        'Special security arrangements announced',
      ],
      mentionedParties: ['EC', 'DMK', 'ADMK', 'BJP', 'Congress'],
      mentionedPersons: ['Chief Election Commissioner'],
      mentionedPlaces: ['Karaikudi', 'Chennai', 'Tamil Nadu'],
      mentionedSchemes: [],
      sentiment: 'neutral',
      sentimentScore: 0.1,
      impactLevel: 'high',
      category: 'Election',
    },
    {
      originalTitle: 'Opposition criticizes government over unemployment figures',
      parsedTitle: 'Opposition Critique on Employment Statistics',
      parsedSummary: 'Opposition party releases alternative employment data claiming government figures are misleading, demands policy changes.',
      keyPoints: [
        'Opposition claims 15% unemployment vs government 5%',
        'Focus on youth unemployment in rural areas',
        'Demands industrial investment in region',
        'Calls for skill development programs',
      ],
      mentionedParties: ['ADMK', 'DMK'],
      mentionedPersons: ['Opposition Leader', 'Finance Minister'],
      mentionedPlaces: ['Tamil Nadu', 'Sivaganga'],
      mentionedSchemes: ['Skill India', 'MSME schemes'],
      sentiment: 'negative',
      sentimentScore: -0.6,
      impactLevel: 'medium',
      category: 'Political',
    },
  ];

  for (const news of parsedNewsItems) {
    const parsedNews = await prisma.nBParsedNews.create({
      data: {
        tenantId,
        electionId,
        originalTitle: news.originalTitle,
        parsedTitle: news.parsedTitle,
        parsedSummary: news.parsedSummary,
        keyPoints: JSON.stringify(news.keyPoints),
        mentionedParties: JSON.stringify(news.mentionedParties),
        mentionedPersons: JSON.stringify(news.mentionedPersons),
        mentionedPlaces: JSON.stringify(news.mentionedPlaces),
        mentionedSchemes: JSON.stringify(news.mentionedSchemes),
        mentionedIssues: JSON.stringify([]),
        sentiment: news.sentiment,
        sentimentScore: news.sentimentScore,
        impactLevel: news.impactLevel,
        relevanceScore: 0.8,
        geographicLevel: 'CONSTITUENCY',
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        category: news.category,
        subCategories: JSON.stringify([news.category.toLowerCase()]),
        tags: JSON.stringify([news.category.toLowerCase(), 'karaikudi']),
        source: 'Media',
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        analysisStatus: 'COMPLETED',
      }
    });

    // Create news analysis for each parsed news
    await prisma.nBNewsAnalysis.create({
      data: {
        tenantId,
        parsedNewsId: parsedNews.id,
        electionId,
        analysisType: 'impact',
        summary: `AI analysis of "${news.parsedTitle}" and its implications for the campaign.`,
        detailedAnalysis: `This news item has significant implications for the upcoming election. The ${news.sentiment} sentiment (score: ${news.sentimentScore}) indicates ${news.sentiment === 'positive' ? 'favorable' : news.sentiment === 'negative' ? 'challenging' : 'neutral'} conditions for the campaign.`,
        opportunities: JSON.stringify([
          'Leverage development announcements in campaign messaging',
          'Highlight government achievements to swing voters',
          'Use as talking point in public meetings',
        ]),
        threats: JSON.stringify([
          'Opposition may counter with alternative narratives',
          'Implementation delays could backfire',
        ]),
        recommendations: JSON.stringify([
          'Prepare ground-level communication about benefits',
          'Train cadres with key talking points',
          'Monitor opposition response',
        ]),
        voterImpactScore: 75 + Math.random() * 20,
        mediaImpactScore: 60 + Math.random() * 30,
        aiModel: 'gpt-4',
        aiConfidence: 0.85,
        status: 'COMPLETED',
      }
    });
  }

  console.log(`  ✓ ${parsedNewsItems.length} NB parsed news and analyses created`);
}

async function seedNBPartyLines(electionId: string) {
  console.log('Creating NB party lines...');

  const tenantId = 'demo-tenant';

  const partyLines = [
    {
      level: 'CENTRAL_COMMITTEE',
      title: 'Infrastructure Development Message',
      titleLocal: 'உள்கட்டமைப்பு வளர்ச்சி செய்தி',
      mainMessage: 'Our government has brought unprecedented development to the region with Rs. 1000 crore investment in infrastructure. Every family will benefit from improved roads, water supply, and healthcare.',
      whatToSay: [
        'Highlight the Rs. 1000 crore investment figure',
        'Mention specific projects in each area',
        'Emphasize timeline and accountability',
      ],
      whatNotToSay: [
        'Do not make unrealistic promises',
        'Avoid comparing with opposition directly',
        'Do not discuss pending projects negatively',
      ],
    },
    {
      level: 'CONSTITUENCY_HEAD',
      title: 'Employment and Youth Messaging',
      titleLocal: 'வேலைவாய்ப்பு மற்றும் இளைஞர் செய்தி',
      mainMessage: 'We are committed to creating 10,000 new jobs in the constituency through industrial development and skill training programs. Youth are our priority.',
      whatToSay: [
        'Mention successful job fairs and placements',
        'Highlight skill development programs',
        'Share success stories of local youth',
      ],
      whatNotToSay: [
        'Do not acknowledge high unemployment directly',
        'Avoid discussing migration for jobs',
        'Do not criticize private employers',
      ],
    },
    {
      level: 'BOOTH_INCHARGE',
      title: 'Local Issues Response',
      titleLocal: 'உள்ளூர் பிரச்சினைகளுக்கு பதில்',
      mainMessage: 'We listen to every concern and act on it. Your MLA has personally intervened in resolving local issues including water, drainage, and road repairs.',
      whatToSay: [
        'Mention specific resolved issues in the area',
        'Share MLA contact details for complaints',
        'Explain grievance resolution process',
      ],
      whatNotToSay: [
        'Do not dismiss any complaint',
        'Avoid blaming other departments',
        'Do not make false commitments',
      ],
    },
  ];

  for (const pl of partyLines) {
    await prisma.nBPartyLine.create({
      data: {
        tenantId,
        electionId,
        level: pl.level as any,
        roleTargets: JSON.stringify([]),
        geographicLevel: 'CONSTITUENCY',
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        title: pl.title,
        titleLocal: pl.titleLocal,
        mainMessage: pl.mainMessage,
        mainMessageLocal: pl.mainMessage,
        whatToSay: JSON.stringify(pl.whatToSay),
        howToSay: JSON.stringify(['Speak with confidence', 'Use local examples', 'Be empathetic']),
        whatNotToSay: JSON.stringify(pl.whatNotToSay),
        counterPoints: JSON.stringify(['Opposition claims are based on outdated data', 'We have documentary proof of our achievements']),
        audienceGuidelines: JSON.stringify({}),
        facts: JSON.stringify(['Rs. 1000 crore investment', '50+ projects completed', '10,000 jobs created']),
        statistics: JSON.stringify(['72% voter satisfaction', '85% scheme delivery rate']),
        examples: JSON.stringify(['Kovilur road completion', 'Devakottai water project']),
        isActive: true,
        status: 'approved',
        isAiGenerated: true,
        aiConfidence: 0.88,
      }
    });
  }

  console.log(`  ✓ ${partyLines.length} NB party lines created`);
}

async function seedNBSpeechPoints(electionId: string) {
  console.log('Creating NB speech points...');

  const tenantId = 'demo-tenant';

  const speechPoints = [
    {
      title: 'Infrastructure Achievement',
      titleLocal: 'உள்கட்டமைப்பு சாதனை',
      content: 'In the last 3 years, we have completed 45 km of new roads connecting every village to Karaikudi town. No more dusty paths - now every farmer can transport their produce easily to the market.',
      pointType: 'KEY_MESSAGE',
      priority: 'MUST_MENTION',
      targetAudience: ['Farmers', 'Rural voters'],
      suggestedTone: 'inspiring',
    },
    {
      title: 'Healthcare Improvement',
      titleLocal: 'சுகாதார மேம்பாடு',
      content: 'The new 200-bed hospital means no family needs to travel to Madurai or Chennai for treatment anymore. Quality healthcare is now at your doorstep.',
      pointType: 'KEY_MESSAGE',
      priority: 'MUST_MENTION',
      targetAudience: ['Elderly', 'Women', 'Families'],
      suggestedTone: 'empathetic',
    },
    {
      title: 'Opposition Counter - Employment',
      titleLocal: 'எதிர்க்கட்சி மறுப்பு - வேலைவாய்ப்பு',
      content: 'The opposition talks about unemployment but forgets that we organized 5 job fairs placing 2000+ youth in good jobs. Ask any young person in your family - they have seen the change.',
      pointType: 'COUNTER_NARRATIVE',
      priority: 'RECOMMENDED',
      targetAudience: ['Youth', 'Parents'],
      suggestedTone: 'assertive',
    },
    {
      title: 'Water Scheme Benefits',
      titleLocal: 'நீர் திட்ட பயன்கள்',
      content: 'Under Jal Jeevan Mission, 15,000 households now have tap water connections. Your mothers and sisters no longer need to walk kilometers for water.',
      pointType: 'KEY_MESSAGE',
      priority: 'MUST_MENTION',
      targetAudience: ['Women', 'Rural households'],
      suggestedTone: 'empathetic',
    },
    {
      title: 'Education Success Story',
      titleLocal: 'கல்வி வெற்றிக்கதை',
      content: '10,000 students received free laptops this year. Our children are learning digital skills and competing with city students. This is the foundation for their future.',
      pointType: 'SCHEME_HIGHLIGHT',
      priority: 'RECOMMENDED',
      targetAudience: ['Parents', 'Students', 'Youth'],
      suggestedTone: 'inspiring',
    },
  ];

  for (const sp of speechPoints) {
    await prisma.nBSpeechPoint.create({
      data: {
        tenantId,
        electionId,
        title: sp.title,
        titleLocal: sp.titleLocal,
        content: sp.content,
        contentLocal: sp.content,
        pointType: sp.pointType as any,
        priority: sp.priority as any,
        order: speechPoints.indexOf(sp) + 1,
        context: 'Use in public meetings and door-to-door campaigns',
        targetAudience: JSON.stringify(sp.targetAudience),
        effectiveFor: JSON.stringify([]),
        supportingFacts: JSON.stringify(['Government data', 'Independent surveys']),
        relatedSchemes: JSON.stringify([]),
        localExamples: JSON.stringify(['Karaikudi success stories']),
        suggestedTone: sp.suggestedTone,
        suggestedDuration: '2-3 minutes',
        visualAids: JSON.stringify([]),
        geographicLevel: 'CONSTITUENCY',
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        isActive: true,
        status: 'approved',
        isAiGenerated: true,
        aiConfidence: 0.85,
      }
    });
  }

  console.log(`  ✓ ${speechPoints.length} NB speech points created`);
}

async function seedNBActionPlans(electionId: string) {
  console.log('Creating NB action plans...');

  const tenantId = 'demo-tenant';

  const actionPlans = [
    {
      title: 'Respond to Water Scheme News',
      titleLocal: 'நீர் திட்ட செய்திக்கு பதில்',
      description: 'Leverage the CM water scheme announcement to strengthen voter outreach in rural parts.',
      objective: 'Convert positive news into voter support through targeted communication',
      targetLevel: 'CONSTITUENCY_HEAD',
      actionItems: [
        { task: 'Identify beneficiary families in each part', deadline: '3 days', priority: 'high' },
        { task: 'Prepare localized communication materials', deadline: '5 days', priority: 'high' },
        { task: 'Train cadres on scheme details', deadline: '7 days', priority: 'medium' },
        { task: 'Conduct door-to-door awareness', deadline: '14 days', priority: 'high' },
      ],
      urgency: 'high',
      status: 'approved',
    },
    {
      title: 'Counter Opposition Employment Claims',
      titleLocal: 'எதிர்க்கட்சி வேலைவாய்ப்பு கூற்றுகளை எதிர்கொள்',
      description: 'Prepare and execute counter-narrative strategy against opposition unemployment claims.',
      objective: 'Neutralize negative narrative with factual data and success stories',
      targetLevel: 'CENTRAL_COMMITTEE',
      actionItems: [
        { task: 'Compile employment data from all job fairs', deadline: '2 days', priority: 'urgent' },
        { task: 'Identify 10 success stories from constituency', deadline: '3 days', priority: 'high' },
        { task: 'Prepare media brief with facts', deadline: '4 days', priority: 'high' },
        { task: 'Brief all spokespersons', deadline: '5 days', priority: 'high' },
      ],
      urgency: 'urgent',
      status: 'in_progress',
    },
    {
      title: 'Booth-Level Farmer Outreach',
      titleLocal: 'சாவடி நிலை விவசாயி தொடர்பு',
      description: 'Address farmer concerns about crop insurance delays through direct engagement.',
      objective: 'Resolve grievances and retain farmer support',
      targetLevel: 'BOOTH_INCHARGE',
      actionItems: [
        { task: 'List all pending insurance claims by part', deadline: '2 days', priority: 'high' },
        { task: 'Coordinate with insurance department', deadline: '5 days', priority: 'high' },
        { task: 'Organize farmer meetings in affected areas', deadline: '7 days', priority: 'medium' },
        { task: 'Follow up on claim status', deadline: '14 days', priority: 'medium' },
      ],
      urgency: 'high',
      status: 'pending_review',
    },
  ];

  for (const ap of actionPlans) {
    await prisma.nBActionPlan.create({
      data: {
        tenantId,
        electionId,
        title: ap.title,
        titleLocal: ap.titleLocal,
        description: ap.description,
        objective: ap.objective,
        targetLevel: ap.targetLevel as any,
        targetRoles: JSON.stringify([]),
        geographicLevel: 'CONSTITUENCY',
        state: 'Tamil Nadu',
        district: 'Sivaganga',
        constituency: 'Karaikudi',
        actionItems: JSON.stringify(ap.actionItems),
        suggestedStartDate: new Date(),
        suggestedEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        urgency: ap.urgency,
        requiredResources: JSON.stringify(['Communication materials', 'Transportation', 'Cadre time']),
        estimatedCost: 50000 + Math.random() * 100000,
        manpowerNeeded: 10 + Math.floor(Math.random() * 20),
        successMetrics: JSON.stringify(['Voter reach %', 'Issue resolution rate', 'Positive feedback']),
        kpis: JSON.stringify([]),
        status: ap.status,
        isAiGenerated: true,
        aiConfidence: 0.82,
      }
    });
  }

  console.log(`  ✓ ${actionPlans.length} NB action plans created`);
}

// ==================== UP 2022 ASSEMBLY ELECTION ====================

async function seedUPElection() {
  console.log('\n' + '='.repeat(60));
  console.log('Creating UP 2022 Assembly Election Data...');
  console.log('='.repeat(60));

  const election = await prisma.election.create({
    data: {
      id: 'up-election-2022',
      tenantId: 'demo-tenant',
      name: 'Uttar Pradesh Assembly Election 2022',
      nameLocal: 'उत्तर प्रदेश विधानसभा चुनाव 2022',
      electionType: 'ASSEMBLY',
      state: 'Uttar Pradesh',
      constituency: 'Lucknow Central',
      district: 'Lucknow',
      candidateName: 'Rajesh Kumar Singh',
      pollDate: new Date('2022-02-20'),
      startDate: new Date('2022-01-15'),
      endDate: new Date('2022-03-10'),
      status: 'COMPLETED',
      totalVoters: UP_CONFIG.TOTAL_PARTS * UP_CONFIG.VOTERS_PER_PART,
      totalParts: UP_CONFIG.TOTAL_PARTS,
      totalBooths: UP_CONFIG.TOTAL_PARTS * 2,
    }
  });

  console.log(`  ✓ UP Election created: ${election.name}`);
  return election;
}

async function seedUPMasterData(electionId: string) {
  console.log('Creating UP master data...');

  // Religions
  const religions = [
    { religionName: 'Hindu', religionNameLocal: 'हिन्दू', religionColor: '#FF6B00' },
    { religionName: 'Muslim', religionNameLocal: 'मुस्लिम', religionColor: '#00CC66' },
    { religionName: 'Sikh', religionNameLocal: 'सिख', religionColor: '#FF9900' },
    { religionName: 'Christian', religionNameLocal: 'ईसाई', religionColor: '#0066CC' },
  ];

  const createdReligions: any[] = [];
  for (const [index, rel] of religions.entries()) {
    const religion = await prisma.religion.create({
      data: { electionId, ...rel, displayOrder: index + 1 }
    });
    createdReligions.push(religion);
  }

  // Caste Categories
  const casteCategories = [
    { categoryName: 'General', categoryFullName: 'General Category' },
    { categoryName: 'OBC', categoryFullName: 'Other Backward Classes' },
    { categoryName: 'SC', categoryFullName: 'Scheduled Castes' },
    { categoryName: 'ST', categoryFullName: 'Scheduled Tribes' },
  ];

  const createdCategories: any[] = [];
  for (const [index, cat] of casteCategories.entries()) {
    const category = await prisma.casteCategory.create({
      data: { electionId, ...cat, displayOrder: index + 1 }
    });
    createdCategories.push(category);
  }

  // Castes
  const castes = [
    { casteName: 'Brahmin', casteNameLocal: 'ब्राह्मण', categoryIndex: 0 },
    { casteName: 'Thakur', casteNameLocal: 'ठाकुर', categoryIndex: 0 },
    { casteName: 'Vaishya', casteNameLocal: 'वैश्य', categoryIndex: 0 },
    { casteName: 'Yadav', casteNameLocal: 'यादव', categoryIndex: 1 },
    { casteName: 'Kurmi', casteNameLocal: 'कुर्मी', categoryIndex: 1 },
    { casteName: 'Maurya', casteNameLocal: 'मौर्य', categoryIndex: 1 },
    { casteName: 'Lodh', casteNameLocal: 'लोध', categoryIndex: 1 },
    { casteName: 'Jatav', casteNameLocal: 'जाटव', categoryIndex: 2 },
    { casteName: 'Pasi', casteNameLocal: 'पासी', categoryIndex: 2 },
    { casteName: 'Kol', casteNameLocal: 'कोल', categoryIndex: 3 },
  ];

  const createdCastes: any[] = [];
  for (const [index, caste] of castes.entries()) {
    const c = await prisma.caste.create({
      data: {
        electionId,
        casteCategoryId: createdCategories[caste.categoryIndex].id,
        casteName: caste.casteName,
        casteNameLocal: caste.casteNameLocal,
        displayOrder: index + 1
      }
    });
    createdCastes.push(c);
  }

  // Languages
  const languages = [
    { languageName: 'Hindi', languageNameLocal: 'हिन्दी', languageCode: 'HI' },
    { languageName: 'Urdu', languageNameLocal: 'उर्दू', languageCode: 'UR' },
    { languageName: 'English', languageNameLocal: 'अंग्रेजी', languageCode: 'EN' },
  ];

  const createdLanguages: any[] = [];
  for (const [index, lang] of languages.entries()) {
    const l = await prisma.language.create({
      data: { electionId, ...lang, displayOrder: index + 1 }
    });
    createdLanguages.push(l);
  }

  // Voter Categories
  const voterCategories = [
    { categoryName: 'Government Employee', categoryNameLocal: 'सरकारी कर्मचारी', categoryColor: '#4CAF50' },
    { categoryName: 'Businessman', categoryNameLocal: 'व्यापारी', categoryColor: '#FF9800' },
    { categoryName: 'Farmer', categoryNameLocal: 'किसान', categoryColor: '#8BC34A' },
    { categoryName: 'Youth', categoryNameLocal: 'युवा', categoryColor: '#9C27B0' },
  ];

  const createdVoterCategories: any[] = [];
  for (const [index, cat] of voterCategories.entries()) {
    const vc = await prisma.voterCategory.create({
      data: { electionId, ...cat, displayOrder: index + 1 }
    });
    createdVoterCategories.push(vc);
  }

  // Schemes
  const schemes = [
    { schemeName: 'PM-KISAN', schemeDescription: 'Farmer income support', schemeBy: 'UNION_GOVT' as const },
    { schemeName: 'Ujjwala Yojana', schemeDescription: 'Free LPG connection', schemeBy: 'UNION_GOVT' as const },
    { schemeName: 'Kanya Sumangala', schemeDescription: 'Girl child education support', schemeBy: 'STATE_GOVT' as const },
    { schemeName: 'Samajwadi Pension', schemeDescription: 'Old age pension', schemeBy: 'STATE_GOVT' as const },
  ];

  const createdSchemes: any[] = [];
  for (const scheme of schemes) {
    const s = await prisma.scheme.create({
      data: { electionId, ...scheme }
    });
    createdSchemes.push(s);
  }

  console.log('  ✓ UP master data created');

  return {
    religions: createdReligions,
    casteCategories: createdCategories,
    castes: createdCastes,
    languages: createdLanguages,
    voterCategories: createdVoterCategories,
    schemes: createdSchemes,
  };
}

async function seedUPPartsAndBooths(electionId: string) {
  console.log('Creating UP parts and booths...');

  const parts: any[] = [];
  const booths: any[] = [];
  const sections: any[] = [];

  for (let partNum = 1; partNum <= UP_CONFIG.TOTAL_PARTS; partNum++) {
    const area = LUCKNOW_AREAS[(partNum - 1) % LUCKNOW_AREAS.length];

    const part = await prisma.part.create({
      data: {
        electionId,
        partNumber: partNum,
        boothName: `${area.name} Government School`,
        boothNameLocal: `${area.hindi} सरकारी विद्यालय`,
        partType: Math.random() > 0.5 ? 'URBAN' : 'RURAL',
        address: `${area.name}, Lucknow, Uttar Pradesh`,
        pincode: `226${String(partNum).padStart(3, '0')}`,
        latitude: 26.8467 + (Math.random() - 0.5) * 0.1,
        longitude: 80.9462 + (Math.random() - 0.5) * 0.1,
        totalVoters: UP_CONFIG.VOTERS_PER_PART,
        maleVoters: Math.floor(UP_CONFIG.VOTERS_PER_PART * 0.52),
        femaleVoters: Math.floor(UP_CONFIG.VOTERS_PER_PART * 0.47),
        otherVoters: Math.floor(UP_CONFIG.VOTERS_PER_PART * 0.01),
      }
    });
    parts.push(part);

    // Create Sections
    const sectionsPerPart = 2 + Math.floor(Math.random() * 2);
    for (let secNum = 1; secNum <= sectionsPerPart; secNum++) {
      const sectionNumber = (partNum - 1) * 10 + secNum;
      const section = await prisma.section.create({
        data: {
          electionId,
          partId: part.id,
          sectionNumber,
          sectionName: `Section ${sectionNumber} - ${area.name}`,
          sectionNameLocal: `खंड ${sectionNumber} - ${area.hindi}`,
          totalVoters: Math.floor(UP_CONFIG.VOTERS_PER_PART / sectionsPerPart),
        }
      });
      sections.push(section);
    }

    // Create Booths
    for (let boothNum = 1; boothNum <= 2; boothNum++) {
      const globalBoothNum = (partNum - 1) * 2 + boothNum;
      const booth = await prisma.booth.create({
        data: {
          electionId,
          partId: part.id,
          boothNumber: globalBoothNum,
          boothName: `Booth ${globalBoothNum} - ${area.name}`,
          boothNameLocal: `बूथ ${globalBoothNum} - ${area.hindi}`,
          address: `${area.name} Government School, Room ${boothNum}`,
          latitude: 26.8467 + (Math.random() - 0.5) * 0.05,
          longitude: 80.9462 + (Math.random() - 0.5) * 0.05,
          totalVoters: Math.floor(UP_CONFIG.VOTERS_PER_PART / 2),
        }
      });
      booths.push(booth);
    }

    process.stdout.write(`\r  Creating UP parts: ${partNum}/${UP_CONFIG.TOTAL_PARTS}`);
  }

  console.log(`\n  ✓ ${parts.length} parts, ${sections.length} sections, ${booths.length} booths created`);
  return { parts, sections, booths };
}

async function seedUPVoters(electionId: string, masterData: any, geoData: any) {
  console.log('Creating UP families and voters...');

  const { religions, castes, languages, voterCategories, schemes } = masterData;
  const { parts, sections, booths } = geoData;

  let totalVotersCreated = 0;
  let totalFamiliesCreated = 0;

  for (const part of parts) {
    const partSections = sections.filter((s: any) => s.partId === part.id);
    const partBooths = booths.filter((b: any) => b.partId === part.id);

    for (let famNum = 1; famNum <= UP_CONFIG.FAMILIES_PER_PART; famNum++) {
      const familySize = 2 + Math.floor(Math.random() * 4);
      const area = LUCKNOW_AREAS.find(a => part.boothName.includes(a.name)) || LUCKNOW_AREAS[0];

      const family = await prisma.family.create({
        data: {
          electionId,
          familyName: `${getRandomElement(UP_SURNAMES)} परिवार`,
          houseNumber: generateHouseNo(),
          address: `${area.name}, Lucknow`,
          totalMembers: familySize,
        }
      });
      totalFamiliesCreated++;

      for (let memberNum = 0; memberNum < familySize; memberNum++) {
        const isMale = memberNum === 0 ? true : (memberNum === 1 ? false : Math.random() > 0.5);
        const gender: Gender = isMale ? 'MALE' : 'FEMALE';
        const firstName = isMale ? getRandomElement(UP_MALE_NAMES) : getRandomElement(UP_FEMALE_NAMES);
        const surname = getRandomElement(UP_SURNAMES);
        const dob = generateDOB(memberNum === 0 ? 30 : 18, memberNum === 0 ? 70 : 85);
        const age = new Date().getFullYear() - dob.getFullYear();

        const booth = getRandomElement(partBooths);
        const section = partSections.length > 0 ? getRandomElement(partSections) : null;

        const relationType: RelationType = memberNum === 0 ? 'FATHER' :
          (memberNum === 1 && !isMale ? 'WIFE' :
          (isMale ? 'FATHER' : 'MOTHER'));

        await prisma.voter.create({
          data: {
            electionId,
            partId: part.id,
            sectionId: section?.id,
            boothId: booth.id,
            familyId: family.id,
            epicNumber: generateEpicNo(),
            slNumber: totalVotersCreated + 1,
            name: `${firstName} ${surname}`,
            nameLocal: `${firstName} ${surname}`,
            fatherName: memberNum > 0 ? `${getRandomElement(UP_MALE_NAMES)} ${surname}` : null,
            relationType,
            gender,
            age,
            dateOfBirth: dob,
            mobile: Math.random() > 0.3 ? generatePhone() : null,
            houseNumber: family.houseNumber,
            address: family.address,
            religionId: getRandomElement(religions).id,
            casteCategoryId: getRandomElement(castes).casteCategoryId,
            casteId: getRandomElement(castes).id,
            languageId: getRandomElement(languages).id,
            voterCategoryId: Math.random() > 0.5 ? getRandomElement(voterCategories).id : null,
            politicalLeaning: getRandomElement(['LOYAL', 'SWING', 'OPPOSITION', 'UNKNOWN']) as PoliticalLeaning,
            influenceLevel: Math.random() > 0.9 ? 'HIGH' : (Math.random() > 0.7 ? 'MEDIUM' : 'LOW') as InfluenceLevel,
            isFamilyCaptain: memberNum === 0,
          }
        });

        totalVotersCreated++;
      }
    }

    process.stdout.write(`\r  Creating UP voters: ${totalVotersCreated} voters, ${totalFamiliesCreated} families`);
  }

  console.log(`\n  ✓ ${totalVotersCreated} voters in ${totalFamiliesCreated} families created`);
}

async function seedUPCadres(electionId: string, geoData: any) {
  console.log('Creating UP cadres...');

  const { parts, booths } = geoData;
  let cadreCount = 0;

  for (const part of parts) {
    const partBooths = booths.filter((b: any) => b.partId === part.id);

    for (let i = 0; i < UP_CONFIG.CADRES_PER_PART; i++) {
      const isMale = Math.random() > 0.4;
      const firstName = isMale ? getRandomElement(UP_MALE_NAMES) : getRandomElement(UP_FEMALE_NAMES);
      const surname = getRandomElement(UP_SURNAMES);
      const role: CadreRole = i === 0 ? 'COORDINATOR' : (i === 1 ? 'BOOTH_INCHARGE' : getRandomElement(['VOLUNTEER', 'AGENT']));

      const cadre = await prisma.cadre.create({
        data: {
          electionId,
          name: `${firstName} ${surname}`,
          mobile: generatePhone(),
          role,
          address: `${LUCKNOW_AREAS[Math.floor(Math.random() * LUCKNOW_AREAS.length)].name}, Lucknow`,
          votersUpdated: Math.floor(Math.random() * 100),
          surveysCompleted: Math.floor(Math.random() * 20),
          isActive: true,
        }
      });

      await prisma.cadreAssignment.create({
        data: {
          cadreId: cadre.id,
          partId: part.id,
          assignmentType: i === 0 ? 'PRIMARY' : 'SECONDARY' as AssignmentType,
        }
      });

      cadreCount++;
    }
  }

  console.log(`  ✓ ${cadreCount} UP cadres created`);
}

async function seedUPReports(electionId: string) {
  console.log('Creating UP reports and analytics...');

  // Reports
  const reportTypes = [
    { type: 'VOTER_DEMOGRAPHICS', name: 'UP Voter Demographics Report' },
    { type: 'BOOTH_STATISTICS', name: 'UP Booth Statistics Report' },
    { type: 'CADRE_PERFORMANCE', name: 'UP Cadre Performance Report' },
    { type: 'POLL_DAY_TURNOUT', name: 'UP Turnout Report' },
  ];

  for (const report of reportTypes) {
    await prisma.report.create({
      data: {
        electionId,
        reportName: report.name,
        reportType: report.type as any,
        format: 'PDF',
        generatedAt: new Date('2022-02-15'),
        isScheduled: false,
      }
    });
  }

  // AI Analytics
  await prisma.aIAnalyticsResult.create({
    data: {
      electionId,
      analysisType: 'VOTER_SENTIMENT',
      analysisName: 'UP Voter Sentiment Analysis',
      description: 'AI-powered voter sentiment analysis for Lucknow Central',
      results: JSON.stringify({
        overallSentiment: 0.68,
        positiveVoters: 42,
        negativeVoters: 20,
        neutralVoters: 38,
        topIssues: ['Development', 'Law & Order', 'Employment'],
      }),
      insights: JSON.stringify([
        { insight: 'Urban voters show higher positive sentiment', confidence: 0.85 },
        { insight: 'Youth voters concerned about employment', confidence: 0.82 },
      ]),
      confidence: 0.84,
      status: 'COMPLETED',
      processedAt: new Date('2022-02-18'),
    }
  });

  console.log('  ✓ UP reports and analytics created');
}

async function seedUPNews(electionId: string) {
  console.log('Creating UP news and actions...');

  const tenantId = 'demo-tenant';

  // News items
  const newsItems = [
    {
      title: 'CM inaugurates new metro line in Lucknow',
      titleLocal: 'मुख्यमंत्री ने लखनऊ में नई मेट्रो लाइन का उद्घाटन किया',
      summary: 'Chief Minister inaugurated the new airport metro line connecting Lucknow city to the international airport.',
      category: 'INFRASTRUCTURE',
      priority: 'HIGH',
    },
    {
      title: 'BJP announces welfare schemes for farmers',
      titleLocal: 'भाजपा ने किसानों के लिए कल्याण योजनाओं की घोषणा की',
      summary: 'BJP government announces additional support for farmers including increased MSP and insurance coverage.',
      category: 'GOVERNMENT_SCHEME',
      priority: 'HIGH',
    },
    {
      title: 'Opposition raises employment concerns',
      titleLocal: 'विपक्ष ने रोजगार संबंधी चिंताएं उठाईं',
      summary: 'Opposition parties criticize government over rising unemployment and demand concrete action plan.',
      category: 'POLITICAL',
      priority: 'MEDIUM',
    },
  ];

  for (const news of newsItems) {
    await prisma.newsInformation.create({
      data: {
        tenantId,
        title: news.title,
        titleLocal: news.titleLocal,
        summary: news.summary,
        category: news.category as any,
        priority: news.priority as any,
        status: 'PUBLISHED',
        geographicLevel: 'STATE',
        source: 'MEDIA',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        constituency: 'Lucknow Central',
        country: 'India',
        publishedAt: new Date('2022-02-10'),
        tags: JSON.stringify(['up', 'lucknow', news.category.toLowerCase()]),
      }
    });
  }

  // Action items
  const actions = [
    {
      title: 'Organize farmer rally',
      titleLocal: 'किसान रैली का आयोजन',
      actionType: 'CAMPAIGN_ACTIVITY',
      priority: 'HIGH',
    },
    {
      title: 'Youth employment outreach',
      titleLocal: 'युवा रोजगार अभियान',
      actionType: 'VOTER_OUTREACH',
      priority: 'MEDIUM',
    },
  ];

  for (const action of actions) {
    await prisma.actionItem.create({
      data: {
        tenantId,
        title: action.title,
        titleLocal: action.titleLocal,
        actionType: action.actionType as any,
        priority: action.priority as any,
        status: 'COMPLETED',
        geographicLevel: 'CONSTITUENCY',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        constituency: 'Lucknow Central',
      }
    });
  }

  console.log('  ✓ UP news and actions created');
}

async function main() {
  console.log('='.repeat(60));
  console.log('EC_Demo Tenant Comprehensive Seed Script');
  console.log('Two Elections: Tamil Nadu 2024 & UP 2022');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 0: Fetch tenant ID from ElectionCaffeCore
    console.log('Fetching tenant ID from ElectionCaffeCore...');
    const tenantId = await getTenantIdFromCore();

    // Step 0.5: Create tenant record in EC_Demo with correct ID
    await seedTenant(tenantId);

    // Step 1: Create demo users for authentication
    await seedUsers(tenantId);

    // Step 1: Clear existing data
    await clearExistingData();

    // ==================== TAMIL NADU ELECTION ====================
    console.log('\n' + '='.repeat(60));
    console.log('PART 1: Tamil Nadu Assembly Election 2024 (Karaikudi)');
    console.log('='.repeat(60));

    // Step 2: Create TN election
    const tnElection = await seedElection();

    // Step 3: Create TN master data
    const tnMasterData = await seedMasterData(tnElection.id);

    // Step 4: Create TN parts and booths
    const tnGeoData = await seedPartsAndBooths(tnElection.id);

    // Step 5: Create TN families and voters
    await seedFamiliesAndVoters(tnElection.id, tnMasterData, tnGeoData);

    // Step 6: Create TN cadres
    await seedCadres(tnElection.id, tnGeoData);

    // Step 7: Create TN surveys
    await seedSurveys(tnElection.id);

    // Step 8: Create TN feedback issues
    await seedFeedbackIssues(tnElection.id, tnGeoData);

    // Step 9: Create TN poll day data
    await seedPollDayData(tnElection.id, tnGeoData);

    // Step 10: Create TN dashboard reports
    await seedReports(tnElection.id);

    // Step 11: Create TN AI analytics results
    await seedAIAnalytics(tnElection.id);

    // Step 12: Create TN news and information
    await seedNewsInformation(tnElection.id);

    // Step 13: Create TN action items
    await seedActionItems(tnElection.id);

    // Step 14: Create TN NB parsed news and analysis
    await seedNBParsedNews(tnElection.id);

    // Step 15: Create TN NB party lines
    await seedNBPartyLines(tnElection.id);

    // Step 16: Create TN NB speech points
    await seedNBSpeechPoints(tnElection.id);

    // Step 17: Create TN NB action plans
    await seedNBActionPlans(tnElection.id);

    // ==================== UTTAR PRADESH ELECTION ====================
    console.log('\n' + '='.repeat(60));
    console.log('PART 2: Uttar Pradesh Assembly Election 2022 (Lucknow Central)');
    console.log('='.repeat(60));

    // Step 18: Create UP election
    const upElection = await seedUPElection();

    // Step 19: Create UP master data
    const upMasterData = await seedUPMasterData(upElection.id);

    // Step 20: Create UP parts and booths
    const upGeoData = await seedUPPartsAndBooths(upElection.id);

    // Step 21: Create UP families and voters
    await seedUPVoters(upElection.id, upMasterData, upGeoData);

    // Step 22: Create UP cadres
    await seedUPCadres(upElection.id, upGeoData);

    // Step 23: Create UP reports and analytics
    await seedUPReports(upElection.id);

    // Step 24: Create UP news and actions
    await seedUPNews(upElection.id);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ EC_Demo Seed Completed Successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('TAMIL NADU 2024 Summary:');
    console.log(`  - Election: Tamil Nadu Assembly Election 2024 (Karaikudi)`);
    console.log(`  - Parts: ${CONFIG.TOTAL_PARTS}`);
    console.log(`  - Booths: ${CONFIG.TOTAL_PARTS * 2}`);
    console.log(`  - Families: ~${CONFIG.TOTAL_PARTS * CONFIG.FAMILIES_PER_PART}`);
    console.log(`  - Voters: ~${CONFIG.TOTAL_PARTS * CONFIG.FAMILIES_PER_PART * 3}`);
    console.log(`  - Cadres: ${CONFIG.TOTAL_PARTS * CONFIG.CADRES_PER_PART}`);
    console.log(`  - Reports, Analytics, News, Actions, NB Content included`);
    console.log('');
    console.log('UTTAR PRADESH 2022 Summary:');
    console.log(`  - Election: UP Assembly Election 2022 (Lucknow Central)`);
    console.log(`  - Parts: ${UP_CONFIG.TOTAL_PARTS}`);
    console.log(`  - Booths: ${UP_CONFIG.TOTAL_PARTS * 2}`);
    console.log(`  - Families: ~${UP_CONFIG.TOTAL_PARTS * UP_CONFIG.FAMILIES_PER_PART}`);
    console.log(`  - Voters: ~${UP_CONFIG.TOTAL_PARTS * UP_CONFIG.FAMILIES_PER_PART * 3}`);
    console.log(`  - Cadres: ${UP_CONFIG.TOTAL_PARTS * UP_CONFIG.CADRES_PER_PART}`);
    console.log(`  - Reports, Analytics, News, Actions included`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Seed Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await corePrisma.$disconnect();
  }
}

main();
