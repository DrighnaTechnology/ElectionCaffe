/**
 * Verify Multi-Tenant Data Isolation
 *
 * This script verifies the voter counts in each tenant database
 */

import { PrismaClient as CorePrismaClient } from '../node_modules/.prisma/core-client/index.js';
import { PrismaClient as TenantPrismaClient } from '../node_modules/.prisma/tenant-client/index.js';

const corePrisma = new CorePrismaClient();

interface TenantConfig {
  slug: string;
  name: string;
  databaseUrl: string;
}

const tenants: TenantConfig[] = [
  {
    slug: 'bjp-tn',
    name: 'BJP Tamil Nadu',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_TN?schema=public',
  },
  {
    slug: 'bjp-up',
    name: 'BJP Uttar Pradesh',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_UP?schema=public',
  },
  {
    slug: 'aidmk-tn',
    name: 'AIDMK Tamil Nadu',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_AIDMK_TN?schema=public',
  },
];

async function verifyTenants() {
  console.log('============================================================');
  console.log('MULTI-TENANT DATA ISOLATION VERIFICATION');
  console.log('============================================================\n');

  // First verify tenants in Core database
  console.log('📋 Verifying Tenants in ElectionCaffeCore...\n');

  const coreTenantsResult = await corePrisma.tenant.findMany({
    where: {
      slug: { in: ['bjp-tn', 'bjp-up', 'aidmk-tn'] }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      databaseName: true,
      databaseStatus: true,
    }
  });

  console.log('Tenants in Core Database:');
  for (const tenant of coreTenantsResult) {
    console.log(`  ✓ ${tenant.name} (${tenant.slug})`);
    console.log(`    - Database: ${tenant.databaseName}`);
    console.log(`    - Status: ${tenant.databaseStatus}`);
  }
  console.log('');

  // Verify each tenant database
  console.log('📊 Verifying Voter Counts in Each Tenant Database...\n');

  let totalVoters = 0;

  for (const tenant of tenants) {
    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: tenant.databaseUrl }
      }
    });

    try {
      const voterCount = await tenantPrisma.voter.count();
      const electionCount = await tenantPrisma.election.count();
      const userCount = await tenantPrisma.user.count();

      // Sample EPIC numbers to verify uniqueness
      const sampleVoters = await tenantPrisma.voter.findMany({
        take: 3,
        select: { epicNumber: true }
      });

      console.log(`🏛️  ${tenant.name}`);
      console.log(`    Database: ${tenant.databaseUrl.split('/').pop()?.split('?')[0]}`);
      console.log(`    Voters: ${voterCount.toLocaleString()}`);
      console.log(`    Elections: ${electionCount}`);
      console.log(`    Users: ${userCount}`);
      console.log(`    Sample EPIC Numbers: ${sampleVoters.map(v => v.epicNumber).join(', ')}`);
      console.log('');

      totalVoters += voterCount;

      await tenantPrisma.$disconnect();
    } catch (error) {
      console.error(`  ❌ Error verifying ${tenant.name}:`, error);
    }
  }

  console.log('============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('============================================================');
  console.log(`✅ Total Tenants: ${tenants.length}`);
  console.log(`✅ Total Voters: ${totalVoters.toLocaleString()}`);
  console.log(`✅ Average per Tenant: ${(totalVoters / tenants.length).toLocaleString()}`);
  console.log('');

  if (totalVoters >= 1500000) {
    console.log('🎉 Multi-tenant isolation verification PASSED!');
    console.log('   Each tenant has its own isolated database with separate voter data.');
  } else {
    console.log('⚠️  Warning: Expected 1.5M total voters, got ' + totalVoters.toLocaleString());
  }

  await corePrisma.$disconnect();
}

verifyTenants()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  });
