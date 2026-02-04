/**
 * Demo Tenant Seed Script
 * Generates 20 lakh+ sample records for Tamil Nadu
 *
 * Run with: npx tsx prisma/seed-demo-data/index.ts
 */

/// <reference types="node" />
import { PrismaClient } from '../../node_modules/.prisma/tenant-client/index.js';
import bcrypt from 'bcryptjs';
import {
  TAMIL_MALE_FIRST_NAMES_EN,
  TAMIL_FEMALE_FIRST_NAMES_EN,
  TAMIL_MALE_FIRST_NAMES,
  TAMIL_FEMALE_FIRST_NAMES,
  TAMIL_SURNAMES_EN,
  TAMIL_SURNAMES,
  KARAIKUDI_AREAS,
  RELIGIONS,
  CASTE_CATEGORIES,
  CASTES_TN,
  POLITICAL_PARTIES,
  GOVERNMENT_SCHEMES,
  VOTER_CATEGORIES,
  getRandomElement,
  getWeightedRandomElement,
  generatePhone,
  generateEpicNo,
  generateDOB,
  calculateAge,
} from './tamil-names.js';

// Database connection for EC_Demo
const TENANT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/EC_Demo?schema=public';
const TENANT_ID = 'fb2ee1bf-204b-4c62-b0be-82b825d1d4e9';

const prisma = new PrismaClient({
  datasources: {
    db: { url: TENANT_DATABASE_URL }
  }
});

// Configuration - Adjust TOTAL_VOTERS as needed (2000000 for 20 lakh)
// Start with smaller number for testing, then increase
const CONFIG = {
  TOTAL_VOTERS: parseInt(process.env.TOTAL_VOTERS || '100000', 10), // Default 1 lakh, set env var for more
  CONSTITUENCIES: 10,    // 10 constituencies
  PARTS_PER_CONSTITUENCY: 100, // 100 parts per constituency
  BOOTHS_PER_PART: 2,
  VOTERS_PER_BATCH: 5000, // Batch size for inserts
  CADRES: 5000,
  EVENTS: 200,
  NEWS_ARTICLES: 500,
  DONATIONS: 1000,
  EXPENSES: 800,
  SURVEYS: 50,
  CHAT_MESSAGES: 10000,
  NOTIFICATIONS: 200,
};

// Helper to generate UUID
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate address
function generateAddress(area: { name: string; tamil: string }): string {
  const houseNo = Math.floor(1 + Math.random() * 500);
  const streets = ['Main Road', 'Cross Street', 'North Street', 'South Street', 'Temple Street', 'Market Street', 'Gandhi Road', 'Nehru Street', 'Anna Nagar', 'MGR Street'];
  const street = getRandomElement(streets);
  return `${houseNo}, ${street}, ${area.name}`;
}

// Generate house number in Tamil style
function generateHouseNo(): string {
  const prefixes = ['', 'A-', 'B-', 'C-', 'D-', '1/', '2/', '3/', 'SF-', 'GF-'];
  const num = Math.floor(1 + Math.random() * 500);
  const suffix = Math.random() > 0.8 ? getRandomElement(['A', 'B', 'C', 'D', '/1', '/2']) : '';
  return `${getRandomElement(prefixes)}${num}${suffix}`;
}

async function seedConstituency() {
  console.log('Creating constituency...');

  const constituency = await prisma.constituency.upsert({
    where: {
      tenantId_code: {
        tenantId: TENANT_ID,
        code: '184'
      }
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      name: 'Karaikudi',
      nameLocal: 'காரைக்குடி',
      constituencyType: 'ASSEMBLY',
      state: 'Tamil Nadu',
      district: 'Sivaganga',
      code: '184',
      totalVoters: CONFIG.TOTAL_VOTERS,
      isActive: true,
    }
  });

  console.log(`  ✓ Constituency created: ${constituency.name}`);
  return constituency;
}

async function seedElection(constituencyId: string) {
  console.log('Creating election...');

  const election = await prisma.election.upsert({
    where: {
      id: 'demo-election-2024'
    },
    update: {},
    create: {
      id: 'demo-election-2024',
      tenantId: TENANT_ID,
      constituencyId: constituencyId,
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
      resultDate: new Date('2024-05-20'),
      status: 'ACTIVE',
      totalVoters: CONFIG.TOTAL_VOTERS,
      totalMaleVoters: Math.floor(CONFIG.TOTAL_VOTERS * 0.48),
      totalFemaleVoters: Math.floor(CONFIG.TOTAL_VOTERS * 0.51),
      totalOtherVoters: Math.floor(CONFIG.TOTAL_VOTERS * 0.01),
      totalBooths: CONFIG.PARTS_PER_CONSTITUENCY * CONFIG.BOOTHS_PER_PART,
      totalParts: CONFIG.PARTS_PER_CONSTITUENCY,
      settings: {
        enablePolling: true,
        enableSurveys: true,
        enableNews: true,
      }
    }
  });

  console.log(`  ✓ Election created: ${election.name}`);
  return election;
}

async function seedMasterData(electionId: string) {
  console.log('Creating master data (religions, castes, languages, categories, schemes, parties)...');

  // Religions
  for (const [index, religion] of RELIGIONS.entries()) {
    await prisma.religion.upsert({
      where: { electionId_code: { electionId, code: religion.code } },
      update: {},
      create: {
        electionId,
        name: religion.name,
        nameLocal: religion.tamil,
        code: religion.code,
        sortOrder: index + 1,
      }
    });
  }
  console.log('  ✓ Religions seeded');

  // Caste Categories
  const casteCategoryMap: { [key: string]: string } = {};
  for (const [index, category] of CASTE_CATEGORIES.entries()) {
    const cc = await prisma.casteCategory.upsert({
      where: { electionId_code: { electionId, code: category.code } },
      update: {},
      create: {
        electionId,
        name: category.name,
        nameLocal: category.tamil,
        code: category.code,
        sortOrder: index + 1,
      }
    });
    casteCategoryMap[category.code] = cc.id;
  }
  console.log('  ✓ Caste categories seeded');

  // Castes
  for (const [index, caste] of CASTES_TN.entries()) {
    await prisma.caste.upsert({
      where: { electionId_code: { electionId, code: caste.code } },
      update: {},
      create: {
        electionId,
        categoryId: casteCategoryMap[caste.category],
        name: caste.name,
        nameLocal: caste.tamil,
        code: caste.code,
        sortOrder: index + 1,
      }
    });
  }
  console.log('  ✓ Castes seeded');

  // Languages
  const languages = [
    { code: 'TA', name: 'Tamil', tamil: 'தமிழ்' },
    { code: 'EN', name: 'English', tamil: 'ஆங்கிலம்' },
    { code: 'TE', name: 'Telugu', tamil: 'தெலுங்கு' },
    { code: 'KA', name: 'Kannada', tamil: 'கன்னடம்' },
    { code: 'ML', name: 'Malayalam', tamil: 'மலையாளம்' },
    { code: 'HI', name: 'Hindi', tamil: 'இந்தி' },
    { code: 'UR', name: 'Urdu', tamil: 'உருது' },
  ];
  for (const [index, lang] of languages.entries()) {
    await prisma.language.upsert({
      where: { electionId_code: { electionId, code: lang.code } },
      update: {},
      create: {
        electionId,
        name: lang.name,
        nameLocal: lang.tamil,
        code: lang.code,
        sortOrder: index + 1,
      }
    });
  }
  console.log('  ✓ Languages seeded');

  // Voter Categories
  for (const [index, category] of VOTER_CATEGORIES.entries()) {
    await prisma.voterCategory.upsert({
      where: { electionId_code: { electionId, code: category.code } },
      update: {},
      create: {
        electionId,
        name: category.name,
        nameLocal: category.tamil,
        code: category.code,
        color: category.color,
        icon: category.icon,
        sortOrder: index + 1,
      }
    });
  }
  console.log('  ✓ Voter categories seeded');

  // Voter Schemes (Government Schemes)
  for (const [index, scheme] of GOVERNMENT_SCHEMES.entries()) {
    await prisma.voterScheme.upsert({
      where: { electionId_code: { electionId, code: scheme.code } },
      update: {},
      create: {
        electionId,
        name: scheme.name,
        nameLocal: scheme.tamil,
        code: scheme.code,
        description: `Ministry: ${scheme.ministry}`,
        sortOrder: index + 1,
      }
    });
  }
  console.log('  ✓ Voter schemes seeded');

  // Parties
  for (const party of POLITICAL_PARTIES) {
    await prisma.party.upsert({
      where: { id: `party-${party.code.toLowerCase()}` },
      update: {},
      create: {
        id: `party-${party.code.toLowerCase()}`,
        name: party.name,
        nameLocal: party.tamil,
        abbreviation: party.code,
        symbol: party.symbol,
        colorCode: party.color,
        isNational: ['BJP', 'INC'].includes(party.code),
        isState: ['DMK', 'ADMK', 'PMK', 'MDMK', 'DMDK'].includes(party.code),
        state: 'Tamil Nadu',
      }
    });
  }
  console.log('  ✓ Parties seeded');

  // Schemes (with more details)
  for (const scheme of GOVERNMENT_SCHEMES) {
    await prisma.scheme.upsert({
      where: { id: `scheme-${scheme.code.toLowerCase()}` },
      update: {},
      create: {
        id: `scheme-${scheme.code.toLowerCase()}`,
        electionId,
        name: scheme.name,
        nameLocal: scheme.tamil,
        description: `Government scheme under ${scheme.ministry}`,
        ministry: scheme.ministry,
        beneficiaries: 'Eligible citizens',
        eligibility: 'As per government norms',
        isActive: true,
      }
    });
  }
  console.log('  ✓ Schemes seeded');

  return casteCategoryMap;
}

