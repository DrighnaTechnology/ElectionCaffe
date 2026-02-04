import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

const TENANT_DBS = [
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024' },
];

// Common Indian family names (surnames)
const FAMILY_SURNAMES = [
  'Sharma', 'Reddy', 'Naidu', 'Pillai', 'Nair', 'Iyer', 'Menon', 'Patel', 'Shah', 'Gupta',
  'Verma', 'Singh', 'Kumar', 'Yadav', 'Pandey', 'Mishra', 'Joshi', 'Desai', 'Mehta', 'Bhat',
  'Rajan', 'Nayak', 'Rao', 'Choudhary', 'Agarwal', 'Bansal', 'Chopra', 'Saxena', 'Kapoor', 'Malhotra',
  'Khanna', 'Sinha', 'Mukherjee', 'Chatterjee', 'Banerjee', 'Ghosh', 'Das', 'Sen', 'Roy', 'Bose',
  'Krishnan', 'Venkatesh', 'Subramanian', 'Raghavan', 'Sundaram', 'Natarajan', 'Balaji', 'Anand', 'Mohan', 'Vijay',
];

const LOCALITIES = [
  'Gandhi Nagar', 'Nehru Colony', 'Rajaji Street', 'Anna Nagar', 'Bharathi Road',
  'Kamaraj Nagar', 'Periyar Street', 'Ambedkar Colony', 'Tilak Nagar', 'Subhash Road',
  'MG Road', 'Station Road', 'Temple Street', 'Market Lane', 'School Road',
  'Hospital Road', 'Bus Stand Area', 'Railway Colony', 'Teachers Colony', 'Bank Street',
];

const ZONES = ['North', 'South', 'East', 'West', 'Central'];

const PARTY_AFFILIATIONS = ['BJP', 'INC', 'NEUTRAL', 'AAP', 'DMK', 'AIADMK', 'OTHER'];

function generateHouseNumber(index: number): string {
  const formats = [
    () => `${Math.floor(Math.random() * 999) + 1}`,
    () => `${String.fromCharCode(65 + (index % 26))}-${Math.floor(Math.random() * 200) + 1}`,
    () => `${Math.floor(Math.random() * 99) + 1}/${Math.floor(Math.random() * 500) + 1}`,
    () => `${Math.floor(Math.random() * 50) + 1}-${String.fromCharCode(65 + (index % 26))}`,
  ];
  return formats[index % formats.length]();
}

function generateMobile(baseIndex: number, tenantIndex: number): string {
  const prefix = 90 + tenantIndex;
  return `${prefix}${String(baseIndex + 10000).padStart(8, '0')}`;
}

async function seedFamiliesForTenant(dbName: string, electionId: string, tenantIndex: number) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Seeding families for ${dbName}...`);

    // Check if families already exist
    const existingCount = await client.family.count();
    if (existingCount > 0) {
      console.log(`  ⏭️  Families already exist (${existingCount} found), skipping...`);
      return;
    }

    // Get parts for assignments
    const parts = await client.part.findMany({ take: 10 });
    if (parts.length === 0) {
      console.log('  ⚠️  No parts found, skipping families seed');
      return;
    }

    // Get voters without families to assign as members
    const voters = await client.voter.findMany({
      where: {
        familyId: null,
        electionId: electionId,
      },
      take: 300,
      select: {
        id: true,
        voterName: true,
        firstName: true,
        lastName: true,
      },
    });

    if (voters.length < 50) {
      console.log(`  ⚠️  Not enough voters without families (${voters.length} found), need at least 50`);
      return;
    }

    let familiesCreated = 0;
    let votersAssigned = 0;
    let voterIndex = 0;

    // Create 50 families
    for (let i = 0; i < 50 && voterIndex < voters.length - 2; i++) {
      const surname = FAMILY_SURNAMES[i % FAMILY_SURNAMES.length];
      const locality = LOCALITIES[i % LOCALITIES.length];
      const zone = ZONES[i % ZONES.length];
      const part = parts[i % parts.length];
      const houseNo = generateHouseNumber(i);
      const mobile = generateMobile(i, tenantIndex);
      const partyAffiliation = PARTY_AFFILIATIONS[i % PARTY_AFFILIATIONS.length];
      const supportLevel = Math.floor(Math.random() * 5) + 1; // 1-5
      const memberCount = Math.min(Math.floor(Math.random() * 5) + 2, voters.length - voterIndex); // 2-6 members

      // Get the head voter
      const headVoter = voters[voterIndex];
      const headName = headVoter.voterName || `${headVoter.firstName || ''} ${headVoter.lastName || ''}`.trim() || `${surname} Head`;

      // Create family
      const family = await client.family.create({
        data: {
          electionId,
          partId: part.id,
          familyName: `${surname} Family`,
          headName,
          address: `${houseNo}, ${locality}, ${zone} Zone`,
          houseNo,
          mobile,
          totalMembers: memberCount,
          partyAffiliation,
          supportLevel,
        },
      });

      // Assign voters to family
      const memberVoterIds = [];
      for (let j = 0; j < memberCount && voterIndex < voters.length; j++) {
        memberVoterIds.push(voters[voterIndex].id);
        voterIndex++;
      }

      // Update voters with family assignment
      if (memberVoterIds.length > 0) {
        // Mark first member as captain
        await client.voter.update({
          where: { id: memberVoterIds[0] },
          data: {
            familyId: family.id,
            isFamilyCaptain: true,
          },
        });

        // Assign remaining members
        if (memberVoterIds.length > 1) {
          await client.voter.updateMany({
            where: { id: { in: memberVoterIds.slice(1) } },
            data: { familyId: family.id },
          });
        }

        votersAssigned += memberVoterIds.length;
      }

      familiesCreated++;
    }

    console.log(`  ✅ Created ${familiesCreated} families with ${votersAssigned} voters assigned`);
  } catch (error) {
    console.error(`  ❌ Error seeding families for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting families seed...\n');

  for (let i = 0; i < TENANT_DBS.length; i++) {
    const tenant = TENANT_DBS[i];
    await seedFamiliesForTenant(tenant.name, tenant.electionId, i);
  }

  console.log('\n✨ Families seed completed!');
}

main().catch(console.error);
