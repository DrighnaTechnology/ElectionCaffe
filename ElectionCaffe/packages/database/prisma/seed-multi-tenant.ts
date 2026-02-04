/**
 * Multi-Tenant Seed Script
 * Creates 3 tenants with 5 lakh (500,000) voters each:
 * - BJP Tamil Nadu (EC_BJP_TN)
 * - BJP UP (EC_BJP_UP)
 * - AIDMK Tamil Nadu (EC_AIDMK_TN)
 *
 * Run with: npx tsx prisma/seed-multi-tenant.ts
 */

import { PrismaClient as TenantPrismaClient, Gender, PoliticalLeaning, InfluenceLevel, RelationType, CadreRole, AssignmentType, UserRole, UserStatus } from '../node_modules/.prisma/tenant-client/index.js';
import { PrismaClient as CorePrismaClient } from '../node_modules/.prisma/core-client/index.js';
import bcrypt from 'bcryptjs';

// Core DB client (for tenant management)
const CORE_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore?schema=public';
const corePrisma = new CorePrismaClient({
  datasources: {
    db: { url: CORE_DATABASE_URL }
  }
});

// Tenant configurations
interface TenantConfig {
  slug: string;
  name: string;
  databaseName: string;
  databaseUrl: string;
  tenantType: 'INDIVIDUAL_CANDIDATE' | 'POLITICAL_PARTY';
  state: string;
  party: string;
  constituency: string;
  district: string;
  candidateName: string;
  electionName: string;
  electionNameLocal: string;
  port: number;
  voterCount: number;
  partsCount: number;
  votersPerPart: number;
  cadresPerPart: number;
  familiesPerPart: number;
  nameData: {
    maleNames: string[];
    femaleNames: string[];
    surnames: string[];
    areas: { name: string; local: string }[];
  };
}

