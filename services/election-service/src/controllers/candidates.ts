import { Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  paginationSchema,
  createPaginationMeta,
  calculateSkip,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('election-service');

export class CandidateController {
  // ==================== CANDIDATES ====================

  async getCandidates(req: Request, res: Response): Promise<void> {
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

      // Filter by electionId if provided
      if (req.query.electionId) {
        where.electionId = req.query.electionId;
      }

      // Filter by isOurCandidate if provided
      if (req.query.isOurCandidate !== undefined) {
        where.isOurCandidate = req.query.isOurCandidate === 'true';
      }

      // Filter by nominationStatus if provided
      if (req.query.nominationStatus) {
        where.nominationStatus = req.query.nominationStatus;
      }

      // Filter by partyId if provided
      if (req.query.partyId) {
        where.partyId = req.query.partyId;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { nameLocal: { contains: search, mode: 'insensitive' } },
          { constituency: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [candidates, total] = await Promise.all([
        (tenantDb as any).candidate.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
          include: {
            party: {
              select: {
                id: true,
                partyName: true,
                partyShortName: true,
                partyColor: true,
                partyImageUrl: true,
              },
            },
            election: {
              select: {
                id: true,
                name: true,
                constituency: true,
                electionType: true,
              },
            },
            _count: {
              select: {
                documents: true,
                socialMedia: true,
                battleCards: true,
              },
            },
          },
        }),
        (tenantDb as any).candidate.count({ where }),
      ]);

      res.json(successResponse(candidates, createPaginationMeta(total, page, limit)));
    } catch (error) {
      logger.error({ err: error }, 'Get candidates error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getCandidateById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
        include: {
          party: true,
          election: {
            select: {
              id: true,
              name: true,
              constituency: true,
              electionType: true,
              state: true,
              district: true,
            },
          },
          documents: {
            orderBy: { uploadedAt: 'desc' },
          },
          socialMedia: {
            include: {
              stats: {
                orderBy: { recordedAt: 'desc' },
                take: 30, // Last 30 stat records
              },
            },
          },
          battleCards: {
            include: {
              opponent: {
                select: {
                  id: true,
                  name: true,
                  photoUrl: true,
                  party: {
                    select: {
                      partyName: true,
                      partyShortName: true,
                      partyColor: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      res.json(successResponse(candidate));
    } catch (error) {
      logger.error({ err: error }, 'Get candidate by ID error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createCandidate(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const data = req.body;

      if (!data.electionId || !data.name) {
        res.status(400).json(errorResponse('E2001', 'Election ID and name are required'));
        return;
      }

      // Verify election exists
      const election = await (tenantDb as any).election.findFirst({
        where: { id: data.electionId },
      });

      if (!election) {
        res.status(404).json(errorResponse('E3001', 'Election not found'));
        return;
      }

      const candidate = await (tenantDb as any).candidate.create({
        data: {
          electionId: data.electionId,
          name: data.name,
          nameLocal: data.nameLocal,
          photoUrl: data.photoUrl,
          partyId: data.partyId,
          nominationNumber: data.nominationNumber,
          isOurCandidate: data.isOurCandidate || false,
          age: data.age,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender,
          education: data.education,
          profession: data.profession,
          experience: data.experience,
          biography: data.biography,
          achievements: data.achievements || [],
          politicalCareer: data.politicalCareer,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile,
          email: data.email,
          address: data.address,
          constituency: data.constituency,
          district: data.district,
          state: data.state,
          nominationStatus: data.nominationStatus,
          nominationDate: data.nominationDate ? new Date(data.nominationDate) : null,
        },
        include: {
          party: true,
          election: {
            select: {
              id: true,
              name: true,
              constituency: true,
            },
          },
        },
      });

      res.status(201).json(successResponse(candidate));
    } catch (error) {
      logger.error({ err: error }, 'Create candidate error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateCandidate(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const data = req.body;

      const existingCandidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!existingCandidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      const candidate = await (tenantDb as any).candidate.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.nameLocal !== undefined && { nameLocal: data.nameLocal }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
          ...(data.partyId !== undefined && { partyId: data.partyId }),
          ...(data.nominationNumber !== undefined && { nominationNumber: data.nominationNumber }),
          ...(data.isOurCandidate !== undefined && { isOurCandidate: data.isOurCandidate }),
          ...(data.age !== undefined && { age: data.age }),
          ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
          ...(data.gender !== undefined && { gender: data.gender }),
          ...(data.education !== undefined && { education: data.education }),
          ...(data.profession !== undefined && { profession: data.profession }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.biography !== undefined && { biography: data.biography }),
          ...(data.achievements !== undefined && { achievements: data.achievements }),
          ...(data.politicalCareer !== undefined && { politicalCareer: data.politicalCareer }),
          ...(data.mobile !== undefined && { mobile: data.mobile }),
          ...(data.alternateMobile !== undefined && { alternateMobile: data.alternateMobile }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.constituency !== undefined && { constituency: data.constituency }),
          ...(data.district !== undefined && { district: data.district }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.nominationStatus !== undefined && { nominationStatus: data.nominationStatus }),
          ...(data.nominationDate !== undefined && { nominationDate: data.nominationDate ? new Date(data.nominationDate) : null }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        include: {
          party: true,
          election: {
            select: {
              id: true,
              name: true,
              constituency: true,
            },
          },
        },
      });

      res.json(successResponse(candidate));
    } catch (error) {
      logger.error({ err: error }, 'Update candidate error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteCandidate(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingCandidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!existingCandidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      await (tenantDb as any).candidate.delete({ where: { id } });

      res.json(successResponse({ message: 'Candidate deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete candidate error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // ==================== DOCUMENTS ====================

  async getCandidateDocuments(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      const documents = await (tenantDb as any).candidateDocument.findMany({
        where: { candidateId: id },
        orderBy: { uploadedAt: 'desc' },
      });

      res.json(successResponse(documents));
    } catch (error) {
      logger.error({ err: error }, 'Get candidate documents error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async addCandidateDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const data = req.body;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      if (!data.documentName || !data.documentType || !data.fileUrl) {
        res.status(400).json(errorResponse('E2001', 'Document name, type, and URL are required'));
        return;
      }

      const document = await (tenantDb as any).candidateDocument.create({
        data: {
          candidateId: id,
          documentName: data.documentName,
          documentType: data.documentType,
          storageProvider: data.storageProvider || 'LOCAL',
          fileUrl: data.fileUrl,
          fileId: data.fileId,
          folderId: data.folderId,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          description: data.description,
          isPublic: data.isPublic || false,
          uploadedBy: data.uploadedBy,
        },
      });

      res.status(201).json(successResponse(document));
    } catch (error) {
      logger.error({ err: error }, 'Add candidate document error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteCandidateDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, docId } = req.params;

      const document = await (tenantDb as any).candidateDocument.findFirst({
        where: { id: docId, candidateId: id },
      });

      if (!document) {
        res.status(404).json(errorResponse('E3001', 'Document not found'));
        return;
      }

      await (tenantDb as any).candidateDocument.delete({ where: { id: docId } });

      res.json(successResponse({ message: 'Document deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete candidate document error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // ==================== SOCIAL MEDIA ====================

  async getCandidateSocialMedia(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      const socialMedia = await (tenantDb as any).candidateSocialMedia.findMany({
        where: { candidateId: id },
        include: {
          stats: {
            orderBy: { recordedAt: 'desc' },
            take: 30,
          },
        },
      });

      res.json(successResponse(socialMedia));
    } catch (error) {
      logger.error({ err: error }, 'Get candidate social media error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async addCandidateSocialMedia(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const data = req.body;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      if (!data.platform || !data.profileUrl) {
        res.status(400).json(errorResponse('E2001', 'Platform and profile URL are required'));
        return;
      }

      // Check if platform already exists for this candidate
      const existing = await (tenantDb as any).candidateSocialMedia.findFirst({
        where: { candidateId: id, platform: data.platform },
      });

      if (existing) {
        res.status(400).json(errorResponse('E4001', 'Social media profile for this platform already exists'));
        return;
      }

      const socialMedia = await (tenantDb as any).candidateSocialMedia.create({
        data: {
          candidateId: id,
          platform: data.platform,
          profileUrl: data.profileUrl,
          username: data.username,
          displayName: data.displayName,
          followers: data.followers || 0,
          following: data.following || 0,
          posts: data.posts || 0,
          subscribers: data.subscribers || 0,
          likes: data.likes || 0,
          views: data.views || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          engagementRate: data.engagementRate,
          verifiedStatus: data.verifiedStatus || false,
        },
      });

      res.status(201).json(successResponse(socialMedia));
    } catch (error) {
      logger.error({ err: error }, 'Add candidate social media error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateCandidateSocialMedia(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, smId } = req.params;
      const data = req.body;

      const socialMedia = await (tenantDb as any).candidateSocialMedia.findFirst({
        where: { id: smId, candidateId: id },
      });

      if (!socialMedia) {
        res.status(404).json(errorResponse('E3001', 'Social media profile not found'));
        return;
      }

      const updated = await (tenantDb as any).candidateSocialMedia.update({
        where: { id: smId },
        data: {
          ...(data.profileUrl && { profileUrl: data.profileUrl }),
          ...(data.username !== undefined && { username: data.username }),
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.followers !== undefined && { followers: data.followers }),
          ...(data.following !== undefined && { following: data.following }),
          ...(data.posts !== undefined && { posts: data.posts }),
          ...(data.engagementRate !== undefined && { engagementRate: data.engagementRate }),
          ...(data.verifiedStatus !== undefined && { verifiedStatus: data.verifiedStatus }),
          lastUpdated: new Date(),
        },
      });

      // Optionally create a stats record for historical tracking
      if (data.followers !== undefined || data.posts !== undefined) {
        await (tenantDb as any).socialMediaStats.create({
          data: {
            socialMediaId: smId,
            followers: data.followers || socialMedia.followers,
            following: data.following || socialMedia.following,
            posts: data.posts || socialMedia.posts,
            likes: data.likes || 0,
            comments: data.comments || 0,
            shares: data.shares || 0,
            views: data.views || 0,
            engagementRate: data.engagementRate || socialMedia.engagementRate,
            reachEstimate: data.reachEstimate,
            metadata: data.metadata || {},
          },
        });
      }

      res.json(successResponse(updated));
    } catch (error) {
      logger.error({ err: error }, 'Update candidate social media error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteCandidateSocialMedia(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, smId } = req.params;

      const socialMedia = await (tenantDb as any).candidateSocialMedia.findFirst({
        where: { id: smId, candidateId: id },
      });

      if (!socialMedia) {
        res.status(404).json(errorResponse('E3001', 'Social media profile not found'));
        return;
      }

      await (tenantDb as any).candidateSocialMedia.delete({ where: { id: smId } });

      res.json(successResponse({ message: 'Social media profile deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete candidate social media error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // ==================== BATTLE CARDS ====================

  async getCandidateBattleCards(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      const battleCards = await (tenantDb as any).candidateBattleCard.findMany({
        where: { candidateId: id },
        include: {
          opponent: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              photoUrl: true,
              party: {
                select: {
                  partyName: true,
                  partyShortName: true,
                  partyColor: true,
                  partyImageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(successResponse(battleCards));
    } catch (error) {
      logger.error({ err: error }, 'Get candidate battle cards error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createBattleCard(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const data = req.body;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      if (!data.opponentId || !data.title) {
        res.status(400).json(errorResponse('E2001', 'Opponent ID and title are required'));
        return;
      }

      // Verify opponent exists
      const opponent = await (tenantDb as any).candidate.findFirst({
        where: { id: data.opponentId },
      });

      if (!opponent) {
        res.status(404).json(errorResponse('E3001', 'Opponent candidate not found'));
        return;
      }

      // Check if battle card already exists
      const existing = await (tenantDb as any).candidateBattleCard.findFirst({
        where: { candidateId: id, opponentId: data.opponentId },
      });

      if (existing) {
        res.status(400).json(errorResponse('E4001', 'Battle card for this opponent already exists'));
        return;
      }

      const battleCard = await (tenantDb as any).candidateBattleCard.create({
        data: {
          candidateId: id,
          opponentId: data.opponentId,
          title: data.title,
          summary: data.summary,
          ourStrengths: data.ourStrengths || [],
          opponentWeaknesses: data.opponentWeaknesses || [],
          keyIssues: data.keyIssues || [],
          talkingPoints: data.talkingPoints || [],
          counterArguments: data.counterArguments || [],
          voterAppeal: data.voterAppeal || {},
          headToHeadStats: data.headToHeadStats || {},
          createdBy: data.createdBy,
        },
        include: {
          opponent: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              party: {
                select: {
                  partyName: true,
                  partyShortName: true,
                  partyColor: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json(successResponse(battleCard));
    } catch (error) {
      logger.error({ err: error }, 'Create battle card error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateBattleCard(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, bcId } = req.params;
      const data = req.body;

      const battleCard = await (tenantDb as any).candidateBattleCard.findFirst({
        where: { id: bcId, candidateId: id },
      });

      if (!battleCard) {
        res.status(404).json(errorResponse('E3001', 'Battle card not found'));
        return;
      }

      const updated = await (tenantDb as any).candidateBattleCard.update({
        where: { id: bcId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.ourStrengths !== undefined && { ourStrengths: data.ourStrengths }),
          ...(data.opponentWeaknesses !== undefined && { opponentWeaknesses: data.opponentWeaknesses }),
          ...(data.keyIssues !== undefined && { keyIssues: data.keyIssues }),
          ...(data.talkingPoints !== undefined && { talkingPoints: data.talkingPoints }),
          ...(data.counterArguments !== undefined && { counterArguments: data.counterArguments }),
          ...(data.voterAppeal !== undefined && { voterAppeal: data.voterAppeal }),
          ...(data.headToHeadStats !== undefined && { headToHeadStats: data.headToHeadStats }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        include: {
          opponent: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              party: {
                select: {
                  partyName: true,
                  partyShortName: true,
                  partyColor: true,
                },
              },
            },
          },
        },
      });

      res.json(successResponse(updated));
    } catch (error) {
      logger.error({ err: error }, 'Update battle card error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteBattleCard(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, bcId } = req.params;

      const battleCard = await (tenantDb as any).candidateBattleCard.findFirst({
        where: { id: bcId, candidateId: id },
      });

      if (!battleCard) {
        res.status(404).json(errorResponse('E3001', 'Battle card not found'));
        return;
      }

      await (tenantDb as any).candidateBattleCard.delete({ where: { id: bcId } });

      res.json(successResponse({ message: 'Battle card deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete battle card error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // ==================== STATISTICS ====================

  async getCandidateStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const candidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
        include: {
          socialMedia: true,
          _count: {
            select: {
              documents: true,
              battleCards: true,
            },
          },
        },
      });

      if (!candidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      // Calculate total social media reach
      let totalFollowers = 0;
      let totalPosts = 0;
      const platformStats: any = {};

      for (const sm of candidate.socialMedia) {
        totalFollowers += sm.followers || 0;
        totalPosts += sm.posts || 0;
        platformStats[sm.platform] = {
          followers: sm.followers,
          posts: sm.posts,
          engagementRate: sm.engagementRate,
          verified: sm.verifiedStatus,
        };
      }

      const stats = {
        totalSocialMediaProfiles: candidate.socialMedia.length,
        totalFollowers,
        totalPosts,
        documentsCount: candidate._count.documents,
        battleCardsCount: candidate._count.battleCards,
        platformStats,
      };

      res.json(successResponse(stats));
    } catch (error) {
      logger.error({ err: error }, 'Get candidate stats error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
