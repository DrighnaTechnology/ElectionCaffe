/**
 * Analytics Demo Data Seed Script
 * Enhances existing voter data with analytics-relevant fields for demo
 *
 * Updates voters with:
 * - Political leaning (partyAffiliation)
 * - Mobile numbers (phone)
 * - Religion & Caste
 * - Age distribution (dateOfBirth)
 *
 * Run with: cd ElectionCaffe && npx tsx packages/database/prisma/seed-analytics-demo.ts
 */

import { PrismaClient, Gender, PoliticalLeaning } from '@prisma/client';

// Multi-tenant database configurations
const TENANT_DBS = [
  { name: 'EC_Demo', electionId: 'karaikudi-2024' },
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024' },
];

// Political leaning distribution (simulates realistic election scenario)
const POLITICAL_DISTRIBUTION = {
  LOYAL: 0.35,      // 35% loyal voters
  SWING: 0.30,      // 30% swing voters
  OPPOSITION: 0.25, // 25% opposition
  UNKNOWN: 0.10,    // 10% unknown
};

// Age distribution to match India's voter demographics
const AGE_DISTRIBUTION = [
  { minAge: 18, maxAge: 25, percentage: 0.18 }, // 18% young voters
  { minAge: 26, maxAge: 35, percentage: 0.22 }, // 22% working age young
  { minAge: 36, maxAge: 45, percentage: 0.20 }, // 20% middle aged
  { minAge: 46, maxAge: 55, percentage: 0.17 }, // 17% mature
  { minAge: 56, maxAge: 65, percentage: 0.13 }, // 13% senior
  { minAge: 66, maxAge: 85, percentage: 0.10 }, // 10% elderly
];

// Religion data
const RELIGIONS = [
  { name: 'Hindu', percentage: 0.72 },
  { name: 'Muslim', percentage: 0.14 },
  { name: 'Christian', percentage: 0.08 },
  { name: 'Sikh', percentage: 0.02 },
  { name: 'Buddhist', percentage: 0.02 },
  { name: 'Jain', percentage: 0.01 },
  { name: 'Other', percentage: 0.01 },
];

// Caste categories
const CASTE_CATEGORIES = [
  { name: 'General', percentage: 0.30 },
  { name: 'OBC', percentage: 0.40 },
  { name: 'SC', percentage: 0.18 },
  { name: 'ST', percentage: 0.10 },
  { name: 'EWS', percentage: 0.02 },
];

// Tamil Nadu specific castes
const TN_CASTES = [
  { name: 'Thevar', category: 'OBC' },
  { name: 'Gounder', category: 'OBC' },
  { name: 'Nadar', category: 'OBC' },
  { name: 'Vanniyar', category: 'OBC' },
  { name: 'Mudaliar', category: 'General' },
  { name: 'Brahmin', category: 'General' },
  { name: 'Chettiar', category: 'General' },
  { name: 'Adi Dravidar', category: 'SC' },
  { name: 'Pallar', category: 'SC' },
  { name: 'Arunthathiyar', category: 'SC' },
  { name: 'Irular', category: 'ST' },
];

// UP specific castes
const UP_CASTES = [
  { name: 'Yadav', category: 'OBC' },
  { name: 'Kurmi', category: 'OBC' },
  { name: 'Jat', category: 'OBC' },
  { name: 'Rajput', category: 'General' },
  { name: 'Brahmin', category: 'General' },
  { name: 'Bania', category: 'General' },
  { name: 'Jatav', category: 'SC' },
  { name: 'Pasi', category: 'SC' },
  { name: 'Kori', category: 'SC' },
  { name: 'Tharu', category: 'ST' },
];

// Helper functions
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getWeightedRandom<T extends { percentage: number }>(items: T[]): T {
  const random = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.percentage;
    if (random <= cumulative) return item;
  }
  return items[items.length - 1];
}