async function seedPartsAndBooths(electionId: string) {
  console.log('Creating parts and booths...');

  const partsData: any[] = [];
  const boothsData: any[] = [];
  const sectionsData: any[] = [];

  const votersPerPart = Math.floor(CONFIG.TOTAL_VOTERS / CONFIG.PARTS_PER_CONSTITUENCY);

  for (let partNum = 1; partNum <= CONFIG.PARTS_PER_CONSTITUENCY; partNum++) {
    const area = KARAIKUDI_AREAS[(partNum - 1) % KARAIKUDI_AREAS.length];
    const partId = uuid();

    const maleVoters = Math.floor(votersPerPart * 0.48);
    const femaleVoters = Math.floor(votersPerPart * 0.51);
    const otherVoters = votersPerPart - maleVoters - femaleVoters;

    partsData.push({
      id: partId,
      electionId,
      partNumber: partNum,
      partName: `Part ${partNum} - ${area.name}`,
      partNameLocal: `பகுதி ${partNum} - ${area.tamil}`,
      partType: Math.random() > 0.6 ? 'RURAL' : Math.random() > 0.3 ? 'URBAN' : 'SEMI_URBAN',
      areaName: area.name,
      pollingStation: `${area.name} Government School`,
      totalVoters: votersPerPart,
      maleVoters,
      femaleVoters,
      otherVoters,
      isActive: true,
    });

    // Create sections (4-6 per part)
    const sectionsPerPart = 4 + Math.floor(Math.random() * 3);
    for (let secNum = 1; secNum <= sectionsPerPart; secNum++) {
      const sectionNumber = (partNum - 1) * 10 + secNum;
      sectionsData.push({
        id: uuid(),
        electionId,
        partId,
        sectionNumber,
        sectionName: `Section ${sectionNumber} - ${area.name}`,
        sectionNameLocal: `பிரிவு ${sectionNumber} - ${area.tamil}`,
        totalVoters: Math.floor(votersPerPart / sectionsPerPart),
        isActive: true,
      });
    }

    // Create booths (2 per part)
    for (let boothNum = 1; boothNum <= CONFIG.BOOTHS_PER_PART; boothNum++) {
      const globalBoothNum = (partNum - 1) * CONFIG.BOOTHS_PER_PART + boothNum;
      const boothVoters = Math.floor(votersPerPart / CONFIG.BOOTHS_PER_PART);

      boothsData.push({
        id: uuid(),
        electionId,
        partId,
        boothNumber: globalBoothNum.toString(),
        boothName: `Booth ${globalBoothNum} - ${area.name} ${boothNum === 1 ? 'A' : 'B'}`,
        boothNameLocal: `சாவடி ${globalBoothNum} - ${area.tamil}`,
        address: `${area.name} Government School, Room ${boothNum}`,
        latitude: 10.0689 + (Math.random() - 0.5) * 0.1,
        longitude: 78.7791 + (Math.random() - 0.5) * 0.1,
        totalVoters: boothVoters,
        maleVoters: Math.floor(boothVoters * 0.48),
        femaleVoters: Math.floor(boothVoters * 0.51),
        otherVoters: boothVoters - Math.floor(boothVoters * 0.48) - Math.floor(boothVoters * 0.51),
        vulnerabilityStatus: Math.random() > 0.9 ? 'CRITICAL' : Math.random() > 0.8 ? 'SENSITIVE' : 'NONE',
        isActive: true,
      });
    }
  }

  // Insert parts
  for (const part of partsData) {
    await prisma.part.upsert({
      where: { electionId_partNumber: { electionId, partNumber: part.partNumber } },
      update: {},
      create: part,
    });
  }
  console.log(`  ✓ ${partsData.length} parts created`);

  // Fetch actual parts from database to get real IDs
  const dbParts = await prisma.part.findMany({
    where: { electionId },
  });
  const partIdByNumber = new Map(dbParts.map(p => [p.partNumber, p.id]));

  // Update sections and booths with actual part IDs
  const updatedSectionsData = sectionsData.map(section => {
    const partNumber = partsData.find(p => p.id === section.partId)?.partNumber;
    const actualPartId = partNumber ? partIdByNumber.get(partNumber) : null;
    return { ...section, partId: actualPartId || section.partId };
  });

  const updatedBoothsData = boothsData.map(booth => {
    const partNumber = partsData.find(p => p.id === booth.partId)?.partNumber;
    const actualPartId = partNumber ? partIdByNumber.get(partNumber) : null;
    return { ...booth, partId: actualPartId || booth.partId };
  });

  // Insert sections
  for (const section of updatedSectionsData) {
    await prisma.section.upsert({
      where: { electionId_sectionNumber: { electionId, sectionNumber: section.sectionNumber } },
      update: {},
      create: section,
    });
  }
  console.log(`  ✓ ${updatedSectionsData.length} sections created`);

  // Insert booths
  for (const booth of updatedBoothsData) {
    await prisma.booth.upsert({
      where: { electionId_boothNumber: { electionId, boothNumber: booth.boothNumber } },
      update: {},
      create: booth,
    });
  }
  console.log(`  ✓ ${updatedBoothsData.length} booths created`);

  return { parts: dbParts, booths: updatedBoothsData, sections: updatedSectionsData };
}

