import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getTenantDb } from '../utils/tenantDb.js';
import { verifyCredits } from '@electioncaffe/database';
import {
  successResponse,
  errorResponse,
  paginationSchema,
  createPaginationMeta,
  calculateSkip,
  createLogger,
} from '@electioncaffe/shared';

// Feature credit cost for battle card generation
const BATTLE_CARD_CREDIT_COST = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptsDir = resolve(__dirname, '../../../../prompts');

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
          partyId: data.partyId || null,
          nominationNumber: data.nominationNumber || null,
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

  // ==================== AI BATTLE CARD GENERATION ====================

  async generateBattleCard(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { opponentId } = req.body;

      if (!opponentId) {
        res.status(400).json(errorResponse('E2001', 'Opponent ID is required'));
        return;
      }

      // Fetch our candidate with full details
      const ourCandidate = await (tenantDb as any).candidate.findFirst({
        where: { id },
        include: {
          party: { select: { partyName: true, partyShortName: true } },
          socialMedia: true,
          election: { select: { name: true, constituency: true, state: true, electionType: true } },
        },
      });

      if (!ourCandidate) {
        res.status(404).json(errorResponse('E3001', 'Candidate not found'));
        return;
      }

      // Fetch opponent with full details
      const opponent = await (tenantDb as any).candidate.findFirst({
        where: { id: opponentId },
        include: {
          party: { select: { partyName: true, partyShortName: true } },
          socialMedia: true,
        },
      });

      if (!opponent) {
        res.status(404).json(errorResponse('E3001', 'Opponent candidate not found'));
        return;
      }

      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      if (!openaiKey && !geminiKey) {
        res.status(500).json(errorResponse('E5002', 'No AI API key configured (OpenAI or Gemini)'));
        return;
      }

      // Build candidate profiles for the prompt
      const formatCandidate = (c: any) => {
        const smSummary = (c.socialMedia || []).map((sm: any) =>
          `${sm.platform}: ${sm.followers} followers, ${sm.engagementRate ? sm.engagementRate.toFixed(1) + '% engagement' : 'N/A'}`
        ).join('; ');

        return `Name: ${c.name}
Party: ${c.party?.partyName || 'Independent'} (${c.party?.partyShortName || 'IND'})
Age: ${c.age || 'N/A'}
Education: ${c.education || 'N/A'}
Profession: ${c.profession || 'N/A'}
Experience: ${c.experience || 'N/A'}
Biography: ${c.biography || 'N/A'}
Achievements: ${Array.isArray(c.achievements) ? c.achievements.join(', ') : (c.achievements || 'N/A')}
Political Career: ${c.politicalCareer || 'N/A'}
Constituency: ${c.constituency || 'N/A'}
Social Media: ${smSummary || 'N/A'}`;
      };

      // Load prompts from files
      const systemPrompt = readFileSync(resolve(promptsDir, 'battle-card-system.txt'), 'utf-8');
      const userPromptTemplate = readFileSync(resolve(promptsDir, 'battle-card-user.txt'), 'utf-8');

      const userPrompt = userPromptTemplate
        .replace('{{electionName}}', ourCandidate.election?.name || 'Election')
        .replace('{{constituency}}', ourCandidate.election?.constituency || 'the constituency')
        .replace('{{state}}', ourCandidate.election?.state || 'India')
        .replace('{{ourCandidateProfile}}', formatCandidate(ourCandidate))
        .replace('{{opponentProfile}}', formatCandidate(opponent));

      logger.info({ candidateId: id, opponentId }, 'Generating AI battle card');

      // Credit check before AI call (using tenant DB for isolation)
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';
      const aiCredits = await (tenantDb as any).tenantAICredits.findUnique({ where: { tenantId } });
      const availableCredits = aiCredits
        ? (aiCredits.totalCredits - aiCredits.usedCredits + (aiCredits.bonusCredits || 0))
        : 0;

      // Verify HMAC signature — detect tampering
      if (aiCredits && !verifyCredits({
        tenantId,
        totalCredits: aiCredits.totalCredits,
        bonusCredits: aiCredits.bonusCredits || 0,
        expiresAt: aiCredits.expiresAt ? new Date(aiCredits.expiresAt).toISOString() : null,
        creditSignature: aiCredits.creditSignature,
      })) {
        res.status(403).json(errorResponse('E4003', 'Credit verification failed. Please contact support.'));
        return;
      }

      if (aiCredits?.expiresAt && new Date() > new Date(aiCredits.expiresAt)) {
        res.status(403).json(errorResponse('E4003', 'AI credits have expired. Please renew your subscription.'));
        return;
      }

      if (!aiCredits || availableCredits < BATTLE_CARD_CREDIT_COST) {
        res.status(403).json(errorResponse('E4003', `Insufficient AI credits. Required: ${BATTLE_CARD_CREDIT_COST}, Available: ${availableCredits}`));
        return;
      }

      const startTime = Date.now();

      // Helper: call OpenAI
      const callOpenAI = async (): Promise<string | null> => {
        if (!openaiKey) return null;
        const model = process.env.OPENAI_MODEL || 'gpt-4o';
        logger.info({ model }, 'Trying OpenAI');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 16384,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });
        if (!response.ok) {
          const errorData = await response.text();
          logger.warn({ status: response.status, error: errorData }, 'OpenAI failed, will try fallback');
          return null;
        }
        const result: any = await response.json();
        return result.choices?.[0]?.message?.content || null;
      };

      // Helper: call Gemini
      const callGemini = async (): Promise<string | null> => {
        if (!geminiKey) return null;
        const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        logger.info({ model }, 'Trying Gemini');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16384,
              responseMimeType: 'application/json',
            },
          }),
        });
        if (!response.ok) {
          const errorData = await response.text();
          logger.warn({ status: response.status, error: errorData }, 'Gemini failed');
          return null;
        }
        const result: any = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
      };

      // Try OpenAI first, fallback to Gemini
      let content = await callOpenAI();
      let provider = 'openai';
      if (!content) {
        content = await callGemini();
        provider = 'gemini';
      }

      if (!content) {
        res.status(502).json(errorResponse('E5003', 'All AI providers failed. Check API keys and billing.'));
        return;
      }

      logger.info({ provider }, 'AI response received');

      // Strip emojis/4-byte UTF-8 chars that WIN1252-encoded DBs can't store
      const stripEmojis = (str: string): string =>
        str.replace(/[\u{10000}-\u{10FFFF}]/gu, '').replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
      const sanitizeJson = (obj: any): any => {
        if (typeof obj === 'string') return stripEmojis(obj);
        if (Array.isArray(obj)) return obj.map(sanitizeJson);
        if (obj && typeof obj === 'object') {
          const result: any = {};
          for (const [k, v] of Object.entries(obj)) result[k] = sanitizeJson(v);
          return result;
        }
        return obj;
      };

      let battleCardData: any;
      try {
        battleCardData = sanitizeJson(JSON.parse(content));
      } catch {
        logger.error({ content }, 'Failed to parse AI response as JSON');
        res.status(502).json(errorResponse('E5003', 'Invalid AI response format'));
        return;
      }

      // Deduct credits in tenant DB (tenant isolation)
      const responseTime = Date.now() - startTime;
      try {
        await (tenantDb as any).$transaction(async (tx: any) => {
          await tx.tenantAICredits.update({
            where: { tenantId },
            data: { usedCredits: { increment: BATTLE_CARD_CREDIT_COST } },
          });
          await tx.aIUsageLog.create({
            data: {
              tenantCreditsId: aiCredits.id,
              userId,
              featureKey: 'battle_card',
              creditsUsed: BATTLE_CARD_CREDIT_COST,
              modelUsed: provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o') : (process.env.GEMINI_MODEL || 'gemini-2.0-flash'),
              responseTime,
              status: 'success',
            },
          });
          await tx.aICreditTransaction.create({
            data: {
              tenantCreditsId: aiCredits.id,
              transactionType: 'USAGE',
              credits: -BATTLE_CARD_CREDIT_COST,
              description: `Used ${BATTLE_CARD_CREDIT_COST} credits for battle_card`,
              referenceType: 'AI_FEATURE',
              referenceId: 'battle_card',
              createdBy: userId,
            },
          });
        });
      } catch (creditErr) {
        logger.warn({ err: creditErr }, 'Failed to deduct credits for battle card');
      }

      // Check if battle card already exists and delete it (regeneration)
      const existing = await (tenantDb as any).candidateBattleCard.findFirst({
        where: { candidateId: id, opponentId },
      });
      if (existing) {
        await (tenantDb as any).candidateBattleCard.delete({ where: { id: existing.id } });
      }

      // Save the AI-generated battle card
      const battleCard = await (tenantDb as any).candidateBattleCard.create({
        data: {
          candidateId: id,
          opponentId,
          title: battleCardData.title || `${ourCandidate.name} vs ${opponent.name}`,
          summary: battleCardData.summary || '',
          ourStrengths: battleCardData.ourStrengths || [],
          opponentWeaknesses: battleCardData.opponentWeaknesses || [],
          keyIssues: battleCardData.keyIssues || [],
          talkingPoints: battleCardData.talkingPoints || [],
          counterArguments: battleCardData.counterArguments || [],
          voterAppeal: battleCardData.voterAppeal || {},
          headToHeadStats: battleCardData.headToHeadStats || {},
          campaignAmmunition: battleCardData.campaignAmmunition || {},
          speechPoints: battleCardData.speechPoints || [],
          demographicStrategy: battleCardData.demographicStrategy || {},
          groundStrategy: battleCardData.groundStrategy || {},
          socialMediaStrategy: battleCardData.socialMediaStrategy || {},
          winPath: battleCardData.winPath || {},
          createdBy: req.headers['x-user-id'] as string || null,
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

      logger.info({
        candidateId: id,
        opponentId,
        battleCardId: battleCard.id,
        provider,
      }, 'AI battle card generated successfully');

      res.status(201).json(successResponse(battleCard));
    } catch (error) {
      logger.error({ err: error }, 'Generate AI battle card error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // ==================== GET BATTLE CARD BY ID ====================

  async getBattleCardById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id, bcId } = req.params;

      const battleCard = await (tenantDb as any).candidateBattleCard.findFirst({
        where: { id: bcId, candidateId: id },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              age: true,
              education: true,
              profession: true,
              constituency: true,
              party: {
                select: {
                  partyName: true,
                  partyShortName: true,
                  partyColor: true,
                },
              },
            },
          },
          opponent: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              age: true,
              education: true,
              profession: true,
              constituency: true,
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

      if (!battleCard) {
        res.status(404).json(errorResponse('E3001', 'Battle card not found'));
        return;
      }

      res.json(successResponse(battleCard));
    } catch (error) {
      logger.error({ err: error }, 'Get battle card by ID error');
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
