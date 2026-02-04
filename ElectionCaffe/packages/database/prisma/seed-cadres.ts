import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

const TENANT_DBS = [
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024', tenantId: 'tenant-bjp-tn' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024', tenantId: 'tenant-bjp-up' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024', tenantId: 'tenant-aidmk-tn' },
];

const CADRE_TYPES = [
  'BOOTH_AGENT',
  'SECTOR_OFFICER',
  'WARD_PRESIDENT',
  'MANDAL_PRESIDENT',
  'VOLUNTEER',
  'COORDINATOR',
];

const ZONES = ['North', 'South', 'East', 'West', 'Central'];
const SECTORS = ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5'];

// Generate Indian names
const firstNames = [
  'Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Ganesh',
  'Vijay', 'Ajay', 'Sanjay', 'Anil', 'Sunil',
  'Kumar', 'Ravi', 'Prakash', 'Mohan', 'Sohan',
  'Priya', 'Sunita', 'Anita', 'Kavita', 'Meena',
  'Lakshmi', 'Saroja', 'Parvathi', 'Geetha', 'Revathi',
  'Arjun', 'Karthik', 'Vikram', 'Arun', 'Varun',
];

const lastNames = [
  'Kumar', 'Sharma', 'Singh', 'Reddy', 'Naidu',
  'Pillai', 'Nair', 'Menon', 'Iyer', 'Iyengar',
  'Pandey', 'Mishra', 'Gupta', 'Verma', 'Yadav',
  'Patel', 'Shah', 'Mehta', 'Joshi', 'Desai',
];

async function seedCadresForTenant(dbName: string, electionId: string, tenantId: string) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Seeding cadres for ${dbName}...`);

    // Check if cadres already exist
    const existingCount = await client.cadre.count();
    if (existingCount > 0) {
      console.log(`  ⏭️  Cadres already exist (${existingCount} found), skipping...`);
      return;
    }

    // Get parts for assignments
    const parts = await client.part.findMany({ take: 50 });
    if (parts.length === 0) {
      console.log('  ⚠️  No parts found, skipping cadres seed');
      return;
    }

    // Create 30 cadres per tenant
    const cadresData = [];
    for (let i = 0; i < 30; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const mobile = `90001${String(i + 100).padStart(5, '0')}`;
      const cadreType = CADRE_TYPES[i % CADRE_TYPES.length];
      const zone = ZONES[i % ZONES.length];
      const sector = SECTORS[i % SECTORS.length];

      // Create user for cadre
      const user = await client.user.create({
        data: {
          tenantId,
          firstName,
          lastName,
          mobile,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
          passwordHash: '$2a$10$dummyhashedpasswordfortesting123456789', // Dummy password hash
          role: 'VOLUNTEER',
          status: 'ACTIVE',
        },
      });

      // Create cadre
      const cadre = await client.cadre.create({
        data: {
          userId: user.id,
          electionId,
          cadreType,
          designation: `${cadreType.replace('_', ' ')} - ${zone}`,
          zone,
          sector,
          ward: `Ward ${(i % 10) + 1}`,
          locality: `Locality ${(i % 5) + 1}`,
          assignedParts: parts.slice(i % 10, (i % 10) + 3).map(p => p.id),
          targetVoters: 500 + (i * 50),
          isActive: true,
        },
      });

      // Create assignment to a part
      if (parts[i % parts.length]) {
        await client.cadreAssignment.create({
          data: {
            cadreId: cadre.id,
            assignmentType: cadreType === 'BOOTH_AGENT' ? 'BOOTH' : 'SECTOR',
            entityId: parts[i % parts.length].id,
            entityType: 'PART',
            startDate: new Date(),
            isActive: true,
          },
        });
      }

      cadresData.push({ firstName, lastName, cadreType });
    }

    console.log(`  ✅ Created ${cadresData.length} cadres with users and assignments`);
  } catch (error) {
    console.error(`  ❌ Error seeding cadres for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting cadres seed...\n');

  for (const tenant of TENANT_DBS) {
    await seedCadresForTenant(tenant.name, tenant.electionId, tenant.tenantId);
  }

  console.log('\n✨ Cadres seed completed!');
}

main().catch(console.error);
