import { fundManagementSchema } from './fund-management.schema';
import { inventoryManagementSchema } from './inventory-management.schema';

export const featureSchemas: Record<string, any> = {
  fund_management: fundManagementSchema,
  inventory_management: inventoryManagementSchema,
};

export { fundManagementSchema, inventoryManagementSchema };
