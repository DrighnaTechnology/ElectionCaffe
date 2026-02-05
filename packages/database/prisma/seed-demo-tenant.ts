/**
 * Create Demo Tenant in ElectionCaffeCore
 *
 * This creates the Demo tenant record with proper database configuration
 */

import { PrismaClient } from '../node_modules/.prisma/core-client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Demo tenant in ElectionCaffeCore...');

  // Get the free license plan
  const freePlan = await prisma.licensePlan.findUnique({
    where: { planCode: 'free' },
  });

  if (!freePlan) {
    throw new Error('Free license plan not found. Please run seed-core.ts first.');
  }

  // Create or update Demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
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
    },
    create: {
      name: 'Demo',
      slug: 'demo',
      contactEmail: 'demo@electioncaffe.com',
      contactPhone: '9999999990',
      status: 'ACTIVE',
      tenantType: 'INDIVIDUAL_CANDIDATE',

      // Database configuration
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

      // Resource limits from free plan
      maxVoters: 5000,
      maxCadres: 20,
      maxElections: 1,
      maxUsers: 10,
      maxConstituencies: 1,
      storageQuotaMB: 1000,
      subscriptionPlan: 'free',
    },
  });

  console.log('  ✓ Demo tenant created/updated');
  console.log(`    - ID: ${tenant.id}`);
  console.log(`    - Name: ${tenant.name}`);
  console.log(`    - Slug: ${tenant.slug}`);
  console.log(`    - Database: EC_Demo`);
  console.log(`    - Status: ${tenant.databaseStatus}`);

  // Create tenant license record
  await prisma.tenantLicense.upsert({
    where: {
      tenantId: tenant.id,
    },
    update: {
      planId: freePlan.id,
      status: 'active',
    },
    create: {
      tenantId: tenant.id,
      planId: freePlan.id,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      autoRenew: true,
    },
  });

  console.log('  ✓ Tenant license created');

  // Enable all core features for Demo tenant
  const coreFeatures = await prisma.featureFlag.findMany({
    where: {
      category: { in: ['core', 'modules', 'communication'] },
      defaultEnabled: true,
    },
  });

  for (const feature of coreFeatures) {
    await prisma.tenantFeature.upsert({
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

  console.log(`  ✓ ${coreFeatures.length} features enabled for Demo tenant`);

  console.log('\n✅ Demo tenant setup completed!');
  console.log('\n📋 Summary:');
  console.log(`  - Tenant: Demo (slug: demo)`);
  console.log(`  - Database: EC_Demo on localhost:5432`);
  console.log(`  - License: Free Plan`);
  console.log(`  - Features: ${coreFeatures.length} features enabled`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
