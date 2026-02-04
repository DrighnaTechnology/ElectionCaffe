// Set database URLs
process.env.CORE_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore?schema=public';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public';

// Use the database package exports which handle client selection properly
const { coreDb } = require('./packages/database/dist/clients/core-client.js');
const { PrismaClient } = require('./packages/database/node_modules/.prisma/tenant-client');

async function syncTenantsToCore() {
  try {
    console.log('🔄 Syncing tenants configuration...\n');

    // The main ElectionCaffe database uses the tenant schema
    // But for this migration, we need to query from whatever database has the tenants
    // Let's query from the core DB which should have them

    console.log('📊 Checking tenants in Core database...\n');

    const existingTenants = await coreDb.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        databaseType: true,
        databaseStatus: true,
      }
    });

    console.log(`Found ${existingTenants.length} tenants in Core database\n`);

    if (existingTenants.length === 0) {
      console.log('❌ No tenants found. They may need to be created first.');
      console.log('\n💡 To create demo data, run:');
      console.log('   cd packages/database');
      console.log('   npx tsx prisma/seed-ec-demo.ts\n');
      return;
    }

    // Update all tenants to have SHARED database configuration
    let updated = 0;
    let errors = 0;

    for (const tenant of existingTenants) {
      try {
        // Only update if not already configured
        if (tenant.databaseType === 'NONE' || tenant.databaseStatus !== 'READY') {
          await coreDb.tenant.update({
            where: { id: tenant.id },
            data: {
              databaseType: 'SHARED',
              databaseStatus: 'READY',
              databaseConnectionUrl: 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public'
            }
          });
          updated++;
          console.log(`✅ Updated: ${tenant.name} (${tenant.slug}) → SHARED database`);
        } else {
          console.log(`⏭️  Skipped: ${tenant.name} (${tenant.slug}) → Already configured as ${tenant.databaseType}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error updating ${tenant.name}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Sync Summary:');
    console.log('='.repeat(60));
    console.log(`Total tenants: ${existingTenants.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (errors === 0 && updated > 0) {
      console.log('\n✅ SUCCESS! Tenant database configuration updated.');
      console.log('\n📋 Next Steps:');
      console.log('   1. Restart the auth service:');
      console.log('      cd services/auth-service && npm run dev');
      console.log('   2. Test login at http://localhost:5175/');
      console.log('      Email: admin.tn.bjp@electioncaffe.com');
      console.log('      Password: Admin@123');
      console.log('      Tenant: tn-bjp');
      console.log('   3. Verify "Funds" and "Inventory" menu items appear\n');
    } else if (updated === 0) {
      console.log('\n✅ All tenants already configured properly!');
      console.log('\n📋 Next Steps:');
      console.log('   1. If you still can\'t login, restart the auth service');
      console.log('   2. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)\n');
    } else {
      console.log(`\n⚠️  WARNING: ${errors} tenant(s) had errors. Review logs above.\n`);
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('\nFull error:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. ElectionCaffeCore database exists');
    console.error('   3. Database connection details in .env are correct\n');
  } finally {
    await coreDb.$disconnect();
  }
}

syncTenantsToCore();
