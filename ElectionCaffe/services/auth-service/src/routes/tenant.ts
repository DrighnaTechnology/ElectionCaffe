import { Router, Request, Response } from 'express';
import { Client } from 'pg';
import { coreDb } from '@electioncaffe/database';
import { successResponse, errorResponse } from '@electioncaffe/shared';

const router = Router();

// Get tenant branding/settings (accessible by all authenticated users)
router.get('/branding', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    res.json(successResponse({
      id: tenant.id,
      name: tenant.name,
      displayName: tenant.displayName,
      organizationName: tenant.organizationName,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      faviconUrl: tenant.faviconUrl,
      tenantType: tenant.tenantType,
      partyName: tenant.partyName,
      partySymbolUrl: tenant.partySymbolUrl,
      tenantUrl: tenant.tenantUrl,
      customDomain: tenant.customDomain,
    }));
  } catch (error) {
    console.error('Get tenant branding error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update tenant branding settings (only for TENANT_ADMIN, CENTRAL_ADMIN, or CANDIDATE_ADMIN)
router.put('/branding', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles to update branding
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can update branding settings.'));
      return;
    }

    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { displayName, organizationName, logoUrl, primaryColor, secondaryColor, faviconUrl, partyName, partySymbolUrl, customDomain } = req.body;

    // If customDomain is being set, validate it's not already used by another tenant
    if (customDomain !== undefined && customDomain !== null && customDomain !== '') {
      const existingWithDomain = await coreDb.tenant.findFirst({
        where: {
          customDomain,
          id: { not: tenant.id },
        },
      });
      if (existingWithDomain) {
        res.status(400).json(errorResponse('E2006', 'This custom domain is already in use by another tenant'));
        return;
      }
    }

    const updatedTenant = await coreDb.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(organizationName !== undefined && { organizationName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(partyName !== undefined && { partyName }),
        ...(partySymbolUrl !== undefined && { partySymbolUrl }),
        ...(customDomain !== undefined && { customDomain: customDomain || null }),
      },
    });

    res.json(successResponse({
      message: 'Branding settings updated successfully',
      id: updatedTenant.id,
      name: updatedTenant.name,
      displayName: updatedTenant.displayName,
      organizationName: updatedTenant.organizationName,
      logoUrl: updatedTenant.logoUrl,
      primaryColor: updatedTenant.primaryColor,
      secondaryColor: updatedTenant.secondaryColor,
      faviconUrl: updatedTenant.faviconUrl,
      partyName: updatedTenant.partyName,
      partySymbolUrl: updatedTenant.partySymbolUrl,
      tenantUrl: updatedTenant.tenantUrl,
      customDomain: updatedTenant.customDomain,
    }));
  } catch (error) {
    console.error('Update tenant branding error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get tenant database settings (for tenant admins to view/configure their database)
router.get('/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow TENANT_ADMIN or higher to access database settings
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only tenant administrators can view database settings.'));
      return;
    }

    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Return database settings (hide sensitive info like passwords)
    res.json(successResponse({
      databaseType: tenant.databaseType,
      databaseStatus: tenant.databaseStatus,
      databaseHost: tenant.databaseHost,
      databaseName: tenant.databaseName,
      databaseUser: tenant.databaseUser,
      databasePort: tenant.databasePort,
      databaseSSL: tenant.databaseSSL,
      canTenantEditDb: tenant.canTenantEditDb,
      databaseManagedBy: tenant.databaseManagedBy,
      databaseLastCheckedAt: tenant.databaseLastCheckedAt,
      databaseLastError: tenant.databaseLastError,
      databaseMigrationVersion: tenant.databaseMigrationVersion,
      // Don't expose password, only indicate if it's set
      hasPassword: !!tenant.databasePassword,
    }));
  } catch (error) {
    console.error('Get database settings error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update tenant database settings (only if canTenantEditDb is true)
router.put('/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow TENANT_ADMIN or higher
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only tenant administrators can update database settings.'));
      return;
    }

    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Check if tenant can edit database settings
    if (!tenant.canTenantEditDb) {
      res.status(403).json(errorResponse('E4002', 'Database settings are managed by the Super Admin. Contact support to make changes.'));
      return;
    }

    // Only allow certain database types for tenant self-configuration
    const { databaseHost, databaseName, databaseUser, databasePassword, databasePort, databaseSSL } = req.body;

    // Update tenant database settings
    const updatedTenant = await coreDb.tenant.update({
      where: { id: tenant.id },
      data: {
        databaseType: 'DEDICATED_SELF',
        databaseStatus: 'PENDING_SETUP',
        databaseHost: databaseHost || tenant.databaseHost,
        databaseName: databaseName || tenant.databaseName,
        databaseUser: databaseUser || tenant.databaseUser,
        databasePassword: databasePassword || tenant.databasePassword,
        databasePort: databasePort || tenant.databasePort || 5432,
        databaseSSL: databaseSSL !== undefined ? databaseSSL : tenant.databaseSSL,
        databaseManagedBy: 'tenant',
      },
    });

    res.json(successResponse({
      message: 'Database settings updated successfully',
      databaseType: updatedTenant.databaseType,
      databaseStatus: updatedTenant.databaseStatus,
      databaseHost: updatedTenant.databaseHost,
      databaseName: updatedTenant.databaseName,
      databaseUser: updatedTenant.databaseUser,
      databasePort: updatedTenant.databasePort,
      databaseSSL: updatedTenant.databaseSSL,
      canTenantEditDb: updatedTenant.canTenantEditDb,
      databaseManagedBy: updatedTenant.databaseManagedBy,
    }));
  } catch (error) {
    console.error('Update database settings error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Test database connection
router.post('/database/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow TENANT_ADMIN or higher
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Check if tenant can edit database settings
    if (!tenant.canTenantEditDb) {
      res.status(403).json(errorResponse('E4002', 'Database settings are managed by the Super Admin'));
      return;
    }

    // Get database connection params from request or from stored settings
    const {
      databaseHost = tenant.databaseHost,
      databaseName = tenant.databaseName,
      databaseUser = tenant.databaseUser,
      databasePassword = tenant.databasePassword,
      databasePort = tenant.databasePort || 5432,
      databaseSSL = tenant.databaseSSL,
    } = req.body;

    if (!databaseHost || !databaseName || !databaseUser) {
      res.status(400).json(errorResponse('E2001', 'Database host, name, and user are required'));
      return;
    }

    // Test connection
    const client = new Client({
      host: databaseHost,
      port: databasePort,
      database: databaseName,
      user: databaseUser,
      password: databasePassword,
      ssl: databaseSSL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query('SELECT NOW() as time, current_database() as database');
      await client.end();

      // Update tenant status
      await coreDb.tenant.update({
        where: { id: tenant.id },
        data: {
          databaseStatus: 'CONNECTED',
          databaseLastCheckedAt: new Date(),
          databaseLastError: null,
        },
      });

      res.json(successResponse({
        success: true,
        message: 'Database connection successful',
        serverTime: result.rows[0].time,
        database: result.rows[0].database,
      }));
    } catch (connectionError: any) {
      await coreDb.tenant.update({
        where: { id: tenant.id },
        data: {
          databaseStatus: 'CONNECTION_FAILED',
          databaseLastCheckedAt: new Date(),
          databaseLastError: connectionError.message,
        },
      });

      res.status(400).json(errorResponse('E5002', `Database connection failed: ${connectionError.message}`));
    }
  } catch (error) {
    console.error('Test database connection error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantRoutes };
