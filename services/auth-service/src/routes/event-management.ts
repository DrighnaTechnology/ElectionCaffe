import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// ==================== EVENTS ====================

// Get all events
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { status, eventType, startDate, endDate, search, page = '1', limit = '20' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenant.id };
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (startDate) where.startDate = { gte: new Date(startDate as string) };
    if (endDate) where.endDate = { lte: new Date(endDate as string) };
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { venue: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.partyEvent.findMany({
        where,
        include: {
          election: { select: { id: true, name: true } },
          _count: { select: { attendees: true, tasks: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.partyEvent.count({ where }),
    ]);

    res.json(successResponse({ events, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get events error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get upcoming events
router.get('/upcoming', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { limit = '10' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const events = await prisma.partyEvent.findMany({
      where: {
        tenantId: user.tenant.id,
        startDate: { gte: new Date() },
        status: { in: ['SCHEDULED', 'ONGOING'] },
      },
      include: {
        _count: { select: { attendees: true } },
      },
      orderBy: { startDate: 'asc' },
      take: parseInt(limit as string),
    });

    res.json(successResponse(events));
  } catch (error) {
    logger.error({ err: error }, 'Get upcoming events error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single event
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        election: { select: { id: true, name: true } },
        attendees: {
          orderBy: { registeredAt: 'desc' },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    res.json(successResponse(event));
  } catch (error) {
    logger.error({ err: error }, 'Get event error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create event
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const {
      title, titleLocal, description, descriptionLocal, eventType,
      startDate, endDate, allDay, timezone, venue, venueLocal, address,
      city, state, pincode, latitude, longitude, isOnline, onlineLink,
      electionId, expectedAttendees, maxCapacity, speakers, chiefGuest,
      coverImage, images, videos, isPublic, requiresRegistration, registrationDeadline,
      estimatedBudget,
    } = req.body;

    if (!title || !eventType || !startDate) {
      res.status(400).json(errorResponse('E2001', 'Title, event type, and start date are required'));
      return;
    }

    const event = await prisma.partyEvent.create({
      data: {
        tenantId: user.tenant.id,
        title,
        titleLocal,
        description,
        descriptionLocal,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        allDay: allDay ?? false,
        timezone: timezone || 'Asia/Kolkata',
        venue,
        venueLocal,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        isOnline: isOnline ?? false,
        onlineLink,
        electionId,
        expectedAttendees,
        maxCapacity,
        speakers: speakers || [],
        chiefGuest,
        coverImage,
        images: images || [],
        videos: videos || [],
        isPublic: isPublic ?? true,
        requiresRegistration: requiresRegistration ?? false,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
        estimatedBudget,
        createdBy: userId,
        status: 'DRAFT',
      },
    });

    res.status(201).json(successResponse({ event, message: 'Event created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create event error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update event
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const {
      title, titleLocal, description, descriptionLocal, eventType,
      startDate, endDate, allDay, timezone, venue, venueLocal, address,
      city, state, pincode, latitude, longitude, isOnline, onlineLink,
      expectedAttendees, maxCapacity, actualAttendees, speakers, chiefGuest,
      coverImage, images, videos, isPublic, requiresRegistration, registrationDeadline,
      estimatedBudget, actualBudget, status,
    } = req.body;

    const updatedEvent = await prisma.partyEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleLocal !== undefined && { titleLocal }),
        ...(description !== undefined && { description }),
        ...(descriptionLocal !== undefined && { descriptionLocal }),
        ...(eventType !== undefined && { eventType }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(allDay !== undefined && { allDay }),
        ...(timezone !== undefined && { timezone }),
        ...(venue !== undefined && { venue }),
        ...(venueLocal !== undefined && { venueLocal }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(pincode !== undefined && { pincode }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(isOnline !== undefined && { isOnline }),
        ...(onlineLink !== undefined && { onlineLink }),
        ...(expectedAttendees !== undefined && { expectedAttendees }),
        ...(maxCapacity !== undefined && { maxCapacity }),
        ...(actualAttendees !== undefined && { actualAttendees }),
        ...(speakers !== undefined && { speakers }),
        ...(chiefGuest !== undefined && { chiefGuest }),
        ...(coverImage !== undefined && { coverImage }),
        ...(images !== undefined && { images }),
        ...(videos !== undefined && { videos }),
        ...(isPublic !== undefined && { isPublic }),
        ...(requiresRegistration !== undefined && { requiresRegistration }),
        ...(registrationDeadline !== undefined && { registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null }),
        ...(estimatedBudget !== undefined && { estimatedBudget }),
        ...(actualBudget !== undefined && { actualBudget }),
        ...(status !== undefined && { status }),
      },
      include: {
        _count: { select: { attendees: true, tasks: true } },
      },
    });

    res.json(successResponse({ event: updatedEvent, message: 'Event updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update event error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update event status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const { status, cancellationReason } = req.body;

    const validStatuses = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status'));
      return;
    }

    const updatedEvent = await prisma.partyEvent.update({
      where: { id },
      data: {
        status,
        ...(cancellationReason && { cancellationReason }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date(), cancelledBy: userId }),
      },
    });

    res.json(successResponse({ event: updatedEvent, message: `Event ${status.toLowerCase()}` }));
  } catch (error) {
    logger.error({ err: error }, 'Update event status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete event
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    // Delete related data first
    await prisma.eventTask.deleteMany({ where: { eventId: id } });
    await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
    await prisma.partyEvent.delete({ where: { id } });

    res.json(successResponse({ message: 'Event deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete event error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== ATTENDEES ====================

// Register attendee
router.post('/:id/attendees', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const { name, phone, email, role, attendeeUserId } = req.body;

    if (!name) {
      res.status(400).json(errorResponse('E2001', 'Attendee name is required'));
      return;
    }

    // Check if already registered by phone
    if (phone) {
      const existingAttendee = await prisma.eventAttendee.findFirst({
        where: { eventId: id, phone },
      });

      if (existingAttendee) {
        res.status(400).json(errorResponse('E2012', 'Already registered for this event'));
        return;
      }
    }

    const attendee = await prisma.eventAttendee.create({
      data: {
        event: { connect: { id } },
        userId: attendeeUserId,
        name,
        phone,
        email,
        role: role || 'attendee',
        status: 'registered',
      },
    });

    res.status(201).json(successResponse({ attendee, message: 'Registered successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Register attendee error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update attendee status (check-in)
router.patch('/:eventId/attendees/:attendeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { eventId, attendeeId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id: eventId, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const { status, checkedInAt, checkedOutAt, confirmedAt, role, rating, feedback } = req.body;

    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        ...(status !== undefined && { status }),
        ...(checkedInAt !== undefined && { checkedInAt: new Date(checkedInAt) }),
        ...(checkedOutAt !== undefined && { checkedOutAt: new Date(checkedOutAt) }),
        ...(confirmedAt !== undefined && { confirmedAt: new Date(confirmedAt) }),
        ...(role !== undefined && { role }),
        ...(rating !== undefined && { rating }),
        ...(feedback !== undefined && { feedback }),
      },
    });

    res.json(successResponse({ attendee: updatedAttendee, message: 'Attendee updated' }));
  } catch (error) {
    logger.error({ err: error }, 'Update attendee error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Remove attendee
router.delete('/:eventId/attendees/:attendeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { eventId, attendeeId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id: eventId, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    await prisma.eventAttendee.delete({ where: { id: attendeeId } });

    res.json(successResponse({ message: 'Attendee removed' }));
  } catch (error) {
    logger.error({ err: error }, 'Remove attendee error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== TASKS ====================

// Create task
router.post('/:id/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const { title, description, assignedTo, assignedToName, dueDate, priority } = req.body;

    if (!title) {
      res.status(400).json(errorResponse('E2001', 'Task title is required'));
      return;
    }

    const task = await prisma.eventTask.create({
      data: {
        event: { connect: { id } },
        title,
        description,
        assignedTo,
        assignedToName,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || 'medium',
        status: 'pending',
      },
    });

    res.status(201).json(successResponse({ task, message: 'Task created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create task error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update task
router.put('/:eventId/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { eventId, taskId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id: eventId, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    const { title, description, assignedTo, assignedToName, dueDate, priority, status } = req.body;

    const updatedTask = await prisma.eventTask.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(assignedToName !== undefined && { assignedToName }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(status === 'completed' && { completedAt: new Date(), completedBy: userId }),
      },
    });

    res.json(successResponse({ task: updatedTask, message: 'Task updated' }));
  } catch (error) {
    logger.error({ err: error }, 'Update task error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete task
router.delete('/:eventId/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { eventId, taskId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const event = await prisma.partyEvent.findFirst({
      where: { id: eventId, tenantId: user.tenant.id },
    });

    if (!event) {
      res.status(404).json(errorResponse('E3001', 'Event not found'));
      return;
    }

    await prisma.eventTask.delete({ where: { id: taskId } });

    res.json(successResponse({ message: 'Task deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete task error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== CALENDAR VIEW ====================

// Get events for calendar
router.get('/calendar/month', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { year, month } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const y = parseInt(year as string) || new Date().getFullYear();
    const m = parseInt(month as string) || new Date().getMonth() + 1;

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const events = await prisma.partyEvent.findMany({
      where: {
        tenantId: user.tenant.id,
        startDate: { gte: startOfMonth, lte: endOfMonth },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        eventType: true,
        startDate: true,
        endDate: true,
        venue: true,
        status: true,
        _count: { select: { attendees: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(successResponse(events));
  } catch (error) {
    logger.error({ err: error }, 'Get calendar events error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as eventManagementRoutes };
