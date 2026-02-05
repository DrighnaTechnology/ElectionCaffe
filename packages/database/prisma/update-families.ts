import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

const TENANT_DBS = [
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024' },
];

const FAMILY_SURNAMES = [
  'Sharma', 'Reddy', 'Naidu', 'Pillai', 'Nair', 'Iyer', 'Menon', 'Patel', 'Shah', 'Gupta',
  'Verma', 'Singh', 'Kumar', 'Yadav', 'Pandey', 'Mishra', 'Joshi', 'Desai', 'Mehta', 'Bhat',
  'Rajan', 'Nayak', 'Rao', 'Choudhary', 'Agarwal', 'Bansal', 'Chopra', 'Saxena', 'Kapoor', 'Malhotra',
  'Khanna', 'Sinha', 'Mukherjee', 'Chatterjee', 'Banerjee', 'Ghosh', 'Das', 'Sen', 'Roy', 'Bose',
  'Krishnan', 'Venkatesh', 'Subramanian', 'Raghavan', 'Sundaram', 'Natarajan', 'Balaji', 'Anand', 'Mohan', 'Vijay',
];

async function updateFamiliesForTenant(dbName: string, tenantIndex: number) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Updating families for ${dbName}...`);

    // Get ALL families that need updating (familyName is null)
    const families = await client.family.findMany({
      where: {
        OR: [
          { familyName: null },
          { mobile: null }
        ]
      },
      select: {
        id: true,
        headName: true,
      },
    });

    console.log(`  Found ${families.length} families to update`);

    if (families.length === 0) {
      console.log(`  ✅ All families already have familyName and mobile set`);
      return;
    }

    // Update in batches for better performance
    const BATCH_SIZE = 1000;
    let updated = 0;

    for (let i = 0; i < families.length; i += BATCH_SIZE) {
      const batch = families.slice(i, i + BATCH_SIZE);

      // Use transaction for batch updates
      await client.$transaction(
        batch.map((f, idx) => {
          const globalIndex = i + idx;
          const surname = FAMILY_SURNAMES[globalIndex % FAMILY_SURNAMES.length];

          // Generate familyName from headName or use surname
          let familyName: string;
          if (f.headName) {
            const nameParts = f.headName.split(' ');
            const lastPart = nameParts[nameParts.length - 1];
            familyName = `${lastPart} Family`;
          } else {
            familyName = `${surname} Family`;
          }

          // Generate mobile number
          const prefix = 90 + tenantIndex;
          const mobile = `${prefix}${String(globalIndex + 10000).padStart(8, '0')}`;

          return client.family.update({
            where: { id: f.id },
            data: {
              familyName,
              mobile,
            },
          });
        })
      );

      updated += batch.length;
      console.log(`  Updated ${updated}/${families.length} families...`);
    }

    console.log(`  ✅ Updated ${updated} families with familyName and mobile`);

    // Verify the update
    const sample = await client.family.findFirst({
      select: {
        familyName: true,
        headName: true,
        mobile: true,
      },
    });
    console.log(`  Sample: Family="${sample?.familyName}" | Head="${sample?.headName}" | Mobile="${sample?.mobile}"`);

  } catch (error) {
    console.error(`  ❌ Error updating families for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting families update...\n');

  for (let i = 0; i < TENANT_DBS.length; i++) {
    const tenant = TENANT_DBS[i];
    await updateFamiliesForTenant(tenant.name, i);
  }

  console.log('\n✨ Families update completed!');
}

main().catch(console.error);