async function seedVoters(electionId: string) {
  console.log(`Creating ${CONFIG.TOTAL_VOTERS.toLocaleString()} voters in batches...`);

  // Fetch all related data
  const [parts, booths, sections, religions, casteCategories, castes, languages] = await Promise.all([
    prisma.part.findMany({ where: { electionId } }),
    prisma.booth.findMany({ where: { electionId } }),
    prisma.section.findMany({ where: { electionId } }),
    prisma.religion.findMany({ where: { electionId } }),
    prisma.casteCategory.findMany({ where: { electionId } }),
    prisma.caste.findMany({ where: { electionId } }),
    prisma.language.findMany({ where: { electionId } }),
  ]);

  const religionMap = new Map(religions.map(r => [r.code, r.id]));
  const casteCategoryMap = new Map(casteCategories.map(c => [c.code, c.id]));
  const casteMap = new Map(castes.map(c => [c.code, c.id]));
  const languageMap = new Map(languages.map(l => [l.code, l.id]));
  const partMap = new Map(parts.map(p => [p.partNumber, p.id]));
  const sectionMap = new Map(sections.map(s => [s.sectionNumber, s.id]));

  // Create booth map by part
  const boothsByPart = new Map<string, string[]>();
  for (const booth of booths) {
    if (booth.partId) {
      const existing = boothsByPart.get(booth.partId) || [];
      existing.push(booth.id);
      boothsByPart.set(booth.partId, existing);
    }
  }

  // Create sections by part map
  const sectionsByPart = new Map<string, string[]>();
  for (const section of sections) {
    if (section.partId) {
      const existing = sectionsByPart.get(section.partId) || [];
      existing.push(section.id);
      sectionsByPart.set(section.partId, existing);
    }
  }

  const partyAffiliations = ['DMK', 'ADMK', 'BJP', 'INC', 'PMK', 'MDMK', 'VCK', 'NTK', 'DMDK', 'IND', null, null, null];
  const relations = ['Father', 'Husband', 'Mother', 'Wife'];

  let createdCount = 0;
  const totalBatches = Math.ceil(CONFIG.TOTAL_VOTERS / CONFIG.VOTERS_PER_BATCH);
  let serialNo = 1;

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.VOTERS_PER_BATCH, CONFIG.TOTAL_VOTERS - createdCount);
    const votersToCreate: any[] = [];

    for (let i = 0; i < batchSize; i++) {
      const isMale = Math.random() > 0.51;
      const gender = isMale ? 'MALE' : (Math.random() > 0.02 ? 'FEMALE' : 'OTHER');

      const firstName = gender === 'MALE'
        ? getRandomElement(TAMIL_MALE_FIRST_NAMES_EN)
        : getRandomElement(TAMIL_FEMALE_FIRST_NAMES_EN);

      const firstNameLocal = gender === 'MALE'
        ? getRandomElement(TAMIL_MALE_FIRST_NAMES)
        : getRandomElement(TAMIL_FEMALE_FIRST_NAMES);

      const surname = getRandomElement(TAMIL_SURNAMES_EN);
      const surnameLocal = getRandomElement(TAMIL_SURNAMES);

      const dob = generateDOB(18, 95);
      const age = calculateAge(dob);

      const religion = getWeightedRandomElement(RELIGIONS);
      const casteCategory = getWeightedRandomElement(CASTE_CATEGORIES);
      const matchingCastes = CASTES_TN.filter(c => c.category === casteCategory.code);
      const caste = matchingCastes.length > 0 ? getRandomElement(matchingCastes) : CASTES_TN[0];

      // Determine part based on serial number distribution
      const partNumber = Math.floor((serialNo - 1) / (CONFIG.TOTAL_VOTERS / CONFIG.PARTS_PER_CONSTITUENCY)) + 1;
      const partId = partMap.get(Math.min(partNumber, CONFIG.PARTS_PER_CONSTITUENCY));

      const partBooths = partId ? boothsByPart.get(partId) : null;
      const boothId = partBooths && partBooths.length > 0 ? getRandomElement(partBooths) : null;

      const partSections = partId ? sectionsByPart.get(partId) : null;
      const sectionId = partSections && partSections.length > 0 ? getRandomElement(partSections) : null;

      const area = KARAIKUDI_AREAS[(partNumber - 1) % KARAIKUDI_AREAS.length];

      const relationType = gender === 'MALE'
        ? getRandomElement(['Father', 'Mother'])
        : (age > 25 && Math.random() > 0.4 ? 'Husband' : getRandomElement(['Father', 'Mother']));

      const relativeName = gender === 'MALE' || relationType === 'Father' || relationType === 'Mother'
        ? getRandomElement(TAMIL_MALE_FIRST_NAMES_EN) + ' ' + surname
        : getRandomElement(TAMIL_MALE_FIRST_NAMES_EN) + ' ' + surname;

      const voter = {
        id: uuid(),
        electionId,
        partId,
        sectionId,
        boothId,
        epicNo: generateEpicNo(),
        serialNo: serialNo,
        voterName: `${firstName} ${surname}`,
        voterNameLocal: `${firstNameLocal} ${surnameLocal}`,
        relativeName,
        relativeNameLocal: getRandomElement(TAMIL_MALE_FIRST_NAMES) + ' ' + getRandomElement(TAMIL_SURNAMES),
        relationType,
        gender,
        age,
        dateOfBirth: dob,
        mobile: Math.random() > 0.3 ? generatePhone() : null,
        alternateMobile: Math.random() > 0.8 ? generatePhone() : null,
        whatsapp: Math.random() > 0.5 ? generatePhone() : null,
        address: generateAddress(area),
        houseNo: generateHouseNo(),
        locality: area.name,
        wardNo: ((partNumber % 20) + 1).toString(),
        pincode: `630' + ${Math.floor(1 + Math.random() * 9).toString().padStart(3, '0')}`,
        religionId: religionMap.get(religion.code),
        casteCategoryId: casteCategoryMap.get(casteCategory.code),
        casteId: casteMap.get(caste.code),
        languageId: languageMap.get('TA'), // Most speak Tamil
        partyAffiliation: getRandomElement(partyAffiliations),
        supportLevel: Math.floor(1 + Math.random() * 5),
        isInfluencer: Math.random() > 0.95,
        influenceLevel: Math.random() > 0.95 ? Math.floor(1 + Math.random() * 5) : null,
        categories: JSON.stringify(Math.random() > 0.7 ? [getRandomElement(VOTER_CATEGORIES).code] : []),
        schemes: JSON.stringify(Math.random() > 0.6 ? [getRandomElement(GOVERNMENT_SCHEMES).code] : []),
        isDead: false,
        isShifted: Math.random() > 0.98,
        isDeleted: false,
        customFields: JSON.stringify({}),
      };

      votersToCreate.push(voter);
      serialNo++;
    }

    // Batch insert using Prisma createMany for safety and reliability
    await prisma.voter.createMany({
      data: votersToCreate.map(v => ({
        id: v.id,
        electionId: v.electionId,
        partId: v.partId,
        sectionId: v.sectionId,
        boothId: v.boothId,
        epicNo: v.epicNo,
        serialNo: v.serialNo,
        voterName: v.voterName,
        voterNameLocal: v.voterNameLocal,
        relativeName: v.relativeName,
        relativeNameLocal: v.relativeNameLocal,
        relationType: v.relationType,
        gender: v.gender,
        age: v.age,
        dateOfBirth: v.dateOfBirth,
        mobile: v.mobile,
        alternateMobile: v.alternateMobile,
        whatsapp: v.whatsapp,
        address: v.address,
        houseNo: v.houseNo,
        locality: v.locality,
        wardNo: v.wardNo,
        pincode: v.pincode,
        religionId: v.religionId,
        casteCategoryId: v.casteCategoryId,
        casteId: v.casteId,
        languageId: v.languageId,
        partyAffiliation: v.partyAffiliation,
        supportLevel: v.supportLevel,
        isInfluencer: v.isInfluencer,
        influenceLevel: v.influenceLevel,
        categories: v.categories,
        schemes: v.schemes,
        isDead: v.isDead,
        isShifted: v.isShifted,
        isDeleted: v.isDeleted,
        customFields: v.customFields,
      })),
      skipDuplicates: true,
    });

    createdCount += batchSize;
    const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
    process.stdout.write(`\r  Creating voters: ${createdCount.toLocaleString()} / ${CONFIG.TOTAL_VOTERS.toLocaleString()} (${progress}%)`);
  }

  console.log(`\n  ✓ ${createdCount.toLocaleString()} voters created`);
}

