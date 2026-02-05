// Set database URLs
process.env.CORE_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore?schema=public';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public';

const { coreDb } = require('./packages/database/dist/clients/core-client.js');

async function enableFundAndInventory() {
  try {
    console.log('🔧 Enabling Fund & Inventory Management features...\n');

    // Get all tenants
    const tenants = await coreDb.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true }
    });

    console.log(`Found ${tenants.length} active tenants\n`);

    // Get fund and inventory features
    const fundFeature = await coreDb.featureFlag.findUnique({
      where: { featureKey: 'fund_management' }
    });

    const inventoryFeature = await coreDb.featureFlag.findUnique({
      where: { featureKey: 'inventory_management' }
    });

    if (!fundFeature || !inventoryFeature) {
      console.log('❌ Features not found in database');
      console.log('💡 Run seed script: cd packages/database && npx tsx prisma/seed-core.ts\n');
      return;
    }

    console.log('✅ Found features:');
    console.log(`   - ${fundFeature.featureName} (${fundFeature.featureKey})`);
    console.log(`   - ${inventoryFeature.featureName} (${inventoryFeature.featureKey})\n`);

    // Enable features for all tenants
    let enabled = 0;
    let alreadyEnabled = 0;

    for (const tenant of tenants) {
      console.log(`Processing: ${tenant.name} (${tenant.slug})`);

      // Enable fund_management
      const fundTF = await coreDb.tenantFeature.upsert({
        where: {
          tenantId_featureId: {
            tenantId: tenant.id,
            featureId: fundFeature.id
          }
        },
        update: { isEnabled: true },
        create: {
          tenantId: tenant.id,
          featureId: fundFeature.id,
          isEnabled: true
        }
      });

      // Enable inventory_management
      const invTF = await coreDb.tenantFeature.upsert({
        where: {
          tenantId_featureId: {
            tenantId: tenant.id,
            featureId: inventoryFeature.id
          }
        },
        update: { isEnabled: true },
        create: {
          tenantId: tenant.id,
          featureId: inventoryFeature.id,
          isEnabled: true
        }
      });

      if (fundTF.isEnabled && invTF.isEnabled) {
        enabled++;
        console.log('   ✅ Enabled both features\n');
      } else {
        alreadyEnabled++;
        console.log('   ⏭️  Already enabled\n');
      }
    }

    console.log('=' .repeat(60));
    console.log('✅ SUCCESS! Features enabled for all tenants');
    console.log('='.repeat(60));
    console.log(`Total tenants: ${tenants.length}`);
    console.log(`Enabled: ${enabled}`);
    console.log(`Already enabled: ${alreadyEnabled}`);
    console.log('='.repeat(60));

    console.log('\n📋 Next Steps:');
    console.log('   1. Restart the auth service (if running)');
    console.log('   2. Login with any tenant credentials:');
    console.log('');
    console.log('   Tenant: bjp-tn');
    console.log('   Email: admin.bjp-tn@electioncaffe.com');
    console.log('   Password: Admin@123');
    console.log('');
    console.log('   3. Go to http://localhost:5175/');
    console.log('   4. You should see "Funds" and "Inventory" in the menu\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await coreDb.$disconnect();
  }
}

enableFundAndInventory();
