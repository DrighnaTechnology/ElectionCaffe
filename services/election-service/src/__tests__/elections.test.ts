import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Router } from 'express';

// Create a minimal test app that mimics election-service routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req: any, _res, next) => {
    req.headers['x-tenant-id'] = 'test-tenant';
    req.user = { id: 'user-1', tenantId: 'test-tenant', role: 'TENANT_ADMIN' };
    next();
  });

  const mockElections = [
    {
      id: 'election-1',
      tenantId: 'test-tenant',
      name: 'TN Assembly Election 2024',
      electionType: 'ASSEMBLY',
      state: 'Tamil Nadu',
      constituency: 'Chennai Central',
      status: 'ACTIVE',
      totalVoters: 150000,
      totalBooths: 200,
      totalParts: 50,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'election-2',
      tenantId: 'test-tenant',
      name: 'Local Body Election 2024',
      electionType: 'LOCAL_BODY',
      state: 'Tamil Nadu',
      constituency: 'Chennai Ward 5',
      status: 'DRAFT',
      totalVoters: 25000,
      totalBooths: 30,
      totalParts: 10,
      createdAt: new Date().toISOString(),
    },
  ];

  const router = Router();

  // List elections
  router.get('/', (req, res) => {
    const { page = '1', limit = '10', status } = req.query as any;
    let filtered = [...mockElections];
    if (status) filtered = filtered.filter(e => e.status === status);

    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filtered.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / parseInt(limit)),
      },
    });
  });

  // Get election by ID
  router.get('/:id', (req, res) => {
    const election = mockElections.find(e => e.id === req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, error: { message: 'Election not found' } });
    }
    res.json({ success: true, data: election });
  });

  // Create election
  router.post('/', (req, res) => {
    const { name, electionType, state, constituency } = req.body;
    if (!name || !electionType || !state || !constituency) {
      return res.status(400).json({ success: false, error: { message: 'Required fields missing' } });
    }
    const newElection = {
      id: 'election-new',
      tenantId: 'test-tenant',
      name,
      electionType,
      state,
      constituency,
      status: 'DRAFT',
      totalVoters: 0,
      totalBooths: 0,
      totalParts: 0,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json({ success: true, data: newElection });
  });

  // Update election
  router.put('/:id', (req, res) => {
    const election = mockElections.find(e => e.id === req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, error: { message: 'Election not found' } });
    }
    const updated = { ...election, ...req.body };
    res.json({ success: true, data: updated });
  });

  // Delete election
  router.delete('/:id', (req, res) => {
    const election = mockElections.find(e => e.id === req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, error: { message: 'Election not found' } });
    }
    res.json({ success: true, message: 'Election deleted' });
  });

  app.use('/api/elections', router);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'election-service' });
  });

  return app;
}

describe('Election Service', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/elections', () => {
    it('should list all elections', async () => {
      const res = await request(app).get('/api/elections');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/elections?status=ACTIVE');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('ACTIVE');
    });

    it('should paginate results', async () => {
      const res = await request(app).get('/api/elections?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/elections/:id', () => {
    it('should get election by ID', async () => {
      const res = await request(app).get('/api/elections/election-1');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('TN Assembly Election 2024');
    });

    it('should return 404 for non-existent election', async () => {
      const res = await request(app).get('/api/elections/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/elections', () => {
    it('should create a new election', async () => {
      const res = await request(app)
        .post('/api/elections')
        .send({
          name: 'New Election',
          electionType: 'ASSEMBLY',
          state: 'Kerala',
          constituency: 'Trivandrum',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Election');
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/elections')
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/elections/:id', () => {
    it('should update an election', async () => {
      const res = await request(app)
        .put('/api/elections/election-1')
        .send({ name: 'Updated Election Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Election Name');
    });

    it('should return 404 for non-existent election', async () => {
      const res = await request(app)
        .put('/api/elections/nonexistent')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/elections/:id', () => {
    it('should delete an election', async () => {
      const res = await request(app).delete('/api/elections/election-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent election', async () => {
      const res = await request(app).delete('/api/elections/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