async function seedUsers() {
  console.log('Creating users...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  const users: Array<{
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    email?: string;
    mobile: string;
    passwordHash: string;
    role: string;
    status: string;
    isCandidate?: boolean;
    candidateProfile?: string;
    canAccessAllConstituencies?: boolean;
  }> = [
    {
      id: 'user-admin',
      tenantId: TENANT_ID,
      firstName: 'Senthil',
      lastName: 'Kumar',
      email: 'admin@demo.electioncaffe.com',
      mobile: '9876543210',
      passwordHash: hashedPassword,
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
      isCandidate: true,
      candidateProfile: JSON.stringify({
        party: 'DMK',
        symbol: 'rising_sun',
        constituency: 'Karaikudi',
        qualification: 'MA Political Science',
        experience: '10 years in public service',
      }),
      canAccessAllConstituencies: true,
    },
    {
      id: 'user-campaign-manager',
      tenantId: TENANT_ID,
      firstName: 'Murugan',
      lastName: 'Selvam',
      email: 'campaign@demo.electioncaffe.com',
      mobile: '9876543211',
      passwordHash: hashedPassword,
      role: 'CAMPAIGN_MANAGER',
      status: 'ACTIVE',
    },
    {
      id: 'user-coordinator',
      tenantId: TENANT_ID,
      firstName: 'Lakshmi',
      lastName: 'Narayanan',
      email: 'coordinator@demo.electioncaffe.com',
      mobile: '9876543212',
      passwordHash: hashedPassword,
      role: 'COORDINATOR',
      status: 'ACTIVE',
    },
  ];

  // Add booth agents
  for (let i = 1; i <= 50; i++) {
    const isMale = Math.random() > 0.4;
    users.push({
      id: `user-booth-${i}`,
      tenantId: TENANT_ID,
      firstName: isMale ? getRandomElement(TAMIL_MALE_FIRST_NAMES_EN) : getRandomElement(TAMIL_FEMALE_FIRST_NAMES_EN),
      lastName: getRandomElement(TAMIL_SURNAMES_EN),
      email: undefined,
      mobile: generatePhone(),
      passwordHash: hashedPassword,
      role: 'BOOTH_INCHARGE',
      status: 'ACTIVE',
    });
  }

  // Add volunteers
  for (let i = 1; i <= 200; i++) {
    const isMale = Math.random() > 0.5;
    users.push({
      id: `user-volunteer-${i}`,
      tenantId: TENANT_ID,
      firstName: isMale ? getRandomElement(TAMIL_MALE_FIRST_NAMES_EN) : getRandomElement(TAMIL_FEMALE_FIRST_NAMES_EN),
      lastName: getRandomElement(TAMIL_SURNAMES_EN),
      email: undefined,
      mobile: generatePhone(),
      passwordHash: hashedPassword,
      role: 'VOLUNTEER',
      status: 'ACTIVE',
    });
  }

  // Delete existing seeded users (to handle re-runs)
  await prisma.user.deleteMany({
    where: {
      tenantId: TENANT_ID,
      id: { startsWith: 'user-' }
    }
  });

  // Insert users using createMany for speed
  await prisma.user.createMany({
    data: users as any[],
    skipDuplicates: true,
  });

  console.log(`  ✓ ${users.length} users created`);
  return users;
}

async function seedCadres(electionId: string) {
  console.log('Creating cadres...');

  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID, role: { in: ['BOOTH_INCHARGE', 'VOLUNTEER', 'COORDINATOR'] } }
  });

  const parts = await prisma.part.findMany({ where: { electionId } });
  const booths = await prisma.booth.findMany({ where: { electionId } });

  const cadreTypes = ['BOOTH_PRESIDENT', 'SECTOR_INCHARGE', 'ZONE_COORDINATOR', 'BLA', 'VOLUNTEER'];
  const zones = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];
  const sectors = Array.from({ length: 20 }, (_, i) => `Sector ${i + 1}`);

  for (let i = 0; i < Math.min(users.length, CONFIG.CADRES); i++) {
    const user = users[i];
    const cadreType = getRandomElement(cadreTypes);
    const part = getRandomElement(parts);
    const booth = booths.find(b => b.partId === part.id);

    await prisma.cadre.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        electionId,
        cadreType,
        designation: cadreType.replace('_', ' ').toLowerCase(),
        zone: getRandomElement(zones),
        sector: getRandomElement(sectors),
        ward: `Ward ${Math.floor(1 + Math.random() * 20)}`,
        locality: getRandomElement(KARAIKUDI_AREAS).name,
        assignedParts: JSON.stringify([part.partNumber]),
        assignedBooths: booth ? JSON.stringify([booth.boothNumber]) : JSON.stringify([]),
        targetVoters: Math.floor(500 + Math.random() * 2000),
        isActive: true,
      }
    });
  }

  console.log(`  ✓ Cadres created`);
}

async function seedBoothAgents(electionId: string) {
  console.log('Creating booth agents...');

  const booths = await prisma.booth.findMany({ where: { electionId } });
  const agentTypes = ['POLLING_AGENT', 'COUNTING_AGENT', 'BLA'];

  for (const booth of booths) {
    for (const agentType of agentTypes) {
      const isMale = Math.random() > 0.4;
      await prisma.boothAgent.create({
        data: {
          electionId,
          boothId: booth.id,
          name: `${isMale ? getRandomElement(TAMIL_MALE_FIRST_NAMES_EN) : getRandomElement(TAMIL_FEMALE_FIRST_NAMES_EN)} ${getRandomElement(TAMIL_SURNAMES_EN)}`,
          mobile: generatePhone(),
          agentType,
          isActive: true,
        }
      });
    }
  }

  console.log(`  ✓ Booth agents created`);
}

