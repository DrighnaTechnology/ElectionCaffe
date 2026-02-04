import { Tenant } from '@prisma/client';

// TODO: Fix feature schemas - currently not implemented

/**
 * Creates feature-specific database tables for a tenant
 */
export async function createFeatureTables(tenant: Tenant, featureKey: string): Promise<void> {
  console.log(`Feature table creation not yet implemented for: ${featureKey}`);
  console.log(`Tenant: ${tenant.name}, Database type: ${tenant.databaseType}`);
  return;
}

/**
 * Drops feature-specific database tables for a tenant
 */
export async function dropFeatureTables(tenant: Tenant, featureKey: string): Promise<void> {
  // const schema = featureSchemas[featureKey];

  // if (!schema) {
    console.log(`Feature table dropping not yet implemented for: ${featureKey}`);
    return;
  // }

  // const tenantDbUrl = getTenantDatabaseUrl(tenant);

  // console.log(`Dropping tables for feature "${featureKey}" in tenant "${tenant.name}"`);

  // const tenantPrisma = new PrismaClient({
  //   datasources: {
  //     db: { url: tenantDbUrl },
  //   },
  // });

  // try {
  //   // Drop tables in reverse order to handle foreign keys
  //   const reversedTables = [...schema.tables].reverse();

  //   for (const table of reversedTables) {
  //     console.log(`  Dropping table: ${table.name}...`);

  //     try {
  //       await tenantPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
  //       console.log(`  ✓ Table ${table.name} dropped successfully`);
  //     } catch (error) {
  //       console.error(`  ✗ Error dropping table ${table.name}:`, error);
  //       // Continue with other tables
  //     }
  //   }

  //   console.log(`✓ All tables for feature "${featureKey}" dropped successfully`);
  // } catch (error) {
  //   console.error(`Error dropping tables for feature "${featureKey}":`, error);
  //   throw new Error(`Failed to drop tables for feature: ${featureKey}`);
  // } finally {
  //   await tenantPrisma.$disconnect();
  // }
}

/**
 * Checks if feature tables exist for a tenant
 */
export async function featureTablesExist(_tenant: Tenant, _featureKey: string): Promise<boolean> {
  // const schema = featureSchemas[featureKey];

  // if (!schema || !schema.tables || schema.tables.length === 0) {
    return false;
  // }

  // const tenantDbUrl = getTenantDatabaseUrl(tenant);
  // const tenantPrisma = new PrismaClient({
  //   datasources: {
  //     db: { url: tenantDbUrl },
  //   },
  // });

  // try {
  //   // Check if first table exists
  //   const firstTable = schema.tables[0].name;
  //   const result = await tenantPrisma.$queryRawUnsafe<any[]>(`
  //     SELECT EXISTS (
  //       SELECT FROM information_schema.tables
  //       WHERE table_name = '${firstTable}'
  //     ) as exists;
  //   `);

  //   return result[0]?.exists || false;
  // } catch (error) {
  //   console.error(`Error checking if tables exist:`, error);
  //   return false;
  // } finally {
  //   await tenantPrisma.$disconnect();
  // }
}

// getTenantDatabaseUrl function removed - not needed until feature schemas are implemented
