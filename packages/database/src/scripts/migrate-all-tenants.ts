/**
 * migrate-all-tenants.ts
 *
 * Pushes the current tenant schema to every READY tenant database.
 * Called automatically by start.sh on each startup so all tenants
 * (existing and new) always have the latest schema.
 *
 * New tenants are handled by provisionTenantDatabase() which calls
 * pushTenantSchema() during provisioning.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// __dirname is available in CJS (this package has no "type": "module")
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

import { migrateAllTenantDatabases } from '../clients/db-manager.js';

(async () => {
  try {
    await migrateAllTenantDatabases();
    process.exit(0);
  } catch (err) {
    console.error('[migrate-tenants] Fatal error:', err);
    process.exit(1);
  }
})();