async function seedEvents(electionId: string) {
  console.log('Creating events...');

  const eventTypes = ['RALLY', 'MEETING', 'DOOR_TO_DOOR', 'BOOTH_MEETING', 'PRESS_CONFERENCE', 'CULTURAL_EVENT', 'INAUGURATION', 'CORNER_MEETING'];
  const venues = [
    { name: 'Karaikudi Town Hall', address: 'Main Road, Karaikudi' },
    { name: 'Gandhi Maidan', address: 'Gandhi Nagar, Karaikudi' },
    { name: 'Chettinad Palace Ground', address: 'Kanadukathan' },
    { name: 'Government College Ground', address: 'College Road, Karaikudi' },
    { name: 'Bus Stand Junction', address: 'New Bus Stand, Karaikudi' },
  ];

  const now = new Date();

  for (let i = 0; i < CONFIG.EVENTS; i++) {
    const eventType = getRandomElement(eventTypes);
    const venue = getRandomElement(venues);
    const daysOffset = Math.floor(-30 + Math.random() * 90);
    const startDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + Math.random() * 4 * 60 * 60 * 1000);

    await prisma.partyEvent.create({
      data: {
        tenantId: TENANT_ID,
        electionId,
        title: `${eventType.replace('_', ' ')} at ${venue.name}`,
        titleLocal: `${venue.name} இல் நிகழ்வு`,
        description: `Campaign event organized for voter outreach`,
        eventType,
        startDate,
        endDate,
        allDay: Math.random() > 0.8,
        venue: venue.name,
        venueLocal: venue.name,
        address: venue.address,
        city: 'Karaikudi',
        state: 'Tamil Nadu',
        pincode: '630001',
        latitude: 10.0689 + (Math.random() - 0.5) * 0.05,
        longitude: 78.7791 + (Math.random() - 0.5) * 0.05,
        expectedAttendees: Math.floor(100 + Math.random() * 5000),
        actualAttendees: daysOffset < 0 ? Math.floor(50 + Math.random() * 5000) : null,
        chiefGuest: Math.random() > 0.5 ? `${getRandomElement(TAMIL_MALE_FIRST_NAMES_EN)} ${getRandomElement(TAMIL_SURNAMES_EN)}` : null,
        isPublic: true,
        estimatedBudget: Math.floor(10000 + Math.random() * 500000),
        actualBudget: daysOffset < 0 ? Math.floor(10000 + Math.random() * 500000) : null,
        status: daysOffset < 0 ? 'COMPLETED' : (daysOffset < 7 ? 'ONGOING' : 'SCHEDULED'),
        createdBy: 'user-admin',
      }
    });
  }

  console.log(`  ✓ ${CONFIG.EVENTS} events created`);
}

async function seedFundManagement() {
  console.log('Creating fund management data...');

  // Create fund accounts
  const accounts = [
    {
      id: 'fund-main',
      tenantId: TENANT_ID,
      accountName: 'Main Campaign Fund',
      accountType: 'BANK',
      bankName: 'Indian Bank',
      accountNumber: '1234567890',
      ifscCode: 'IDIB000K001',
      currentBalance: 5000000,
      isDefault: true,
      isActive: true,
      createdBy: 'user-admin',
    },
    {
      id: 'fund-donations',
      tenantId: TENANT_ID,
      accountName: 'Donations Account',
      accountType: 'BANK',
      bankName: 'SBI',
      accountNumber: '0987654321',
      ifscCode: 'SBIN0001234',
      currentBalance: 2500000,
      isDefault: false,
      isActive: true,
      createdBy: 'user-admin',
    },
    {
      id: 'fund-petty',
      tenantId: TENANT_ID,
      accountName: 'Petty Cash',
      accountType: 'CASH',
      currentBalance: 100000,
      isDefault: false,
      isActive: true,
      createdBy: 'user-admin',
    },
  ];

  for (const account of accounts) {
    await prisma.fundAccount.upsert({
      where: { id: account.id },
      update: {},
      create: account as any,
    });
  }

  // Create donations
  const donorNames = TAMIL_MALE_FIRST_NAMES_EN.concat(TAMIL_FEMALE_FIRST_NAMES_EN).map(
    name => `${name} ${getRandomElement(TAMIL_SURNAMES_EN)}`
  );

  for (let i = 0; i < CONFIG.DONATIONS; i++) {
    const amount = Math.floor(1000 + Math.random() * 99000);
    const daysAgo = Math.floor(Math.random() * 90);

    await prisma.fundDonation.create({
      data: {
        tenantId: TENANT_ID,
        accountId: Math.random() > 0.7 ? 'fund-donations' : 'fund-main',
        donorName: getRandomElement(donorNames),
        donorContact: generatePhone(),
        donorEmail: Math.random() > 0.5 ? `donor${i}@gmail.com` : null,
        donorAddress: generateAddress(getRandomElement(KARAIKUDI_AREAS)),
        donorPan: Math.random() > 0.6 ? `ABCDE${1000 + i}F` : null,
        amount,
        paymentMode: getRandomElement(['CASH', 'UPI', 'NEFT', 'CHEQUE', 'CARD']),
        paymentRef: `DON${Date.now()}${i}`,
        donationDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        receiptNo: `RCP${2024}${String(i + 1).padStart(5, '0')}`,
        isAnonymous: Math.random() > 0.95,
        purpose: getRandomElement(['Campaign', 'Rally', 'Advertisement', 'General', 'Booth Setup']),
        createdBy: 'user-admin',
      }
    });
  }
  console.log(`  ✓ ${CONFIG.DONATIONS} donations created`);

  // Create expenses
  const expenseCategories = ['ADVERTISEMENT', 'RALLY', 'TRAVEL', 'FOOD', 'PRINTING', 'OFFICE', 'TRANSPORT', 'EQUIPMENT', 'WAGES', 'MISC'];
  const vendors = [
    'Sri Lakshmi Printers', 'MGR Sound Systems', 'Kumar Caterers', 'Arun Travels',
    'Sivam Flex Works', 'Murugan Transport', 'Raja Electronics', 'Anbu Tent House',
  ];

  for (let i = 0; i < CONFIG.EXPENSES; i++) {
    const amount = Math.floor(500 + Math.random() * 200000);
    const daysAgo = Math.floor(Math.random() * 90);
    const status = Math.random() > 0.1 ? 'approved' : (Math.random() > 0.5 ? 'pending' : 'rejected');

    await prisma.fundExpense.create({
      data: {
        tenantId: TENANT_ID,
        accountId: Math.random() > 0.3 ? 'fund-main' : 'fund-petty',
        category: getRandomElement(expenseCategories),
        description: `${getRandomElement(expenseCategories)} expenses for campaign activities`,
        amount,
        paymentMode: getRandomElement(['CASH', 'UPI', 'NEFT', 'CHEQUE']),
        expenseDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        vendorName: getRandomElement(vendors),
        vendorContact: generatePhone(),
        invoiceNo: `INV${2024}${String(i + 1).padStart(5, '0')}`,
        status,
        approvedBy: status === 'approved' ? 'user-admin' : null,
        approvedAt: status === 'approved' ? new Date() : null,
        createdBy: 'user-campaign-manager',
      }
    });
  }
  console.log(`  ✓ ${CONFIG.EXPENSES} expenses created`);
}

