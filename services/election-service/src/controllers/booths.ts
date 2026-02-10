import { Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
  createLogger,
} from '@electioncaffe/shared';
import { z } from 'zod';

const logger = createLogger('election-service');

const createBoothSchema = z.object({
  electionId: z.string().uuid(),
  partId: z.string().uuid().optional(),
  boothNumber: z.string().min(1).max(50),
  boothName: z.string().max(300).optional(),
  boothNameLocal: z.string().max(300).optional(),
  address: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  totalVoters: z.coerce.number().int().min(0).default(0),
  maleVoters: z.coerce.number().int().min(0).default(0),
  femaleVoters: z.coerce.number().int().min(0).default(0),
  otherVoters: z.coerce.number().int().min(0).default(0),
  vulnerabilityStatus: z.enum(['NONE', 'SENSITIVE', 'CRITICAL']).default('NONE'),
  isActive: z.boolean().default(true),
});

const updateBoothSchema = createBoothSchema.partial().omit({ electionId: true });

export class BoothController {
  async getBooths(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { page, limit, search, sort, order } = validation.data;
      const skip = calculateSkip(page, limit);

      const where: any = {};

      if (req.query.electionId) {
        where.electionId = req.query.electionId;
      }

      if (req.query.partId) {
        where.partId = req.query.partId;
      }

      if (search) {
        where.OR = [
          { boothNumber: { contains: search, mode: 'insensitive' } },
          { boothName: { contains: search, mode: 'insensitive' } },
          { boothNameLocal: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [booths, total] = await Promise.all([
        (tenantDb as any).booth.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { boothNumber: 'asc' },
          include: {
            part: {
              select: {
                id: true,
                partNumber: true,
                boothName: true,
              },
            },
          },
        }),
        (tenantDb as any).booth.count({ where }),
      ]);

      res.json(successResponse(booths, createPaginationMeta(total, page, limit)));
    } catch (error) {
      logger.error({ err: error }, 'Get booths error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getBoothById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const booth = await (tenantDb as any).booth.findFirst({
        where: { id },
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              boothName: true,
            },
          },
          election: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              voters: true,
              boothAgents: true,
            },
          },
        },
      });

      if (!booth) {
        res.status(404).json(errorResponse('E3001', 'Booth not found'));
        return;
      }

      res.json(successResponse(booth));
    } catch (error) {
      logger.error({ err: error }, 'Get booth by ID error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createBooth(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const validation = createBoothSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const booth = await (tenantDb as any).booth.create({
        data: validation.data,
      });

      res.status(201).json(successResponse(booth));
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json(errorResponse('E4002', 'Booth number already exists for this election'));
        return;
      }
      logger.error({ err: error }, 'Create booth error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateBooth(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existing = await (tenantDb as any).booth.findFirst({ where: { id } });
      if (!existing) {
        res.status(404).json(errorResponse('E3001', 'Booth not found'));
        return;
      }

      const validation = updateBoothSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const booth = await (tenantDb as any).booth.update({
        where: { id },
        data: validation.data,
      });

      res.json(successResponse(booth));
    } catch (error) {
      logger.error({ err: error }, 'Update booth error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteBooth(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existing = await (tenantDb as any).booth.findFirst({ where: { id } });
      if (!existing) {
        res.status(404).json(errorResponse('E3001', 'Booth not found'));
        return;
      }

      await (tenantDb as any).booth.delete({ where: { id } });

      res.json(successResponse({ message: 'Booth deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete booth error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
