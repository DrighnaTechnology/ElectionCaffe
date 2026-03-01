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
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
