import { Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  createPartSchema,
  updatePartSchema,
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
  toCSV,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('election-service');

export class PartController {
  async getParts(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { electionId } = req.query;

      if (!electionId) {
        res.status(400).json(errorResponse('E2003', 'Election ID is required'));
        return;
      }

      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { page, limit, search, sort, order } = validation.data;
      const skip = calculateSkip(page, limit);

      const where: any = { electionId };

      if (search) {
        where.OR = [
          { boothName: { contains: search, mode: 'insensitive' } },
          { boothNameLocal: { contains: search, mode: 'insensitive' } },
          { partNumber: isNaN(parseInt(search)) ? undefined : parseInt(search) },
          { pincode: { contains: search } },
        ].filter(Boolean);
      }

      const [parts, total] = await Promise.all([
        (tenantDb as any).part.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { partNumber: 'asc' },
          include: {
            _count: {
              select: {
                voters: true,
                sections: true,
              },
            },
          },
        }),
        (tenantDb as any).part.count({ where }),
      ]);

      res.json(successResponse(parts, createPaginationMeta(total, page, limit)));
    } catch (error) {
      logger.error({ err: error }, 'Get parts error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getPartsForMap(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { electionId } = req.query;

      if (!electionId) {
        res.status(400).json(errorResponse('E2003', 'Election ID is required'));
        return;
      }

      const parts = await (tenantDb as any).part.findMany({
        where: {
          electionId: electionId as string,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          partNumber: true,
          boothName: true,
          boothNameLocal: true,
          latitude: true,
          longitude: true,
          totalVoters: true,
          isVulnerable: true,
          vulnerability: true,
          address: true,
        },
      });

      res.json(successResponse(parts));
    } catch (error) {
      logger.error({ err: error }, 'Get parts for map error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getPartById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const part = await (tenantDb as any).part.findUnique({
        where: { id },
        include: {
          election: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          sections: {
            orderBy: { sectionNumber: 'asc' },
          },
          _count: {
            select: {
              voters: true,
              sections: true,
              cadres: true,
            },
          },
        },
      });

      if (!part) {
        res.status(404).json(errorResponse('E3001', 'Part not found'));
        return;
      }

      res.json(successResponse(part));
    } catch (error) {
      logger.error({ err: error }, 'Get part by ID error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createPart(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { electionId } = req.query;

      if (!electionId) {
        res.status(400).json(errorResponse('E2003', 'Election ID is required'));
        return;
      }

      const validation = createPartSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      // Check if part number already exists
      const existingPart = await (tenantDb as any).part.findFirst({
        where: {
          electionId: electionId as string,
          partNumber: validation.data.partNumber,
        },
      });

      if (existingPart) {
        res.status(409).json(errorResponse('E3002', `Part number ${validation.data.partNumber} already exists`));
        return;
      }

      const part = await (tenantDb as any).part.create({
        data: {
          electionId: electionId as string,
          ...validation.data,
        },
      });

      // Update election stats
      await this.updateElectionPartCount(tenantDb, electionId as string);

      res.status(201).json(successResponse(part));
    } catch (error) {
      logger.error({ err: error }, 'Create part error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async bulkCreateParts(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { electionId } = req.query;

      if (!electionId) {
        res.status(400).json(errorResponse('E2003', 'Election ID is required'));
        return;
      }

      const { parts: partsData } = req.body;

      if (!Array.isArray(partsData) || partsData.length === 0) {
        res.status(400).json(errorResponse('E2003', 'Parts data array is required'));
        return;
      }

      const results = {
        total: partsData.length,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const [index, partData] of partsData.entries()) {
        try {
          const validation = createPartSchema.safeParse(partData);

          if (!validation.success) {
            results.failed++;
            results.errors.push({
              row: index + 1,
              field: validation.error.errors[0]?.path.join('.'),
              value: validation.error.errors[0]?.message,
              error: 'Validation error',
            });
            continue;
          }

          // Upsert - create or update
          await (tenantDb as any).part.upsert({
            where: {
              electionId_partNumber: {
                electionId: electionId as string,
                partNumber: validation.data.partNumber,
              },
            },
            update: validation.data,
            create: {
              electionId: electionId as string,
              ...validation.data,
            },
          });

          results.created++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: index + 1,
            error: error.message,
          });
        }
      }

      // Update election stats
      await this.updateElectionPartCount(tenantDb, electionId as string);

      res.json(successResponse(results));
    } catch (error) {
      logger.error({ err: error }, 'Bulk create parts error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updatePart(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingPart = await (tenantDb as any).part.findUnique({
        where: { id },
        include: { election: true },
      });

      if (!existingPart) {
        res.status(404).json(errorResponse('E3001', 'Part not found'));
        return;
      }

      if (existingPart.election.isLocked) {
        res.status(400).json(errorResponse('E4001', 'Election is locked'));
        return;
      }

      const validation = updatePartSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const part = await (tenantDb as any).part.update({
        where: { id },
        data: validation.data,
      });

      res.json(successResponse(part));
    } catch (error) {
      logger.error({ err: error }, 'Update part error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deletePart(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingPart = await (tenantDb as any).part.findUnique({
        where: { id },
        include: {
          election: true,
          _count: { select: { voters: true } },
        },
      });

      if (!existingPart) {
        res.status(404).json(errorResponse('E3001', 'Part not found'));
        return;
      }

      if (existingPart.election.isLocked) {
        res.status(400).json(errorResponse('E4001', 'Election is locked'));
        return;
      }

      if (existingPart._count.voters > 0) {
        res.status(400).json(errorResponse('E4004', 'Cannot delete part with voters. Delete voters first.'));
        return;
      }

      await (tenantDb as any).part.delete({ where: { id } });

      // Update election stats
      await this.updateElectionPartCount(tenantDb, existingPart.electionId);

      res.json(successResponse({ message: 'Part deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete part error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getVulnerability(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const part = await (tenantDb as any).part.findUnique({
        where: { id },
        select: {
          id: true,
          partNumber: true,
          boothName: true,
          isVulnerable: true,
          vulnerability: true,
          vulnerabilityNotes: true,
        },
      });

      if (!part) {
        res.status(404).json(errorResponse('E3001', 'Part not found'));
        return;
      }

      res.json(successResponse(part));
    } catch (error) {
      logger.error({ err: error }, 'Get vulnerability error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateVulnerability(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { vulnerability, vulnerabilityNotes } = req.body;

      const validTypes = ['NOT_ASSIGNED', 'CRITICAL', 'COMMUNAL', 'POLITICAL', 'NAXAL', 'BORDER', 'REMOTE'];

      if (vulnerability && !validTypes.includes(vulnerability)) {
        res.status(400).json(errorResponse('E2001', 'Invalid vulnerability type'));
        return;
      }

      const part = await (tenantDb as any).part.update({
        where: { id },
        data: {
          vulnerability: vulnerability || 'NOT_ASSIGNED',
          isVulnerable: vulnerability && vulnerability !== 'NOT_ASSIGNED',
          vulnerabilityNotes,
        },
        select: {
          id: true,
          partNumber: true,
          boothName: true,
          isVulnerable: true,
          vulnerability: true,
          vulnerabilityNotes: true,
        },
      });

      res.json(successResponse(part));
    } catch (error) {
      logger.error({ err: error }, 'Update vulnerability error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async downloadTemplate(_req: Request, res: Response): Promise<void> {
    try {
      const template = [
        {
          part_number: '1',
          booth_name: 'GOVT.HIGH SCHOOL, EXAMPLE',
          booth_name_local: 'அரசு மேல்நிலைப்பள்ளி, எடுத்துக்காட்டு',
          part_type: 'URBAN',
          address: '123 Main Street',
          landmark: 'Near Bus Stand',
          pincode: '600001',
          latitude: '13.0827',
          longitude: '80.2707',
          school_name: 'Example School',
          building_type: 'school',
        },
      ];

      const csv = toCSV(template);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=parts_template.csv');
      res.send(csv);
    } catch (error) {
      logger.error({ err: error }, 'Download template error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  private async updateElectionPartCount(tenantDb: any, electionId: string): Promise<void> {
    const partCount = await tenantDb.part.count({ where: { electionId } });
    await tenantDb.election.update({
      where: { id: electionId },
      data: { totalParts: partCount, totalBooths: partCount },
    });
  }
}