async function seedInventory() {
  console.log('Creating inventory data...');

  // Create categories
  const categories = [
    { id: 'cat-campaign', name: 'Campaign Materials', nameLocal: 'பிரச்சார பொருட்கள்' },
    { id: 'cat-print', name: 'Printed Materials', nameLocal: 'அச்சிடப்பட்ட பொருட்கள்' },
    { id: 'cat-tech', name: 'Technology', nameLocal: 'தொழில்நுட்பம்' },
    { id: 'cat-furniture', name: 'Furniture', nameLocal: 'தளபாடங்கள்' },
    { id: 'cat-vehicle', name: 'Vehicles', nameLocal: 'வாகனங்கள்' },
  ];

  for (const cat of categories) {
    await prisma.inventoryCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        tenantId: TENANT_ID,
        name: cat.name,
        nameLocal: cat.nameLocal,
        isActive: true,
      }
    });
  }

  // Create items
  const items = [
    { categoryId: 'cat-campaign', name: 'Party Flags (Large)', unit: 'pcs', quantity: 5000, costPrice: 50 },
    { categoryId: 'cat-campaign', name: 'Party Flags (Small)', unit: 'pcs', quantity: 20000, costPrice: 15 },
    { categoryId: 'cat-campaign', name: 'Candidate Posters', unit: 'pcs', quantity: 50000, costPrice: 5 },
    { categoryId: 'cat-campaign', name: 'Party Caps', unit: 'pcs', quantity: 10000, costPrice: 25 },
    { categoryId: 'cat-campaign', name: 'T-Shirts', unit: 'pcs', quantity: 5000, costPrice: 150 },
    { categoryId: 'cat-campaign', name: 'Banners (Flex)', unit: 'pcs', quantity: 500, costPrice: 500 },
    { categoryId: 'cat-print', name: 'Pamphlets', unit: 'pcs', quantity: 100000, costPrice: 2 },
    { categoryId: 'cat-print', name: 'Voter Slips', unit: 'pcs', quantity: 200000, costPrice: 1 },
    { categoryId: 'cat-print', name: 'ID Cards', unit: 'pcs', quantity: 5000, costPrice: 10 },
    { categoryId: 'cat-tech', name: 'Microphones', unit: 'pcs', quantity: 20, costPrice: 2000 },
    { categoryId: 'cat-tech', name: 'Speakers', unit: 'pcs', quantity: 30, costPrice: 5000 },
    { categoryId: 'cat-tech', name: 'Projectors', unit: 'pcs', quantity: 5, costPrice: 25000 },
    { categoryId: 'cat-furniture', name: 'Plastic Chairs', unit: 'pcs', quantity: 500, costPrice: 250 },
    { categoryId: 'cat-furniture', name: 'Tables', unit: 'pcs', quantity: 50, costPrice: 1500 },
    { categoryId: 'cat-furniture', name: 'Tents', unit: 'pcs', quantity: 20, costPrice: 10000 },
    { categoryId: 'cat-vehicle', name: 'Campaign Vehicles', unit: 'pcs', quantity: 10, costPrice: 50000 },
    { categoryId: 'cat-vehicle', name: 'Auto Rickshaws', unit: 'pcs', quantity: 25, costPrice: 20000 },
  ];

  for (const [index, item] of items.entries()) {
    await prisma.inventoryItem.upsert({
      where: { tenantId_sku: { tenantId: TENANT_ID, sku: `SKU${String(index + 1).padStart(4, '0')}` } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        categoryId: item.categoryId,
        name: item.name,
        nameLocal: item.name, // Could add Tamil translations
        sku: `SKU${String(index + 1).padStart(4, '0')}`,
        unit: item.unit,
        quantity: item.quantity,
        minStock: Math.floor(item.quantity * 0.1),
        costPrice: item.costPrice,
        isActive: true,
      }
    });
  }

  console.log(`  ✓ Inventory categories and items created`);
}

async function seedNews() {
  console.log('Creating news and broadcasts...');

  const newsCategories = ['CAMPAIGN', 'POLITICS', 'LOCAL', 'NATIONAL', 'OPINION', 'ANNOUNCEMENT'];
  const sentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
  const sources = ['The Hindu', 'Times of India', 'Dinamalar', 'Dinathanthi', 'News18 Tamil', 'Thanthi TV', 'Sun News'];

  for (let i = 0; i < CONFIG.NEWS_ARTICLES; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const sentiment = getRandomElement(sentiments);

    await prisma.nBParsedNews.create({
      data: {
        tenantId: TENANT_ID,
        originalUrl: `https://news.example.com/article/${uuid()}`,
        title: `${getRandomElement(['Campaign Update:', 'Political News:', 'Local Update:', 'Breaking:'])} ${getRandomElement(['Party Rally Announced', 'New Promise Made', 'Voter Registration Drive', 'Development Project Launched', 'Youth Wing Meeting', 'Women\'s Conference'])}`,
        content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is sample news content for demonstration purposes. The campaign is progressing well with active voter engagement.`,
        summary: `Brief summary of the news article about campaign activities.`,
        source: getRandomElement(sources),
        publishedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        language: Math.random() > 0.4 ? 'Tamil' : 'English',
        category: getRandomElement(newsCategories),
        sentiment,
        relevanceScore: Math.random(),
        isProcessed: true,
      }
    });
  }

  // Create party lines
  const topics = ['Economy', 'Agriculture', 'Education', 'Healthcare', 'Employment', 'Women Empowerment', 'Youth Development'];
  for (const topic of topics) {
    await prisma.nBPartyLine.create({
      data: {
        tenantId: TENANT_ID,
        topic,
        partyLine: `Our party's stance on ${topic} focuses on inclusive development and welfare of all citizens.`,
        talkingPoints: JSON.stringify([
          `Key initiative for ${topic}`,
          `Past achievements in ${topic}`,
          `Future plans for ${topic}`,
        ]),
        counterPoints: JSON.stringify([
          `Opposition failed on ${topic}`,
          `Our better track record`,
        ]),
        isActive: true,
        createdBy: 'user-admin',
      }
    });
  }

  // Create campaign speeches
  const speechTypes = ['RALLY', 'BOOTH', 'CORNER', 'PRESS'];
  const occasions = ['Independence Day', 'Gandhi Jayanti', 'Republic Day', 'Party Foundation Day', 'General Rally'];

  for (let i = 0; i < 50; i++) {
    await prisma.nBCampaignSpeech.create({
      data: {
        tenantId: TENANT_ID,
        title: `${getRandomElement(speechTypes)} Speech ${i + 1}`,
        speechType: getRandomElement(speechTypes),
        content: `Respected citizens of Karaikudi,\n\nI stand before you today to talk about our vision for development and progress. Our party has always been committed to the welfare of the people...\n\nJai Hind!`,
        language: Math.random() > 0.3 ? 'Tamil' : 'English',
        duration: Math.floor(5 + Math.random() * 30),
        targetAudience: getRandomElement(['General', 'Youth', 'Women', 'Farmers', 'Seniors']),
        occasion: getRandomElement(occasions),
        usageCount: Math.floor(Math.random() * 50),
        createdBy: 'user-admin',
      }
    });
  }

  // Create broadcasts
  for (let i = 0; i < 100; i++) {
    const daysOffset = Math.floor(-30 + Math.random() * 60);
    const status = daysOffset < 0 ? 'sent' : (daysOffset < 7 ? 'scheduled' : 'draft');

    await prisma.nBBroadcast.create({
      data: {
        tenantId: TENANT_ID,
        title: `Campaign Update ${i + 1}`,
        content: `Important update for all cadres and supporters. Please note the following campaign schedule changes and instructions...`,
        broadcastType: getRandomElement(['SMS', 'WHATSAPP', 'APP_NOTIFICATION', 'EMAIL']),
        targetAudience: JSON.stringify({ roles: ['BOOTH_INCHARGE', 'VOLUNTEER'] }),
        channels: JSON.stringify(['app', 'sms']),
        scheduledAt: status === 'scheduled' ? new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000) : null,
        sentAt: status === 'sent' ? new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000) : null,
        status,
        recipientCount: Math.floor(100 + Math.random() * 5000),
        deliveredCount: status === 'sent' ? Math.floor(100 + Math.random() * 4500) : 0,
        readCount: status === 'sent' ? Math.floor(50 + Math.random() * 3000) : 0,
        createdBy: 'user-admin',
      }
    });
  }

  console.log(`  ✓ News, party lines, speeches, and broadcasts created`);
}

async function seedSurveys(electionId: string) {
  console.log('Creating surveys...');

  const surveyTitles = [
    'Voter Preference Survey',
    'Development Priority Survey',
    'Candidate Recognition Survey',
    'Issue Importance Survey',
    'Campaign Effectiveness Survey',
  ];

  for (let i = 0; i < CONFIG.SURVEYS; i++) {
    const startDate = new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const survey = await prisma.survey.create({
      data: {
        electionId,
        title: `${getRandomElement(surveyTitles)} ${i + 1}`,
        titleLocal: `கருத்துக் கணிப்பு ${i + 1}`,
        description: 'Sample survey for voter feedback collection',
        questions: JSON.stringify([
          { id: 1, type: 'single', question: 'Which party do you support?', options: ['DMK', 'ADMK', 'BJP', 'Others'] },
          { id: 2, type: 'rating', question: 'Rate our candidate (1-5)' },
          { id: 3, type: 'multi', question: 'What issues matter most?', options: ['Employment', 'Healthcare', 'Education', 'Infrastructure'] },
        ]),
        targetAudience: JSON.stringify({ ageRange: [18, 65], areas: ['Karaikudi'] }),
        startDate,
        endDate,
        isActive: Math.random() > 0.3,
        totalResponses: Math.floor(Math.random() * 1000),
        createdBy: 'user-admin',
      }
    });

    // Create sample responses
    const responseCount = Math.min(survey.totalResponses, 100);
    for (let j = 0; j < responseCount; j++) {
      await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          respondentInfo: JSON.stringify({
            name: `${getRandomElement(TAMIL_MALE_FIRST_NAMES_EN)} ${getRandomElement(TAMIL_SURNAMES_EN)}`,
            age: Math.floor(18 + Math.random() * 60),
            gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          }),
          answers: JSON.stringify({
            1: getRandomElement(['DMK', 'ADMK', 'BJP', 'Others']),
            2: Math.floor(1 + Math.random() * 5),
            3: ['Employment', 'Healthcare'].slice(0, Math.floor(1 + Math.random() * 3)),
          }),
          latitude: 10.0689 + (Math.random() - 0.5) * 0.1,
          longitude: 78.7791 + (Math.random() - 0.5) * 0.1,
          submittedBy: 'user-volunteer-1',
        }
      });
    }
  }

  console.log(`  ✓ ${CONFIG.SURVEYS} surveys created with responses`);
}

async function seedReportsAndAnalytics(electionId: string) {
  console.log('Creating reports and analytics...');

  const reportTypes = [
    'VOTER_LIST', 'BOOTH_WISE', 'PART_WISE', 'CASTE_ANALYSIS', 'AGE_ANALYSIS',
    'GENDER_ANALYSIS', 'SUPPORT_LEVEL', 'INFLUENCER_LIST', 'DEAD_VOTERS', 'SHIFTED_VOTERS'
  ];

  for (const reportType of reportTypes) {
    await prisma.report.create({
      data: {
        electionId,
        reportType,
        title: `${reportType.replace('_', ' ')} Report`,
        parameters: JSON.stringify({ constituency: 'Karaikudi', dateRange: '2024' }),
        status: 'completed',
        generatedBy: 'user-admin',
        generatedAt: new Date(),
      }
    });
  }

  // AI Analytics Results
  const analysisTypes = [
    'VOTER_SENTIMENT', 'BOOTH_PREDICTION', 'SUPPORT_TREND', 'DEMOGRAPHIC_ANALYSIS',
    'CAMPAIGN_EFFECTIVENESS', 'INFLUENCER_MAPPING', 'ISSUE_PRIORITY'
  ];

  for (const analysisType of analysisTypes) {
    await prisma.aIAnalyticsResult.create({
      data: {
        electionId,
        analysisType,
        parameters: JSON.stringify({ region: 'Karaikudi' }),
        results: JSON.stringify({
          summary: `AI-generated analysis for ${analysisType}`,
          confidence: 0.85 + Math.random() * 0.1,
          dataPoints: Math.floor(1000 + Math.random() * 50000),
        }),
        insights: JSON.stringify([
          'Key insight 1 from AI analysis',
          'Key insight 2 from AI analysis',
          'Recommended action based on analysis',
        ]),
        confidence: 0.85 + Math.random() * 0.1,
        modelUsed: 'gpt-4',
        creditsUsed: Math.floor(5 + Math.random() * 15),
        status: 'completed',
        requestedBy: 'user-admin',
        completedAt: new Date(),
      }
    });
  }

  console.log(`  ✓ Reports and analytics created`);
}

async function seedNotificationsAndChat() {
  console.log('Creating notifications and chat...');

  const users = await prisma.user.findMany({ where: { tenantId: TENANT_ID }, take: 50 });

  // Internal Notifications
  const notificationTypes = ['ALERT', 'REMINDER', 'UPDATE', 'ANNOUNCEMENT', 'TASK'];

  for (let i = 0; i < CONFIG.NOTIFICATIONS; i++) {
    const notification = await prisma.internalNotification.create({
      data: {
        tenantId: TENANT_ID,
        title: `${getRandomElement(notificationTypes)} Notification ${i + 1}`,
        message: `This is an important notification for all team members. Please take necessary action.`,
        notificationType: getRandomElement(notificationTypes),
        priority: getRandomElement(['low', 'normal', 'high', 'urgent']),
        targetAudience: 'selected',
        targetRoles: JSON.stringify(['BOOTH_INCHARGE', 'VOLUNTEER']),
        actionUrl: '/dashboard',
        actionLabel: 'View Details',
        status: Math.random() > 0.3 ? 'SENT' : 'DRAFT',
        sentAt: Math.random() > 0.3 ? new Date() : null,
        totalRecipients: users.length,
        deliveredCount: Math.floor(users.length * 0.9),
        readCount: Math.floor(users.length * 0.6),
        createdBy: 'user-admin',
      }
    });

    // Create recipients for some notifications
    if (notification.status === 'SENT' && users.length > 0) {
      for (let j = 0; j < Math.min(10, users.length); j++) {
        await prisma.notificationRecipient.create({
          data: {
            notificationId: notification.id,
            userId: users[j].id,
            channel: 'app',
            status: Math.random() > 0.2 ? 'read' : 'delivered',
            deliveredAt: new Date(),
            readAt: Math.random() > 0.4 ? new Date() : null,
          }
        });
      }
    }
  }
  console.log(`  ✓ ${CONFIG.NOTIFICATIONS} notifications created`);

  // Chat Conversations
  if (users.length >= 2) {
    // Create some group chats
    const groupChats = [
      { title: 'Campaign Coordinators', type: 'GROUP' },
      { title: 'Booth Presidents', type: 'GROUP' },
      { title: 'All Volunteers', type: 'BROADCAST' },
    ];

    for (const chat of groupChats) {
      const conversation = await prisma.chatConversation.create({
        data: {
          tenantId: TENANT_ID,
          title: chat.title,
          conversationType: chat.type as any,
          createdBy: users[0].id,
          lastMessageAt: new Date(),
          isActive: true,
        }
      });

      // Add participants
      const participantCount = Math.min(20, users.length);
      for (let i = 0; i < participantCount; i++) {
        await prisma.chatParticipant.create({
          data: {
            conversationId: conversation.id,
            userId: users[i].id,
            role: i === 0 ? 'admin' : 'member',
            isActive: true,
          }
        });
      }

      // Create messages
      const messageCount = Math.floor(20 + Math.random() * 80);
      for (let i = 0; i < messageCount; i++) {
        const sender = users[Math.floor(Math.random() * participantCount)];
        const daysAgo = Math.floor(Math.random() * 30);

        await prisma.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: sender.id,
            content: getRandomElement([
              'Good morning everyone!',
              'Please check the updated schedule.',
              'Meeting at 5 PM today.',
              'Great work team!',
              'Any updates on voter registration?',
              'Booth setup completed.',
              'Need volunteers for tomorrow.',
              'Campaign going well!',
            ]),
            messageType: 'TEXT',
            createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }
        });
      }
    }

    // Create some direct chats
    for (let i = 0; i < 10; i++) {
      if (users.length >= 2) {
        const user1 = users[i % users.length];
        const user2 = users[(i + 1) % users.length];

        const conversation = await prisma.chatConversation.create({
          data: {
            tenantId: TENANT_ID,
            conversationType: 'DIRECT',
            createdBy: user1.id,
            lastMessageAt: new Date(),
            isActive: true,
          }
        });

        await prisma.chatParticipant.createMany({
          data: [
            { conversationId: conversation.id, userId: user1.id, role: 'member' },
            { conversationId: conversation.id, userId: user2.id, role: 'member' },
          ]
        });

        // Add a few messages
        for (let j = 0; j < 5; j++) {
          await prisma.chatMessage.create({
            data: {
              conversationId: conversation.id,
              senderId: j % 2 === 0 ? user1.id : user2.id,
              content: `Message ${j + 1} in this conversation.`,
              messageType: 'TEXT',
            }
          });
        }
      }
    }
  }

  console.log(`  ✓ Chat conversations and messages created`);
}