const TENANTS: TenantConfig[] = [
  {
    slug: 'bjp-tn',
    name: 'BJP Tamil Nadu',
    databaseName: 'EC_BJP_TN',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_TN?schema=public',
    tenantType: 'POLITICAL_PARTY',
    state: 'Tamil Nadu',
    party: 'Bharatiya Janata Party',
    constituency: 'Coimbatore North',
    district: 'Coimbatore',
    candidateName: 'Vanathi Srinivasan',
    electionName: 'Tamil Nadu Assembly Election 2024 - BJP',
    electionNameLocal: 'தமிழ்நாடு சட்டமன்றத் தேர்தல் 2024 - பாஜக',
    port: 5175,
    voterCount: 500000,
    partsCount: 100,
    votersPerPart: 5000,
    cadresPerPart: 10,
    familiesPerPart: 1000,
    nameData: {
      maleNames: ['Arun', 'Murugan', 'Karthik', 'Senthil', 'Kumar', 'Raja', 'Suresh', 'Mani', 'Venkatesh', 'Prabu', 'Vijay', 'Dinesh', 'Saravanan', 'Ganesh', 'Balaji', 'Ramesh', 'Santosh', 'Prakash', 'Srinivasan', 'Narayanan'],
      femaleNames: ['Lakshmi', 'Saraswathi', 'Parvathi', 'Meenakshi', 'Kamala', 'Amutha', 'Jayanthi', 'Kalyani', 'Shanthi', 'Sumathi', 'Mangala', 'Lalitha', 'Sulochana', 'Janaki', 'Padmavathi', 'Radha', 'Geetha', 'Saroja', 'Priya', 'Divya'],
      surnames: ['Subramanian', 'Ganapathy', 'Palanisamy', 'Narayanan', 'Venkatesh', 'Srinivasan', 'Ramasamy', 'Perumal', 'Murugan', 'Sundaram', 'Raman', 'Sivan', 'Velu', 'Kasi', 'Mariyappan', 'Selvaraj', 'Kumar', 'Raja', 'Thambi', 'Pandian'],
      areas: [
        { name: 'Gandhipuram', local: 'காந்திபுரம்' },
        { name: 'RS Puram', local: 'ஆர்.எஸ்.புரம்' },
        { name: 'Peelamedu', local: 'பீளமேடு' },
        { name: 'Saibaba Colony', local: 'சாய்பாபா காலனி' },
        { name: 'Race Course', local: 'ரேஸ் கோர்ஸ்' },
        { name: 'Singanallur', local: 'சிங்காநல்லூர்' },
        { name: 'Ganapathy', local: 'கணபதி' },
        { name: 'Podanur', local: 'போடநூர்' },
        { name: 'Town Hall', local: 'டவுன் ஹால்' },
        { name: 'Ukkadam', local: 'உக்கடம்' },
      ],
    },
  },
  {
    slug: 'bjp-up',
    name: 'BJP Uttar Pradesh',
    databaseName: 'EC_BJP_UP',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_UP?schema=public',
    tenantType: 'POLITICAL_PARTY',
    state: 'Uttar Pradesh',
    party: 'Bharatiya Janata Party',
    constituency: 'Lucknow Cantt',
    district: 'Lucknow',
    candidateName: 'Brajesh Pathak',
    electionName: 'Uttar Pradesh Assembly Election 2024 - BJP',
    electionNameLocal: 'उत्तर प्रदेश विधानसभा चुनाव 2024 - भाजपा',
    port: 5176,
    voterCount: 500000,
    partsCount: 100,
    votersPerPart: 5000,
    cadresPerPart: 10,
    familiesPerPart: 1000,
    nameData: {
      maleNames: ['Rajesh', 'Suresh', 'Ramesh', 'Anil', 'Vijay', 'Sanjay', 'Manoj', 'Amit', 'Rakesh', 'Dinesh', 'Ashok', 'Vinod', 'Pramod', 'Ravi', 'Mohan', 'Shyam', 'Ram', 'Krishna', 'Ganesh', 'Mahesh'],
      femaleNames: ['Sunita', 'Geeta', 'Savita', 'Meena', 'Rekha', 'Anita', 'Neeta', 'Shobha', 'Kiran', 'Poonam', 'Sarita', 'Mamta', 'Sarla', 'Usha', 'Kamla', 'Radha', 'Sita', 'Laxmi', 'Durga', 'Parvati'],
      surnames: ['Singh', 'Yadav', 'Sharma', 'Verma', 'Gupta', 'Tiwari', 'Tripathi', 'Mishra', 'Pandey', 'Dubey', 'Srivastava', 'Maurya', 'Chauhan', 'Rajput', 'Patel', 'Kumar', 'Prasad', 'Jaiswal', 'Rawat', 'Saxena'],
      areas: [
        { name: 'Hazratganj', local: 'हज़रतगंज' },
        { name: 'Gomti Nagar', local: 'गोमती नगर' },
        { name: 'Aliganj', local: 'आलीगंज' },
        { name: 'Indira Nagar', local: 'इंदिरा नगर' },
        { name: 'Rajajipuram', local: 'राजाजीपुरम' },
        { name: 'Alambagh', local: 'आलमबाग' },
        { name: 'Aminabad', local: 'अमीनाबाद' },
        { name: 'Chowk', local: 'चौक' },
        { name: 'Kaiserbagh', local: 'कैसरबाग' },
        { name: 'Mahanagar', local: 'महानगर' },
      ],
    },
  },
  {
    slug: 'aidmk-tn',
    name: 'AIDMK Tamil Nadu',
    databaseName: 'EC_AIDMK_TN',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_AIDMK_TN?schema=public',
    tenantType: 'POLITICAL_PARTY',
    state: 'Tamil Nadu',
    party: 'All India Anna Dravida Munnetra Kazhagam',
    constituency: 'Karaikudi',
    district: 'Sivaganga',
    candidateName: 'M. Thambi Durai',
    electionName: 'Tamil Nadu Assembly Election 2024 - AIDMK',
    electionNameLocal: 'தமிழ்நாடு சட்டமன்றத் தேர்தல் 2024 - அதிமுக',
    port: 5177,
    voterCount: 500000,
    partsCount: 100,
    votersPerPart: 5000,
    cadresPerPart: 10,
    familiesPerPart: 1000,
    nameData: {
      maleNames: ['Arun', 'Murugan', 'Karthik', 'Senthil', 'Kumar', 'Raja', 'Suresh', 'Mani', 'Venkatesh', 'Prabu', 'Vijay', 'Dinesh', 'Saravanan', 'Ganesh', 'Balaji', 'Ramesh', 'Santosh', 'Prakash', 'Srinivasan', 'Narayanan'],
      femaleNames: ['Lakshmi', 'Saraswathi', 'Parvathi', 'Meenakshi', 'Kamala', 'Amutha', 'Jayanthi', 'Kalyani', 'Shanthi', 'Sumathi', 'Mangala', 'Lalitha', 'Sulochana', 'Janaki', 'Padmavathi', 'Radha', 'Geetha', 'Saroja', 'Priya', 'Divya'],
      surnames: ['Subramanian', 'Ganapathy', 'Palanisamy', 'Narayanan', 'Venkatesh', 'Srinivasan', 'Ramasamy', 'Perumal', 'Murugan', 'Sundaram', 'Raman', 'Sivan', 'Velu', 'Kasi', 'Mariyappan', 'Selvaraj', 'Kumar', 'Raja', 'Thambi', 'Pandian'],
      areas: [
        { name: 'Kovilur', local: 'கோவிலூர்' },
        { name: 'Sekarathupatti', local: 'சேகரத்துப்பட்டி' },
        { name: 'Devakottai', local: 'தேவகோட்டை' },
        { name: 'Kallal', local: 'கள்ளல்' },
        { name: 'Kanadukathan', local: 'கானடுகாதான்' },
        { name: 'Kottaiyur', local: 'கொட்டையூர்' },
        { name: 'Pallathur', local: 'பள்ளத்தூர்' },
        { name: 'Athangudi', local: 'அத்தங்குடி' },
        { name: 'Puduvayal', local: 'புதுவயல்' },
        { name: 'Karaikudi Town', local: 'காரைக்குடி நகரம்' },
      ],
    },
  },
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

// Counter for unique EPIC numbers - avoids duplicates
let epicCounter = 0;

function generateEpicNo(tenantSlug: string): string {
  const prefixes: Record<string, string> = {
    'bjp-tn': 'BTN',
    'bjp-up': 'BUP',
    'aidmk-tn': 'ATN',
    'default': 'GEN'
  };
  const epicPrefix = prefixes[tenantSlug] || prefixes['default'];
  epicCounter++;
  // Pad the counter to 7 digits to ensure uniqueness
  return epicPrefix + epicCounter.toString().padStart(7, '0');
}

function resetEpicCounter() {
  epicCounter = 0;
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

// Create tenant in Core DB
async function createTenantInCore(config: TenantConfig): Promise<string> {
  console.log(`Creating tenant '${config.name}' in ElectionCaffeCore...`);

  // Get the free license plan
  const freePlan = await corePrisma.licensePlan.findUnique({
    where: { planCode: 'professional' },
  });

  if (!freePlan) {
    throw new Error('Professional license plan not found. Please run seed-core.ts first.');
  }

  // Create or update tenant
  const tenant = await corePrisma.tenant.upsert({
    where: { slug: config.slug },
    update: {
      databaseType: 'DEDICATED_MANAGED',
      databaseStatus: 'READY',
      databaseName: config.databaseName,
      databaseHost: 'localhost',
      databasePort: 5432,
      databaseUser: 'postgres',
      databasePassword: 'postgres',
      databaseSSL: false,
      databaseConnectionUrl: config.databaseUrl,
      databaseManagedBy: 'PLATFORM',
      databaseMigrationVersion: '1',
      databaseLastCheckedAt: new Date(),
    },
    create: {
      name: config.name,
      slug: config.slug,
      contactEmail: `admin@${config.slug}.electioncaffe.com`,
      contactPhone: '9999999990',
      status: 'ACTIVE',
      tenantType: config.tenantType,

      // Database configuration
      databaseType: 'DEDICATED_MANAGED',
      databaseStatus: 'READY',
      databaseName: config.databaseName,
      databaseHost: 'localhost',
      databasePort: 5432,
      databaseUser: 'postgres',
      databasePassword: 'postgres',
      databaseSSL: false,
      databaseConnectionUrl: config.databaseUrl,
      databaseManagedBy: 'PLATFORM',
      databaseMigrationVersion: '1',
      databaseLastCheckedAt: new Date(),

      // Resource limits - professional plan
      maxVoters: 1000000,
      maxCadres: 500,
      maxElections: 10,
      maxUsers: 100,
      maxConstituencies: 5,
      storageQuotaMB: 20000,
      subscriptionPlan: 'professional',
    },
  });

  console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.id})`);

  // Create tenant license record
  await corePrisma.tenantLicense.upsert({
    where: { tenantId: tenant.id },
    update: { planId: freePlan.id, status: 'active' },
    create: {
      tenantId: tenant.id,
      planId: freePlan.id,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    },
  });

  console.log(`  ✓ Tenant license created`);

  // Enable all features for the tenant
  const allFeatures = await corePrisma.featureFlag.findMany({
    where: { isGlobal: true },
  });

  for (const feature of allFeatures) {
    await corePrisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId: tenant.id,
          featureId: feature.id,
        },
      },
      update: { isEnabled: true },
      create: {
        tenantId: tenant.id,
        featureId: feature.id,
        isEnabled: true,
      },
    });
  }

  console.log(`  ✓ ${allFeatures.length} features enabled for tenant`);

  return tenant.id;
}


async function clearTenantData(prisma: TenantPrismaClient) {
  // Delete in order of dependencies (tenant schema doesn't have Tenant model)
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
  await prisma.user.deleteMany({});
}

// Tenant model doesn't exist in tenant schema - tenant data is in Core DB
// seedTenant function removed as it's not needed for tenant databases

async function seedUsersData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string) {
  console.log('  Creating users...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  const users = [
    {
      tenantId,
      firstName: 'Tenant',
      lastName: 'Admin',
      email: `admin@${config.slug}.electioncaffe.com`,
      mobile: `900000${String(TENANTS.indexOf(config) + 1).padStart(4, '0')}`,
      passwordHash: hashedPassword,
      role: UserRole.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      canAccessAllConstituencies: true,
    },
    {
      tenantId,
      firstName: 'Campaign',
      lastName: 'Manager',
      email: `campaign@${config.slug}.electioncaffe.com`,
      mobile: `900001${String(TENANTS.indexOf(config) + 1).padStart(4, '0')}`,
      passwordHash: hashedPassword,
      role: UserRole.CAMPAIGN_MANAGER,
      status: UserStatus.ACTIVE,
      canAccessAllConstituencies: true,
    },
    {
      tenantId,
      firstName: 'Field',
      lastName: 'Coordinator',
      email: `coordinator@${config.slug}.electioncaffe.com`,
      mobile: `900002${String(TENANTS.indexOf(config) + 1).padStart(4, '0')}`,
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

  console.log(`  ✓ ${users.length} users created`);
  console.log(`    - admin@${config.slug}.electioncaffe.com / Demo@123`);
  console.log(`    - campaign@${config.slug}.electioncaffe.com / Demo@123`);
  console.log(`    - coordinator@${config.slug}.electioncaffe.com / Demo@123`);
}

// Master data is created per election in the tenant schema
async function seedMasterDataForElection(prisma: TenantPrismaClient, config: TenantConfig, electionId: string) {
  console.log('  Creating master data for election...');

  // Religions - uses electionId_religionName as unique key
  const religions = [
    { religionName: 'Hindu', religionNameLocal: config.state === 'Tamil Nadu' ? 'இந்து' : 'हिन्दू', religionColor: '#FF9933' },
    { religionName: 'Muslim', religionNameLocal: config.state === 'Tamil Nadu' ? 'இஸ்லாம்' : 'मुस्लिम', religionColor: '#008000' },
    { religionName: 'Christian', religionNameLocal: config.state === 'Tamil Nadu' ? 'கிறிஸ்தவம்' : 'ईसाई', religionColor: '#0000FF' },
    { religionName: 'Sikh', religionNameLocal: config.state === 'Tamil Nadu' ? 'சீக்கியம்' : 'सिख', religionColor: '#FFA500' },
    { religionName: 'Others', religionNameLocal: config.state === 'Tamil Nadu' ? 'மற்றவை' : 'अन्य', religionColor: '#808080' },
  ];

  for (const religion of religions) {
    await prisma.religion.create({
      data: { electionId, ...religion },
    });
  }

  // Caste categories - uses electionId_categoryName as unique key
  const casteCategories = [
    { categoryName: 'General', categoryFullName: 'General Category' },
    { categoryName: 'OBC', categoryFullName: 'Other Backward Classes' },
    { categoryName: 'SC', categoryFullName: 'Scheduled Caste' },
    { categoryName: 'ST', categoryFullName: 'Scheduled Tribe' },
  ];

  for (const category of casteCategories) {
    await prisma.casteCategory.create({
      data: { electionId, ...category },
    });
  }

  // Languages - uses electionId_languageName as unique key
  const languages = config.state === 'Tamil Nadu'
    ? [
        { languageName: 'Tamil', languageNameLocal: 'தமிழ்', languageCode: 'ta' },
        { languageName: 'English', languageNameLocal: 'English', languageCode: 'en' },
      ]
    : [
        { languageName: 'Hindi', languageNameLocal: 'हिन्दी', languageCode: 'hi' },
        { languageName: 'English', languageNameLocal: 'English', languageCode: 'en' },
      ];

  for (const lang of languages) {
    await prisma.language.create({
      data: { electionId, ...lang },
    });
  }

  // Voter categories - uses electionId_categoryName as unique key
  const voterCategories = [
    { categoryName: 'VIP', categoryDescription: 'Very Important Person', categoryColor: '#FFD700' },
    { categoryName: 'Loyal Supporter', categoryDescription: 'Strong party supporter', categoryColor: '#00FF00' },
    { categoryName: 'Swing Voter', categoryDescription: 'Undecided voter', categoryColor: '#FFA500' },
    { categoryName: 'Opposition', categoryDescription: 'Opposition supporter', categoryColor: '#FF0000' },
  ];

  for (const category of voterCategories) {
    await prisma.voterCategory.create({
      data: { electionId, ...category },
    });
  }

  // Schemes - election-scoped
  const schemes = [
    { schemeName: 'PM-KISAN Samman Nidhi', schemeShortName: 'PM-KISAN', schemeDescription: 'Direct income support for farmers', category: 'Agriculture' },
    { schemeName: 'Ayushman Bharat', schemeShortName: 'AYUSH', schemeDescription: 'Health insurance scheme', category: 'Health' },
    { schemeName: 'Pradhan Mantri Awas Yojana', schemeShortName: 'PMAY', schemeDescription: 'Housing for all scheme', category: 'Housing' },
    { schemeName: 'Mudra Loan', schemeShortName: 'MUDRA', schemeDescription: 'Loans for small businesses', category: 'Business' },
  ];

  for (const scheme of schemes) {
    await prisma.scheme.create({
      data: { electionId, ...scheme },
    });
  }

  console.log('  ✓ Master data created');
}

async function seedElectionData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string): Promise<string> {
  console.log('  Creating election...');

  const electionId = `${config.slug}-election-2024`;

  await prisma.election.create({
    data: {
      id: electionId,
      tenantId,
      name: config.electionName,
      nameLocal: config.electionNameLocal,
      electionType: 'ASSEMBLY',
      state: config.state,
      constituency: config.constituency,
      district: config.district,
      candidateName: config.candidateName,
      pollDate: new Date('2024-05-15'),
      status: 'ACTIVE',
      totalParts: config.partsCount,
      totalBooths: config.partsCount * 2,
      totalVoters: config.voterCount,
    },
  });

  console.log(`  ✓ Election created: ${config.electionName}`);
  return electionId;
}

async function seedVoterDataBatch(prisma: TenantPrismaClient, config: TenantConfig, electionId: string) {
  console.log(`  Creating ${config.voterCount.toLocaleString()} voters across ${config.partsCount} parts...`);

  // Reset EPIC counter for each tenant to start fresh
  resetEpicCounter();

  // Define leanings based on what's in tenant schema enum
  const leanings: PoliticalLeaning[] = [PoliticalLeaning.LOYAL, PoliticalLeaning.SWING, PoliticalLeaning.OPPOSITION, PoliticalLeaning.UNKNOWN];
  const influences = [InfluenceLevel.HIGH, InfluenceLevel.MEDIUM, InfluenceLevel.LOW, InfluenceLevel.NONE];
  const genders: Gender[] = [Gender.MALE, Gender.FEMALE, Gender.OTHER];

  let totalVotersCreated = 0;
  const BATCH_SIZE = 1000;

  for (let partNo = 1; partNo <= config.partsCount; partNo++) {
    const area = config.nameData.areas[(partNo - 1) % config.nameData.areas.length];

    // Create part - tenant schema uses partNumber, boothName fields
    const part = await prisma.part.create({
      data: {
        electionId,
        partNumber: partNo,
        boothName: area.name,
        boothNameLocal: area.local,
        totalVoters: config.votersPerPart,
        maleVoters: Math.floor(config.votersPerPart * 0.48),
        femaleVoters: Math.floor(config.votersPerPart * 0.48),
        otherVoters: Math.floor(config.votersPerPart * 0.04),
      },
    });

    // Create 2 booths per part - tenant schema uses boothNumber (String)
    for (let boothIdx = 1; boothIdx <= 2; boothIdx++) {
      const boothNo = (partNo - 1) * 2 + boothIdx;
      await prisma.booth.create({
        data: {
          electionId,
          partId: part.id,
          boothNumber: String(boothNo),
          boothName: `${area.name} Booth ${boothIdx}`,
          boothNameLocal: `${area.local} ${config.state === 'Tamil Nadu' ? 'சாவடி' : 'बूथ'} ${boothIdx}`,
          address: `${area.name}, ${config.district}`,
          totalVoters: Math.floor(config.votersPerPart / 2),
        },
      });
    }

    // Create families for this part
    const familyIds: string[] = [];
    for (let f = 0; f < config.familiesPerPart; f++) {
      const family = await prisma.family.create({
        data: {
          electionId,
          partId: part.id,
          headName: `${getRandomElement(config.nameData.maleNames)} ${getRandomElement(config.nameData.surnames)}`,
          address: `${generateHouseNo()}, ${area.name}`,
          totalMembers: Math.floor(2 + Math.random() * 4),
        },
      });
      familyIds.push(family.id);
    }

    // Create voters in batches - tenant schema uses different field names
    const votersToCreate: any[] = [];
    for (let v = 0; v < config.votersPerPart; v++) {
      const genderIdx = Math.random() < 0.48 ? 0 : Math.random() < 0.96 ? 1 : 2;
      const gender = genders[genderIdx];
      const firstName = gender === Gender.MALE
        ? getRandomElement(config.nameData.maleNames)
        : getRandomElement(config.nameData.femaleNames);
      const lastName = getRandomElement(config.nameData.surnames);
      const fatherName = `${getRandomElement(config.nameData.maleNames)} ${lastName}`;
      const age = Math.floor(18 + Math.random() * 67);

      votersToCreate.push({
        electionId,
        partId: part.id,
        familyId: getRandomElement(familyIds),
        slNumber: v + 1,
        epicNumber: generateEpicNo(config.slug),
        name: `${firstName} ${lastName}`,
        fatherName,
        gender,
        age,
        dateOfBirth: generateDOB(age, age + 1),
        mobile: Math.random() > 0.3 ? generatePhone() : null,
        houseNumber: generateHouseNo(),
        address: `${area.name}, ${config.district}`,
        politicalLeaning: getRandomElement(leanings),
        influenceLevel: getRandomElement(influences),
      });

      // Insert in batches
      if (votersToCreate.length >= BATCH_SIZE) {
        await prisma.voter.createMany({ data: votersToCreate });
        totalVotersCreated += votersToCreate.length;
        votersToCreate.length = 0;

        // Progress update
        if (totalVotersCreated % 50000 === 0) {
          console.log(`    Progress: ${totalVotersCreated.toLocaleString()} voters created...`);
        }
      }
    }

    // Insert remaining voters
    if (votersToCreate.length > 0) {
      await prisma.voter.createMany({ data: votersToCreate });
      totalVotersCreated += votersToCreate.length;
    }
  }

  console.log(`  ✓ ${totalVotersCreated.toLocaleString()} voters created`);
}

async function seedCadresData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating cadres...');

  const cadreRoles = [CadreRole.BOOTH_AGENT, CadreRole.AREA_COORDINATOR, CadreRole.BLOCK_COORDINATOR, CadreRole.DISTRICT_COORDINATOR];
  const totalCadres = config.partsCount * config.cadresPerPart;

  const cadresToCreate: any[] = [];

  for (let i = 0; i < totalCadres; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale
      ? getRandomElement(config.nameData.maleNames)
      : getRandomElement(config.nameData.femaleNames);
    const lastName = getRandomElement(config.nameData.surnames);

    cadresToCreate.push({
      tenantId,
      electionId,
      firstName,
      lastName,
      mobile: generatePhone(),
      email: `cadre${i + 1}@${config.slug}.local`,
      gender: isMale ? 'MALE' : 'FEMALE',
      role: getRandomElement(cadreRoles),
      isActive: true,
      joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    });
  }

  await prisma.cadre.createMany({ data: cadresToCreate });
  console.log(`  ✓ ${totalCadres} cadres created`);
}

// Main seed function for tenant database
async function seedTenantDb(config: TenantConfig, tenantId: string) {
  console.log(`\nSeeding database ${config.databaseName}...`);

  const prisma = new TenantPrismaClient({
    datasources: {
      db: { url: config.databaseUrl }
    }
  });

  try {
    // Clear existing data
    console.log('  Clearing existing data...');
    await clearTenantData(prisma);
    console.log('  ✓ Data cleared');

    // Seed users
    await seedUsersData(prisma, config, tenantId);

    // Seed election first (master data needs electionId)
    const electionId = await seedElectionData(prisma, config, tenantId);

    // Seed master data (per election in tenant schema)
    await seedMasterDataForElection(prisma, config, electionId);

    // Seed parts, booths, and voters
    await seedVoterDataBatch(prisma, config, electionId);

    // Seed cadres - skip for now, tenant schema has different cadre structure
    // await seedCadresData(prisma, config, tenantId, electionId);

    console.log(`\n✅ ${config.name} database seeding completed!`);
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Multi-Tenant Seed Script');
  console.log('='.repeat(60));
  console.log('\nThis script will create:');
  console.log('- 3 Tenants in ElectionCaffeCore');
  console.log('- 500,000 voters per tenant');
  console.log('- Users, cadres, and all master data');
  console.log('\n');

  try {
    for (const config of TENANTS) {
      console.log('\n' + '='.repeat(60));
      console.log(`Processing: ${config.name}`);
      console.log('='.repeat(60));

      // Create tenant in Core DB
      const tenantId = await createTenantInCore(config);

      // Seed tenant database
      await seedTenantDb(config, tenantId);
    }

    console.log('\n' + '='.repeat(60));
    console.log('ALL TENANTS SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('');
    for (const config of TENANTS) {
      console.log(`🏛️  ${config.name}`);
      console.log(`   URL: http://localhost:${config.port}`);
      console.log(`   Database: ${config.databaseName}`);
      console.log(`   Admin: admin@${config.slug}.electioncaffe.com / Demo@123`);
      console.log('');
    }
    console.log('Super Admin: superadmin@electioncaffe.com / SuperAdmin@123');
    console.log('');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await corePrisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
