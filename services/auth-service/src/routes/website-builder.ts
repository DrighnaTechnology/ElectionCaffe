import { Router, Request, Response } from 'express';
import { prisma, WebsiteTemplateType } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// ==================== WEBSITE TEMPLATES (Public/Admin) ====================

// Get all available website templates
router.get('/templates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateType, isPremium } = req.query;

    const templates = await prisma.websiteTemplate.findMany({
      where: {
        isActive: true,
        ...(templateType && { templateType: templateType as WebsiteTemplateType }),
        ...(isPremium !== undefined && { isPremium: isPremium === 'true' }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(successResponse(templates));
  } catch (error) {
    logger.error({ err: error }, 'Get website templates error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single template by ID
router.get('/templates/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const template = await prisma.websiteTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      res.status(404).json(errorResponse('E3001', 'Template not found'));
      return;
    }

    res.json(successResponse(template));
  } catch (error) {
    logger.error({ err: error }, 'Get website template error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== TENANT WEBSITE ====================

// Get tenant's website
router.get('/my-website', async (req: Request, res: Response): Promise<void> => {
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
      include: {
        template: true,
        pages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json(successResponse(website));
  } catch (error) {
    logger.error({ err: error }, 'Get tenant website error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create tenant website
router.post('/my-website', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can create a website.'));
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

    // Check if website already exists
    const existingWebsite = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (existingWebsite) {
      res.status(400).json(errorResponse('E2007', 'Website already exists for this tenant'));
      return;
    }

    const { templateId, subdomain, siteName, siteNameLocal, tagline, description, primaryColor, secondaryColor } = req.body;

    if (!templateId || !subdomain || !siteName) {
      res.status(400).json(errorResponse('E2001', 'Template ID, subdomain, and site name are required'));
      return;
    }

    // Validate template exists
    const template = await prisma.websiteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      res.status(404).json(errorResponse('E3001', 'Template not found'));
      return;
    }

    // Check subdomain uniqueness
    const existingSubdomain = await prisma.tenantWebsite.findUnique({
      where: { subdomain },
    });

    if (existingSubdomain) {
      res.status(400).json(errorResponse('E2006', 'This subdomain is already in use'));
      return;
    }

    // Create website with default pages
    // Parse colorSchemes safely from JSON
    const colorSchemes = Array.isArray(template.colorSchemes) ? template.colorSchemes : [];
    const firstColorScheme = colorSchemes[0] as { primary?: string; secondary?: string } | undefined;

    const website = await prisma.tenantWebsite.create({
      data: {
        tenantId: user.tenant.id,
        templateId,
        subdomain,
        siteName,
        siteNameLocal,
        tagline,
        description,
        primaryColor: primaryColor || firstColorScheme?.primary || user.tenant.primaryColor,
        secondaryColor: secondaryColor || firstColorScheme?.secondary || user.tenant.secondaryColor,
        logoUrl: user.tenant.logoUrl,
        faviconUrl: user.tenant.faviconUrl,
        emAdminUrl: user.tenant.tenantUrl || `${user.tenant.slug}.electioncaffe.com`,
        enabledSections: template.defaultSections as object,
        siteConfig: template.defaultConfig as object,
      },
      include: {
        template: true,
      },
    });

    // Create default pages based on template
    const defaultPages = [
      { pageType: 'home', title: 'Home', slug: '/', sortOrder: 0, isPublished: true, showInNav: false },
      { pageType: 'about', title: 'About Us', slug: 'about', sortOrder: 1, isPublished: true, showInNav: true },
      { pageType: 'contact', title: 'Contact', slug: 'contact', sortOrder: 10, isPublished: true, showInNav: true },
    ];

    for (const page of defaultPages) {
      await prisma.websitePage.create({
        data: {
          websiteId: website.id,
          ...page,
          content: {},
        },
      });
    }

    res.status(201).json(successResponse({ website, message: 'Website created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create tenant website error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update tenant website settings
router.put('/my-website', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can update the website.'));
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const {
      siteName, siteNameLocal, tagline, taglineLocal, description, descriptionLocal,
      logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, fontFamily,
      email, phone, whatsapp, address, addressLocal, socialLinks,
      metaTitle, metaDescription, metaKeywords, ogImage,
      googleAnalyticsId, facebookPixelId, customCss, headerScripts, footerScripts,
      enabledSections, siteConfig, customDomain,
    } = req.body;

    // Validate custom domain if changing
    if (customDomain !== undefined && customDomain !== website.customDomain) {
      if (customDomain) {
        const existingDomain = await prisma.tenantWebsite.findUnique({
          where: { customDomain },
        });
        if (existingDomain && existingDomain.id !== website.id) {
          res.status(400).json(errorResponse('E2006', 'This domain is already in use'));
          return;
        }
      }
    }

    const updatedWebsite = await prisma.tenantWebsite.update({
      where: { id: website.id },
      data: {
        ...(siteName !== undefined && { siteName }),
        ...(siteNameLocal !== undefined && { siteNameLocal }),
        ...(tagline !== undefined && { tagline }),
        ...(taglineLocal !== undefined && { taglineLocal }),
        ...(description !== undefined && { description }),
        ...(descriptionLocal !== undefined && { descriptionLocal }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(fontFamily !== undefined && { fontFamily }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(address !== undefined && { address }),
        ...(addressLocal !== undefined && { addressLocal }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(metaKeywords !== undefined && { metaKeywords }),
        ...(ogImage !== undefined && { ogImage }),
        ...(googleAnalyticsId !== undefined && { googleAnalyticsId }),
        ...(facebookPixelId !== undefined && { facebookPixelId }),
        ...(customCss !== undefined && { customCss }),
        ...(headerScripts !== undefined && { headerScripts }),
        ...(footerScripts !== undefined && { footerScripts }),
        ...(enabledSections !== undefined && { enabledSections }),
        ...(siteConfig !== undefined && { siteConfig }),
        ...(customDomain !== undefined && { customDomain: customDomain || null }),
      },
      include: {
        template: true,
        pages: true,
      },
    });

    res.json(successResponse({ website: updatedWebsite, message: 'Website updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update tenant website error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Publish/Unpublish website
router.patch('/my-website/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const { status } = req.body;

    if (!['DRAFT', 'PUBLISHED', 'MAINTENANCE', 'SUSPENDED'].includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status'));
      return;
    }

    const updatedWebsite = await prisma.tenantWebsite.update({
      where: { id: website.id },
      data: {
        status,
        ...(status === 'PUBLISHED' && !website.publishedAt && { publishedAt: new Date() }),
        lastDeployedAt: status === 'PUBLISHED' ? new Date() : undefined,
      },
    });

    res.json(successResponse({ website: updatedWebsite, message: `Website ${status.toLowerCase()}` }));
  } catch (error) {
    logger.error({ err: error }, 'Update website status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== WEBSITE PAGES ====================

// Get all pages for tenant's website
router.get('/my-website/pages', async (req: Request, res: Response): Promise<void> => {
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const pages = await prisma.websitePage.findMany({
      where: { websiteId: website.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(successResponse(pages));
  } catch (error) {
    logger.error({ err: error }, 'Get website pages error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create new page
router.post('/my-website/pages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const { pageType, title, titleLocal, slug, content, contentLocal, metaTitle, metaDescription, isPublished, showInNav, sortOrder } = req.body;

    if (!title || !slug) {
      res.status(400).json(errorResponse('E2001', 'Title and slug are required'));
      return;
    }

    // Check slug uniqueness for this website
    const existingPage = await prisma.websitePage.findFirst({
      where: { websiteId: website.id, slug },
    });

    if (existingPage) {
      res.status(400).json(errorResponse('E2006', 'A page with this URL slug already exists'));
      return;
    }

    const page = await prisma.websitePage.create({
      data: {
        websiteId: website.id,
        pageType: pageType || 'custom',
        title,
        titleLocal,
        slug,
        content: content || {},
        contentLocal,
        metaTitle,
        metaDescription,
        isPublished: isPublished ?? false,
        showInNav: showInNav ?? true,
        sortOrder: sortOrder ?? 99,
      },
    });

    res.status(201).json(successResponse({ page, message: 'Page created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create website page error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update page
router.put('/my-website/pages/:pageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { pageId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId: website.id },
    });

    if (!page) {
      res.status(404).json(errorResponse('E3001', 'Page not found'));
      return;
    }

    const { title, titleLocal, slug, content, contentLocal, metaTitle, metaDescription, isPublished, showInNav, sortOrder } = req.body;

    // Check slug uniqueness if changing
    if (slug && slug !== page.slug) {
      const existingPage = await prisma.websitePage.findFirst({
        where: { websiteId: website.id, slug, id: { not: pageId } },
      });
      if (existingPage) {
        res.status(400).json(errorResponse('E2006', 'A page with this URL slug already exists'));
        return;
      }
    }

    const updatedPage = await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        ...(title !== undefined && { title }),
        ...(titleLocal !== undefined && { titleLocal }),
        ...(slug !== undefined && { slug }),
        ...(content !== undefined && { content }),
        ...(contentLocal !== undefined && { contentLocal }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(isPublished !== undefined && { isPublished }),
        ...(showInNav !== undefined && { showInNav }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json(successResponse({ page: updatedPage, message: 'Page updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update website page error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete page
router.delete('/my-website/pages/:pageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { pageId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
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

    const website = await prisma.tenantWebsite.findFirst({
      where: { tenantId: user.tenant.id },
    });

    if (!website) {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, websiteId: website.id },
    });

    if (!page) {
      res.status(404).json(errorResponse('E3001', 'Page not found'));
      return;
    }

    // Prevent deleting home page
    if (page.pageType === 'home') {
      res.status(400).json(errorResponse('E2008', 'Cannot delete the home page'));
      return;
    }

    await prisma.websitePage.delete({
      where: { id: pageId },
    });

    res.json(successResponse({ message: 'Page deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete website page error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== PUBLIC WEBSITE ACCESS ====================

// Get public website by subdomain (no auth required)
router.get('/public/:subdomain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subdomain } = req.params;

    const website = await prisma.tenantWebsite.findUnique({
      where: { subdomain },
      include: {
        template: true,
        pages: {
          where: { isPublished: true },
          orderBy: { sortOrder: 'asc' },
        },
        tenant: {
          select: {
            name: true,
            partyName: true,
            partySymbolUrl: true,
            tenantType: true,
          },
        },
      },
    });

    if (!website || website.status !== 'PUBLISHED') {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    res.json(successResponse(website));
  } catch (error) {
    logger.error({ err: error }, 'Get public website error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get public website page
router.get('/public/:subdomain/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subdomain, slug } = req.params;

    const website = await prisma.tenantWebsite.findUnique({
      where: { subdomain },
    });

    if (!website || website.status !== 'PUBLISHED') {
      res.status(404).json(errorResponse('E3001', 'Website not found'));
      return;
    }

    const page = await prisma.websitePage.findFirst({
      where: {
        websiteId: website.id,
        slug: slug === 'home' ? '/' : slug,
        isPublished: true,
      },
    });

    if (!page) {
      res.status(404).json(errorResponse('E3001', 'Page not found'));
      return;
    }

    res.json(successResponse(page));
  } catch (error) {
    logger.error({ err: error }, 'Get public website page error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as websiteBuilderRoutes };