async function seedWebsite() {
  console.log('Creating website...');

  const website = await prisma.tenantWebsite.upsert({
    where: { subdomain: 'demo-karaikudi' },
    update: {},
    create: {
      tenantId: TENANT_ID,
      subdomain: 'demo-karaikudi',
      siteName: 'Senthil Kumar for Karaikudi',
      siteNameLocal: 'செந்தில் குமார் காரைக்குடிக்காக',
      tagline: 'Together We Prosper',
      description: 'Official campaign website for Senthil Kumar, candidate for Karaikudi Assembly Constituency',
      primaryColor: '#FF0000',
      secondaryColor: '#FFFFFF',
      socialLinks: JSON.stringify({
        facebook: 'https://facebook.com/senthilkumar',
        twitter: 'https://twitter.com/senthilkumar',
        instagram: 'https://instagram.com/senthilkumar',
        youtube: 'https://youtube.com/senthilkumar',
      }),
      contactInfo: JSON.stringify({
        email: 'contact@senthilkumar.in',
        phone: '+91 98765 43210',
        address: 'Campaign Office, Main Road, Karaikudi',
      }),
      enabledSections: JSON.stringify(['hero', 'about', 'manifesto', 'gallery', 'events', 'news', 'contact']),
      status: 'PUBLISHED',
      publishedAt: new Date(),
    }
  });

  // Create pages
  const pages = [
    { slug: 'home', title: 'Home', pageType: 'home' },
    { slug: 'about', title: 'About', pageType: 'about' },
    { slug: 'manifesto', title: 'Manifesto', pageType: 'manifesto' },
    { slug: 'gallery', title: 'Gallery', pageType: 'gallery' },
    { slug: 'contact', title: 'Contact', pageType: 'contact' },
  ];

  for (const [index, page] of pages.entries()) {
    await prisma.websitePage.upsert({
      where: { websiteId_slug: { websiteId: website.id, slug: page.slug } },
      update: {},
      create: {
        websiteId: website.id,
        slug: page.slug,
        title: page.title,
        content: JSON.stringify({ sections: [] }),
        pageType: page.pageType,
        isPublished: true,
        showInNav: true,
        sortOrder: index + 1,
      }
    });
  }

  console.log(`  ✓ Website created`);
}

async function seedAICredits() {
  console.log('Creating AI credits...');

  const tenantCredits = await prisma.tenantAICredits.upsert({
    where: { tenantId: TENANT_ID },
    update: {},
    create: {
      tenantId: TENANT_ID,
      totalCredits: 5000,
      usedCredits: 1250,
      bonusCredits: 500,
      lastPurchasedAt: new Date(),
    }
  });

  // Create some usage logs
  const features = ['speech_generation', 'voter_sentiment', 'news_summary', 'booth_prediction'];

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    await prisma.aIUsageLog.create({
      data: {
        tenantCreditsId: tenantCredits.id,
        userId: 'user-admin',
        featureKey: getRandomElement(features),
        creditsUsed: Math.floor(3 + Math.random() * 12),
        inputTokens: Math.floor(100 + Math.random() * 500),
        outputTokens: Math.floor(200 + Math.random() * 1000),
        modelUsed: 'gpt-4',
        responseTime: Math.floor(1000 + Math.random() * 5000),
        status: 'success',
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      }
    });
  }

  console.log(`  ✓ AI credits and usage logs created`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('ElectionCaffe Demo Tenant Seed Script');
  console.log('='.repeat(60));
  console.log(`Target: ${CONFIG.TOTAL_VOTERS.toLocaleString()} voters for Tamil Nadu`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Create constituency
    const constituency = await seedConstituency();

    // Step 2: Create election
    const election = await seedElection(constituency.id);

    // Step 3: Create master data
    await seedMasterData(election.id);

    // Step 4: Create parts and booths
    await seedPartsAndBooths(election.id);

    // Step 5: Create users
    await seedUsers();

    // Step 6: Create cadres
    await seedCadres(election.id);

    // Step 7: Create booth agents
    await seedBoothAgents(election.id);

    // Step 8: Create voters (this is the big one)
    await seedVoters(election.id);

    // Step 9: Create events
    await seedEvents(election.id);

    // Step 10: Create fund management data
    await seedFundManagement();

    // Step 11: Create inventory
    await seedInventory();

    // Step 12: Create news and broadcasts
    await seedNews();

    // Step 13: Create surveys
    await seedSurveys(election.id);

    // Step 14: Create reports and analytics
    await seedReportsAndAnalytics(election.id);

    // Step 15: Create notifications and chat
    await seedNotificationsAndChat();

    // Step 16: Create website
    await seedWebsite();

    // Step 17: Create AI credits
    await seedAICredits();

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Demo Tenant Seed Completed Successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  - Constituency: Karaikudi (184)`);
    console.log(`  - Election: Tamil Nadu Assembly Election 2024`);
    console.log(`  - Parts: ${CONFIG.PARTS_PER_CONSTITUENCY}`);
    console.log(`  - Booths: ${CONFIG.PARTS_PER_CONSTITUENCY * CONFIG.BOOTHS_PER_PART}`);
    console.log(`  - Voters: ${CONFIG.TOTAL_VOTERS.toLocaleString()}`);
    console.log(`  - Users: 253+ (admin, coordinators, volunteers)`);
    console.log(`  - Events: ${CONFIG.EVENTS}`);
    console.log(`  - Donations: ${CONFIG.DONATIONS}`);
    console.log(`  - Expenses: ${CONFIG.EXPENSES}`);
    console.log(`  - Surveys: ${CONFIG.SURVEYS}`);
    console.log(`  - News: ${CONFIG.NEWS_ARTICLES}`);
    console.log(`  - Notifications: ${CONFIG.NOTIFICATIONS}`);
    console.log('');
    console.log('Login credentials:');
    console.log('  - Admin: admin@demo.electioncaffe.com / Demo@123');
    console.log('  - Campaign Manager: campaign@demo.electioncaffe.com / Demo@123');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Seed Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
