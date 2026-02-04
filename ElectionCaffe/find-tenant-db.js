const { PrismaClient } = require('@prisma/client');

async function findTenantInDatabases() {
  try {
    console.log('Searching for tn-bjp tenant in both databases...\n');

    // Check ElectionCaffe database
    console.log('1. Checking ElectionCaffe (main) database:');
    const mainDb = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public'
        }
      }
    });

    try {
      const mainTenant = await mainDb.tenant.findUnique({
        where: { slug: 'tn-bjp' },
        select: { id: true, name: true, slug: true, databaseType: true, databaseStatus: true }
      });

      if (mainTenant) {
        console.log('   ✅ FOUND in ElectionCaffe database:');
        console.log('   ', JSON.stringify(mainTenant, null, 2));
      } else {
        console.log('   ❌ NOT FOUND in ElectionCaffe database');
      }
    } catch (error) {
      console.log('   ❌ Error querying ElectionCaffe:', error.message);
    } finally {
      await mainDb.$disconnect();
    }

    console.log('\n2. Checking ElectionCaffeCore database:');
    const coreDb = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore?schema=public'
        }
      }
    });

    try {
      const coreTenant = await coreDb.tenant.findUnique({
        where: { slug: 'tn-bjp' },
        select: { id: true, name: true, slug: true, databaseType: true, databaseStatus: true }
      });

      if (coreTenant) {
        console.log('   ✅ FOUND in ElectionCaffeCore database:');
        console.log('   ', JSON.stringify(coreTenant, null, 2));
      } else {
        console.log('   ❌ NOT FOUND in ElectionCaffeCore database');
      }
    } catch (error) {
      console.log('   ❌ Error querying ElectionCaffeCore:', error.message);
    } finally {
      await coreDb.$disconnect();
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTenantInDatabases();