function generatePhone(): string {
  const prefixes = ['63', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const prefix = getRandomElement(prefixes);
  const number = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix + number;
}

function generateDOB(minAge: number, maxAge: number): Date {
  const today = new Date();
  const age = Math.floor(minAge + Math.random() * (maxAge - minAge + 1));
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(1 + Math.random() * 28);
  return new Date(birthYear, birthMonth, birthDay);
}

function getPoliticalLeaning(): PoliticalLeaning {
  const random = Math.random();
  let cumulative = 0;

  for (const [leaning, percentage] of Object.entries(POLITICAL_DISTRIBUTION)) {
    cumulative += percentage;
    if (random <= cumulative) {
      return leaning as PoliticalLeaning;
    }
  }
  return 'UNKNOWN';
}

function getAgeRange(): { minAge: number; maxAge: number } {
  return getWeightedRandom(AGE_DISTRIBUTION);
}

async function createMasterData(prisma: PrismaClient, electionId: string, isUP: boolean) {
  console.log(`  Creating master data for election: ${electionId}`);

  // Get election
  const election = await prisma.election.findFirst({
    where: { id: electionId }
  });

  if (!election) {
    console.log(`    ⚠️ Election not found: ${electionId}`);
    return { religions: [], castes: [], casteCategories: [] };
  }

  // Create religions
  const religions = [];
  for (const rel of RELIGIONS) {
    const religion = await (prisma as any).religion.upsert({
      where: {
        electionId_religionName: {
          electionId,
          religionName: rel.name,
        }
      },
      update: {},
      create: {
        electionId,
        religionName: rel.name,
        isActive: true,
      }
    });
    religions.push({ ...religion, percentage: rel.percentage });
  }
  console.log(`    ✓ Created ${religions.length} religions`);

  // Create caste categories
  const casteCategories = [];
  for (const cat of CASTE_CATEGORIES) {
    const category = await (prisma as any).casteCategory.upsert({
      where: {
        electionId_categoryName: {
          electionId,
          categoryName: cat.name,
        }
      },
      update: {},
      create: {
        electionId,
        categoryName: cat.name,
        categoryFullName: cat.name,
        isActive: true,
      }
    });
    casteCategories.push({ ...category, percentage: cat.percentage });
  }
  console.log(`    ✓ Created ${casteCategories.length} caste categories`);

  // Create castes
  const castes = [];
  const casteList = isUP ? UP_CASTES : TN_CASTES;
  for (const c of casteList) {
    const category = casteCategories.find(cat => cat.categoryName === c.category);
    if (!category) {
      console.log(`    ⚠️ Category not found for caste: ${c.name}`);
      continue;
    }

    // Check if caste already exists
    const existingCaste = await (prisma as any).caste.findFirst({
      where: {
        electionId,
        casteName: c.name,
      }
    });

    if (existingCaste) {
      castes.push(existingCaste);
    } else {
      const caste = await (prisma as any).caste.create({
        data: {
          electionId,
          casteName: c.name,
          casteCode: c.name.substring(0, 3).toUpperCase(),
          casteCategoryId: category.id,
          isActive: true,
        }
      });
      castes.push(caste);
    }
  }
  console.log(`    ✓ Created ${castes.length} castes`);

  return { religions, castes, casteCategories };
}

async function updateVotersForAnalytics(prisma: PrismaClient, electionId: string, masterData: any) {
  const { religions, castes, casteCategories } = masterData;

  if (religions.length === 0 || castes.length === 0) {
    console.log('    ⚠️ No master data available, skipping voter updates');
    return;
  }

  // Get all voters for this election
  const voters = await (prisma as any).voter.findMany({
    where: { electionId, deletedAt: null },
    select: { id: true, gender: true }
  });

  console.log(`    Found ${voters.length} voters to update`);

  if (voters.length === 0) {
    console.log('    ⚠️ No voters found for election');
    return;
  }

  // Process voters in batches
  const BATCH_SIZE = 500;
  let updated = 0;
  let withMobile = 0;
  let withDOB = 0;
  let withReligion = 0;
  let withCaste = 0;

  for (let i = 0; i < voters.length; i += BATCH_SIZE) {
    const batch = voters.slice(i, Math.min(i + BATCH_SIZE, voters.length));

    const updatePromises = batch.map(async (voter: any) => {
      const ageRange = getAgeRange();
      const dob = generateDOB(ageRange.minAge, ageRange.maxAge);
      const age = new Date().getFullYear() - dob.getFullYear();

      // 75% have mobile
      const hasMobile = Math.random() < 0.75;
      // 90% have DOB
      const hasDOB = Math.random() < 0.90;
      // 70% have religion
      const hasReligion = Math.random() < 0.70;
      // 65% have caste
      const hasCaste = Math.random() < 0.65;

      const religion = hasReligion ? getWeightedRandom(religions) : null;
      const caste = hasCaste ? getRandomElement(castes) : null;
      const category = caste ? casteCategories.find((c: any) => c.id === caste.casteCategoryId) : null;

      if (hasMobile) withMobile++;
      if (hasDOB) withDOB++;
      if (hasReligion) withReligion++;
      if (hasCaste) withCaste++;

      return (prisma as any).voter.update({
        where: { id: voter.id },
        data: {
          mobile: hasMobile ? generatePhone() : null,
          dateOfBirth: hasDOB ? dob : null,
          age: hasDOB ? age : null,
          politicalLeaning: getPoliticalLeaning(),
          religionId: religion?.id || null,
          casteId: caste?.id || null,
          casteCategoryId: category?.id || null,
        }
      });
    });

    await Promise.all(updatePromises);
    updated += batch.length;

    if ((i / BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= voters.length) {
      console.log(`    Progress: ${updated}/${voters.length} voters updated`);
    }
  }

  console.log(`    ✓ Updated ${updated} voters with analytics data`);
  console.log(`      - With mobile: ${withMobile} (${((withMobile/updated)*100).toFixed(1)}%)`);
  console.log(`      - With DOB: ${withDOB} (${((withDOB/updated)*100).toFixed(1)}%)`);
  console.log(`      - With religion: ${withReligion} (${((withReligion/updated)*100).toFixed(1)}%)`);
  console.log(`      - With caste: ${withCaste} (${((withCaste/updated)*100).toFixed(1)}%)`);
}

async function seedAnalyticsData(tenantName: string, electionId: string) {
  const databaseUrl = `postgresql://postgres:postgres@localhost:5432/${tenantName}?schema=public`;

  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    }
  });

  try {
    console.log(`\n📊 Seeding analytics data for ${tenantName}...`);

    // Check if election exists
    const election = await prisma.election.findFirst({
      where: { id: electionId }
    });

    if (!election) {
      // Try to find any election in this tenant
      const anyElection = await prisma.election.findFirst();
      if (anyElection) {
        console.log(`  Using election: ${anyElection.name} (${anyElection.id})`);
        const isUP = tenantName.includes('UP');
        const masterData = await createMasterData(prisma, anyElection.id, isUP);
        await updateVotersForAnalytics(prisma, anyElection.id, masterData);
      } else {
        console.log(`  ⚠️ No elections found in ${tenantName}, skipping...`);
      }
    } else {
      console.log(`  Using election: ${election.name} (${election.id})`);
      const isUP = tenantName.includes('UP');
      const masterData = await createMasterData(prisma, election.id, isUP);
      await updateVotersForAnalytics(prisma, election.id, masterData);
    }

    console.log(`✅ ${tenantName} analytics data complete`);
  } catch (error) {
    console.error(`❌ Error seeding ${tenantName}:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting Analytics Demo Data Seeding...\n');
  console.log('This script will update existing voters with:');
  console.log('  - Political leaning (35% loyal, 30% swing, 25% opposition, 10% unknown)');
  console.log('  - Mobile numbers (~75% coverage)');
  console.log('  - Date of birth & age (~90% coverage)');
  console.log('  - Religion (~70% coverage)');
  console.log('  - Caste & category (~65% coverage)\n');

  for (const tenant of TENANT_DBS) {
    await seedAnalyticsData(tenant.name, tenant.electionId);
  }

  console.log('\n🎉 Analytics demo data seeding complete!');
  console.log('\nYou can now visit http://localhost:5175/analytics to see the analytics page with demo data.');
}

main().catch(console.error);
