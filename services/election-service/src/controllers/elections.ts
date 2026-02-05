import { Request, Response } from 'express';
import { getTenantDb, coreDb } from '../utils/tenantDb.js';
import {
  createElectionSchema,
  updateElectionSchema,
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
} from '@electioncaffe/shared';

export class ElectionController {
  async getElections(req: Request, res: Response): Promise<void> {
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

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { nameLocal: { contains: search, mode: 'insensitive' } },
          { constituency: { contains: search, mode: 'insensitive' } },
          { candidateName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Filter by status if provided
      if (req.query.status) {
        where.status = req.query.status;
      }

      const [elections, total] = await Promise.all([
        (tenantDb as any).election.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
          include: {
            candidateParty: {
              select: {
                id: true,
                partyName: true,
                partyShortName: true,
                partyColor: true,
                partyImageUrl: true,
              },
            },
            _count: {
              select: {
                voters: true,
                parts: true,
                cadres: true,
              },
            },
          },
        }),
        (tenantDb as any).election.count({ where }),
      ]);

      res.json(successResponse(elections, createPaginationMeta(total, page, limit)));
    } catch (error) {
      console.error('Get elections error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getElectionById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const election = await (tenantDb as any).election.findFirst({
        where: { id },
        include: {
          candidateParty: true,
          _count: {
            select: {
              voters: true,
              parts: true,
              sections: true,
              booths: true,
              cadres: true,
              families: true,
              religions: true,
              castes: true,
              languages: true,
              schemes: true,
              surveys: true,
            },
          },
        },
      });

      if (!election) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      res.json(successResponse(election));
    } catch (error) {
      console.error('Get election by ID error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const tenantDb = await getTenantDb(req);
      const validation = createElectionSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      // Check tenant election limit from core database
      const tenant = await coreDb.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      const electionCount = await (tenantDb as any).election.count();
      if (electionCount >= tenant.maxElections) {
        res.status(400).json(errorResponse('E4003', `Maximum election limit (${tenant.maxElections}) reached`));
        return;
      }

      // Extract partyId if provided, handle properly
      const { partyId, ...electionData } = validation.data as any;

      const election = await (tenantDb as any).election.create({
        data: {
          ...electionData,
          tenantId,
          ...(partyId && { partyId }),
        },
      });

      // Create default master data for the election
      await this.createDefaultMasterData(tenantDb, election.id);

      res.status(201).json(successResponse(election));
    } catch (error) {
      console.error('Create election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingElection = await (tenantDb as any).election.findFirst({
        where: { id },
      });

      if (!existingElection) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      if (existingElection.isLocked) {
        res.status(400).json(errorResponse('E4001', 'Election is locked and cannot be modified'));
        return;
      }

      const validation = updateElectionSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const election = await (tenantDb as any).election.update({
        where: { id },
        data: validation.data,
      });

      res.json(successResponse(election));
    } catch (error) {
      console.error('Update election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingElection = await (tenantDb as any).election.findFirst({
        where: { id },
      });

      if (!existingElection) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      if (existingElection.isLocked) {
        res.status(400).json(errorResponse('E4001', 'Election is locked and cannot be deleted'));
        return;
      }

      await (tenantDb as any).election.delete({ where: { id } });

      res.json(successResponse({ message: 'Election deleted successfully' }));
    } catch (error) {
      console.error('Delete election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async lockElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingElection = await (tenantDb as any).election.findFirst({
        where: { id },
      });

      if (!existingElection) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      const election = await (tenantDb as any).election.update({
        where: { id },
        data: { isLocked: true },
      });

      res.json(successResponse(election));
    } catch (error) {
      console.error('Lock election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async unlockElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingElection = await (tenantDb as any).election.findFirst({
        where: { id },
      });

      if (!existingElection) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      const election = await (tenantDb as any).election.update({
        where: { id },
        data: { isLocked: false },
      });

      res.json(successResponse(election));
    } catch (error) {
      console.error('Unlock election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async duplicateElection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { name } = req.body;

      const existingElection = await (tenantDb as any).election.findFirst({
        where: { id },
        include: {
          religions: true,
          casteCategories: true,
          castes: true,
          subCastes: true,
          languages: true,
          voterCategories: true,
        },
      });

      if (!existingElection) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      // Create new election
      const newElection = await (tenantDb as any).election.create({
        data: {
          tenantId,
          name: name || `${existingElection.name} (Copy)`,
          nameLocal: existingElection.nameLocal,
          electionType: existingElection.electionType,
          state: existingElection.state,
          constituency: existingElection.constituency,
          district: existingElection.district,
          status: 'DRAFT',
        },
      });

      // Duplicate master data
      await this.duplicateMasterData(tenantDb, existingElection, newElection.id);

      res.status(201).json(successResponse(newElection));
    } catch (error) {
      console.error('Duplicate election error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getElectionStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const election = await (tenantDb as any).election.findFirst({
        where: { id },
      });

      if (!election) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      const [
        totalVoters,
        maleVoters,
        femaleVoters,
        otherVoters,
        totalParts,
        totalSections,
        totalFamilies,
        totalCadres,
        votersWithMobile,
        votersWithDOB,
      ] = await Promise.all([
        (tenantDb as any).voter.count({ where: { electionId: id } }),
        (tenantDb as any).voter.count({ where: { electionId: id, gender: 'MALE' } }),
        (tenantDb as any).voter.count({ where: { electionId: id, gender: 'FEMALE' } }),
        (tenantDb as any).voter.count({ where: { electionId: id, gender: 'OTHER' } }),
        (tenantDb as any).part.count({ where: { electionId: id } }),
        (tenantDb as any).section.count({ where: { electionId: id } }),
        (tenantDb as any).family.count({ where: { electionId: id } }),
        (tenantDb as any).cadre.count({ where: { electionId: id } }),
        (tenantDb as any).voter.count({ where: { electionId: id, mobile: { not: null } } }),
        (tenantDb as any).voter.count({ where: { electionId: id, dateOfBirth: { not: null } } }),
      ]);

      const stats = {
        totalVoters,
        maleVoters,
        femaleVoters,
        otherVoters,
        totalParts,
        totalSections,
        totalFamilies,
        totalCadres,
        votersWithMobile,
        votersWithDOB,
        mobilePercentage: totalVoters > 0 ? ((votersWithMobile / totalVoters) * 100).toFixed(1) : 0,
        dobPercentage: totalVoters > 0 ? ((votersWithDOB / totalVoters) * 100).toFixed(1) : 0,
      };

      res.json(successResponse(stats));
    } catch (error) {
      console.error('Get election stats error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  private async createDefaultMasterData(tenantDb: any, electionId: string): Promise<void> {
    // Create default religions
    const religions = [
      { religionName: 'Hindu', religionNameLocal: 'இந்து', religionColor: '#FF9933', displayOrder: 1 },
      { religionName: 'Muslim', religionNameLocal: 'இஸ்லாம்', religionColor: '#006400', displayOrder: 2 },
      { religionName: 'Christian', religionNameLocal: 'கிறிஸ்தவம்', religionColor: '#800080', displayOrder: 3 },
      { religionName: 'Jainism', religionNameLocal: 'சமணம்', religionColor: '#FFD700', displayOrder: 4 },
      { religionName: 'Sikhism', religionNameLocal: 'சீக்கியம்', religionColor: '#0000FF', displayOrder: 5 },
      { religionName: 'Buddhism', religionNameLocal: 'பௌத்தம்', religionColor: '#808000', displayOrder: 6 },
    ];

    await tenantDb.religion.createMany({
      data: religions.map((r: any) => ({ electionId, ...r })),
    });

    // Create default caste categories
    const casteCategories = [
      { categoryName: 'OC', categoryFullName: 'Other Caste (General/Forward)', displayOrder: 1 },
      { categoryName: 'BC', categoryFullName: 'Backward Class', displayOrder: 2 },
      { categoryName: 'MBC', categoryFullName: 'Most Backward Class', displayOrder: 3 },
      { categoryName: 'SC', categoryFullName: 'Scheduled Caste', displayOrder: 4 },
      { categoryName: 'ST', categoryFullName: 'Scheduled Tribe', displayOrder: 5 },
    ];

    await tenantDb.casteCategory.createMany({
      data: casteCategories.map((c: any) => ({ electionId, ...c })),
    });

    // Create default voter categories
    const voterCategories = [
      { categoryName: 'Available', categoryNameLocal: 'இருக்கிறார்', categoryColor: '#52C41A', iconType: 'check', isSystem: true, displayOrder: 1 },
      { categoryName: 'Shifted', categoryNameLocal: 'இடமாற்றம்', categoryColor: '#1890FF', iconType: 'arrow-up', isSystem: true, displayOrder: 2 },
      { categoryName: 'Double Entry', categoryNameLocal: 'இரட்டை பதிவு', categoryColor: '#FF4D4F', iconType: 'close', isSystem: true, displayOrder: 3 },
      { categoryName: 'Outstation', categoryNameLocal: 'வெளியூர்', categoryColor: '#FAAD14', iconType: 'swap', isSystem: true, displayOrder: 4 },
      { categoryName: 'Not in Home', categoryNameLocal: 'வீட்டில் இல்லை', categoryColor: '#8C8C8C', iconType: 'close', isSystem: true, displayOrder: 5 },
    ];

    await tenantDb.voterCategory.createMany({
      data: voterCategories.map((v: any) => ({ electionId, ...v })),
    });

    // Create default languages
    const languages = [
      { languageName: 'Tamil', languageNameLocal: 'தமிழ்', languageCode: 'ta', script: 'Tamil', displayOrder: 1 },
      { languageName: 'Telugu', languageNameLocal: 'తెలుగు', languageCode: 'te', script: 'Telugu', displayOrder: 2 },
      { languageName: 'Kannada', languageNameLocal: 'ಕನ್ನಡ', languageCode: 'kn', script: 'Kannada', displayOrder: 3 },
      { languageName: 'Malayalam', languageNameLocal: 'മലയാളം', languageCode: 'ml', script: 'Malayalam', displayOrder: 4 },
      { languageName: 'Hindi', languageNameLocal: 'हिन्दी', languageCode: 'hi', script: 'Devanagari', displayOrder: 5 },
    ];

    await tenantDb.language.createMany({
      data: languages.map((l: any) => ({ electionId, ...l })),
    });
  }

  private async duplicateMasterData(tenantDb: any, source: any, targetElectionId: string): Promise<void> {
    // Duplicate religions
    if (source.religions && source.religions.length > 0) {
      await tenantDb.religion.createMany({
        data: source.religions.map((r: any) => ({
          electionId: targetElectionId,
          religionName: r.religionName,
          religionNameLocal: r.religionNameLocal,
          religionColor: r.religionColor,
          religionImageUrl: r.religionImageUrl,
          displayOrder: r.displayOrder,
        })),
      });
    }

    // Duplicate caste categories
    if (source.casteCategories && source.casteCategories.length > 0) {
      await tenantDb.casteCategory.createMany({
        data: source.casteCategories.map((c: any) => ({
          electionId: targetElectionId,
          categoryName: c.categoryName,
          categoryFullName: c.categoryFullName,
          reservationPercent: c.reservationPercent,
          displayOrder: c.displayOrder,
        })),
      });
    }

    // Duplicate voter categories
    if (source.voterCategories && source.voterCategories.length > 0) {
      await tenantDb.voterCategory.createMany({
        data: source.voterCategories.map((v: any) => ({
          electionId: targetElectionId,
          categoryName: v.categoryName,
          categoryNameLocal: v.categoryNameLocal,
          categoryColor: v.categoryColor,
          iconType: v.iconType,
          isSystem: v.isSystem,
          displayOrder: v.displayOrder,
        })),
      });
    }

    // Duplicate languages
    if (source.languages && source.languages.length > 0) {
      await tenantDb.language.createMany({
        data: source.languages.map((l: any) => ({
          electionId: targetElectionId,
          languageName: l.languageName,
          languageNameLocal: l.languageNameLocal,
          languageCode: l.languageCode,
          script: l.script,
          writingDirection: l.writingDirection,
          displayOrder: l.displayOrder,
        })),
      });
    }
  }
}
