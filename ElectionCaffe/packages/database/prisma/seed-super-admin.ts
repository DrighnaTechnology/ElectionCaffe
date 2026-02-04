import { PrismaClient, TenantType, TenantStatus, DatabaseType, DatabaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Super Admin and basic data...\n');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // ========== Create Super Admin ==========
  console.log('👑 Creating Super Admin...');

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'superadmin@electioncaffe.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@electioncaffe.com',
      mobile: '9999999999',
      passwordHash: superAdminPasswordHash,
      isActive: true,
    },
  });
  console.log(`  ✅ Created Super Admin: ${superAdmin.email}`);

  // Create additional super admin for testing
  await prisma.superAdmin.upsert({
    where: { email: 'admin@electioncaffe.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@electioncaffe.com',
      mobile: '9999999998',
      passwordHash: superAdminPasswordHash,
      isActive: true,
    },
  });
  console.log(`  ✅ Created additional Super Admin: admin@electioncaffe.com`);

  // ========== Create Feature Flags ==========
  console.log('\n🚩 Creating feature flags...');

  const DEFAULT_FEATURE_FLAGS = [
    // Core Features
    { featureKey: 'voter_management', featureName: 'Voter Management', description: 'Manage voter data and profiles', category: 'core', isGlobal: true, defaultEnabled: true },
    { featureKey: 'election_management', featureName: 'Election Management', description: 'Create and manage elections', category: 'core', isGlobal: true, defaultEnabled: true },
    { featureKey: 'part_management', featureName: 'Part/Booth Management', description: 'Manage polling parts and booths', category: 'core', isGlobal: true, defaultEnabled: true },
    { featureKey: 'family_management', featureName: 'Family Management', description: 'Group voters into families', category: 'core', isGlobal: true, defaultEnabled: true },

    // Cadre & Field Operations
    { featureKey: 'cadre_management', featureName: 'Cadre Management', description: 'Manage campaign cadres and volunteers', category: 'cadre', isGlobal: true, defaultEnabled: true },
    { featureKey: 'cadre_tracking', featureName: 'Cadre Live Tracking', description: 'Real-time GPS tracking of cadres', category: 'cadre', isGlobal: true, defaultEnabled: false },

    // Poll Day Features
    { featureKey: 'poll_day_voting', featureName: 'Poll Day Voting', description: 'Mark votes on poll day', category: 'poll_day', isGlobal: true, defaultEnabled: true },
    { featureKey: 'poll_day_turnout', featureName: 'Real-time Turnout', description: 'Live turnout tracking', category: 'poll_day', isGlobal: true, defaultEnabled: true },

    // Analytics & Reports
    { featureKey: 'analytics_dashboard', featureName: 'Analytics Dashboard', description: 'View election analytics', category: 'analytics', isGlobal: true, defaultEnabled: true },
    { featureKey: 'reports_pdf', featureName: 'PDF Reports', description: 'Generate PDF reports', category: 'reports', isGlobal: true, defaultEnabled: true },
    { featureKey: 'reports_excel', featureName: 'Excel Reports', description: 'Generate Excel reports', category: 'reports', isGlobal: true, defaultEnabled: true },

    // AI Features
    { featureKey: 'ai_sentiment', featureName: 'AI Sentiment Analysis', description: 'AI-powered voter sentiment analysis', category: 'ai', isGlobal: true, defaultEnabled: false },
    { featureKey: 'ai_prediction', featureName: 'AI Turnout Prediction', description: 'AI-powered turnout predictions', category: 'ai', isGlobal: true, defaultEnabled: false },

    // Communication
    { featureKey: 'sms_campaign', featureName: 'SMS Campaigns', description: 'Send SMS to voters', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'whatsapp_campaign', featureName: 'WhatsApp Campaigns', description: 'Send WhatsApp messages', category: 'communication', isGlobal: true, defaultEnabled: false },

    // Survey & Feedback
    { featureKey: 'surveys', featureName: 'Surveys', description: 'Create and manage voter surveys', category: 'engagement', isGlobal: true, defaultEnabled: true },
    { featureKey: 'feedback_issues', featureName: 'Feedback Issues', description: 'Collect voter feedback and issues', category: 'engagement', isGlobal: true, defaultEnabled: true },

    // Data Import/Export
    { featureKey: 'bulk_import', featureName: 'Bulk Data Import', description: 'Import voters/parts from Excel/CSV', category: 'data', isGlobal: true, defaultEnabled: true },
    { featureKey: 'bulk_export', featureName: 'Bulk Data Export', description: 'Export data to Excel/CSV', category: 'data', isGlobal: true, defaultEnabled: true },

    // Security
    { featureKey: 'two_factor_auth', featureName: 'Two-Factor Authentication', description: 'Enable 2FA for users', category: 'security', isGlobal: true, defaultEnabled: false },
    { featureKey: 'audit_logs', featureName: 'Audit Logs', description: 'Track all system changes', category: 'security', isGlobal: true, defaultEnabled: true },

    // Website Builder
    { featureKey: 'website_builder', featureName: 'Website Builder', description: 'Create pre-built party/candidate websites', category: 'website', isGlobal: true, defaultEnabled: false },
    { featureKey: 'website_party', featureName: 'Party Website Template', description: 'Political party website templates', category: 'website', isGlobal: true, defaultEnabled: false },
    { featureKey: 'website_candidate', featureName: 'Candidate Website Template', description: 'Individual candidate website templates', category: 'website', isGlobal: true, defaultEnabled: false },
    { featureKey: 'website_emc', featureName: 'EMC Website Template', description: 'Election management company website templates', category: 'website', isGlobal: true, defaultEnabled: false },
    { featureKey: 'website_custom_domain', featureName: 'Custom Domain', description: 'Use custom domain for tenant website', category: 'website', isGlobal: true, defaultEnabled: false },

    // Fund Management
    { featureKey: 'fund_management', featureName: 'Fund Management', description: 'Manage party donations and expenses', category: 'finance', isGlobal: true, defaultEnabled: false },
    { featureKey: 'fund_donations', featureName: 'Donation Tracking', description: 'Track and manage party donations', category: 'finance', isGlobal: true, defaultEnabled: false },
    { featureKey: 'fund_expenses', featureName: 'Expense Management', description: 'Track and manage party expenses', category: 'finance', isGlobal: true, defaultEnabled: false },
    { featureKey: 'fund_reports', featureName: 'Financial Reports', description: 'Generate financial reports and statements', category: 'finance', isGlobal: true, defaultEnabled: false },
    { featureKey: 'fund_budget', featureName: 'Budget Planning', description: 'Plan and track campaign budgets', category: 'finance', isGlobal: true, defaultEnabled: false },

    // Inventory Management
    { featureKey: 'inventory_management', featureName: 'Inventory Management', description: 'Manage party inventory and assets', category: 'inventory', isGlobal: true, defaultEnabled: false },
    { featureKey: 'inventory_vehicles', featureName: 'Vehicle Management', description: 'Track party vehicles and fleet', category: 'inventory', isGlobal: true, defaultEnabled: false },
    { featureKey: 'inventory_materials', featureName: 'Campaign Materials', description: 'Track flags, banners, and campaign materials', category: 'inventory', isGlobal: true, defaultEnabled: false },
    { featureKey: 'inventory_allocation', featureName: 'Asset Allocation', description: 'Allocate inventory to events and campaigns', category: 'inventory', isGlobal: true, defaultEnabled: false },

    // Event Management
    { featureKey: 'event_management', featureName: 'Event Management', description: 'Plan and manage party events centrally', category: 'events', isGlobal: true, defaultEnabled: false },
    { featureKey: 'event_rallies', featureName: 'Rally Planning', description: 'Plan and coordinate political rallies', category: 'events', isGlobal: true, defaultEnabled: false },
    { featureKey: 'event_meetings', featureName: 'Meeting Scheduler', description: 'Schedule and manage party meetings', category: 'events', isGlobal: true, defaultEnabled: false },
    { featureKey: 'event_notifications', featureName: 'Event Notifications', description: 'Send event updates to party workers', category: 'events', isGlobal: true, defaultEnabled: false },
    { featureKey: 'event_attendance', featureName: 'Event Attendance', description: 'Track event attendance and check-ins', category: 'events', isGlobal: true, defaultEnabled: false },

    // Internal Notifications
    { featureKey: 'internal_notifications', featureName: 'Internal Notifications', description: 'Send announcements to party members', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'push_notifications', featureName: 'Push Notifications', description: 'Send push notifications to mobile app', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'broadcast_messages', featureName: 'Broadcast Messages', description: 'Broadcast messages to all workers', category: 'communication', isGlobal: true, defaultEnabled: false },

    // Internal Chat/Mail
    { featureKey: 'internal_chat', featureName: 'Internal Chat', description: 'Internal messaging between party members', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'group_chat', featureName: 'Group Chat', description: 'Create group conversations', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'support_tickets', featureName: 'Support Tickets', description: 'Internal support ticket system', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'chat_channels', featureName: 'Chat Channels', description: 'Create broadcast channels for announcements', category: 'communication', isGlobal: true, defaultEnabled: false },

    // News & Broadcast (NB)
    { featureKey: 'nb_news_parsing', featureName: 'News Parsing', description: 'AI-powered news parsing and analysis', category: 'nb', isGlobal: true, defaultEnabled: false },
    { featureKey: 'nb_party_lines', featureName: 'Party Lines', description: 'Generate and distribute party talking points', category: 'nb', isGlobal: true, defaultEnabled: false },
    { featureKey: 'nb_speech_points', featureName: 'Speech Points', description: 'AI-generated speech points and scripts', category: 'nb', isGlobal: true, defaultEnabled: false },
    { featureKey: 'nb_action_plans', featureName: 'Action Plans', description: 'Generate action plans from news analysis', category: 'nb', isGlobal: true, defaultEnabled: false },
  ];

  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { featureKey: flag.featureKey },
      update: {},
      create: flag,
    });
  }
  console.log(`  ✅ Created ${DEFAULT_FEATURE_FLAGS.length} feature flags`);

  // ========== Create Website Templates ==========
  console.log('\n🌐 Creating website templates...');

  const WEBSITE_TEMPLATES = [
    // Political Party Templates
    {
      name: 'Modern Party',
      description: 'A modern, sleek political party website with hero sections, manifesto display, leader profiles, and news updates',
      templateType: 'POLITICAL_PARTY',
      templateCode: 'party-modern-1',
      thumbnailUrl: '/templates/party-modern-1-thumb.jpg',
      features: ['hero_banner', 'manifesto', 'leaders', 'news', 'events', 'gallery', 'contact_form', 'donation'],
      colorSchemes: [
        { name: 'Saffron Pride', primary: '#FF9933', secondary: '#138808', accent: '#000080' },
        { name: 'Green Growth', primary: '#138808', secondary: '#FF9933', accent: '#FFFFFF' },
        { name: 'Blue Trust', primary: '#000080', secondary: '#FFFFFF', accent: '#FF9933' },
      ],
      defaultSections: ['hero', 'about', 'manifesto', 'leaders', 'achievements', 'news', 'events', 'gallery', 'contact'],
      supportedLocales: ['en', 'hi', 'ta', 'te', 'bn', 'mr'],
      isActive: true,
      isPremium: false,
      sortOrder: 1,
    },
    {
      name: 'Traditional Party',
      description: 'A traditional-style political party website emphasizing heritage, culture, and grassroots connection',
      templateType: 'POLITICAL_PARTY',
      templateCode: 'party-traditional-1',
      thumbnailUrl: '/templates/party-traditional-1-thumb.jpg',
      features: ['hero_banner', 'manifesto', 'leaders', 'history', 'news', 'events', 'gallery', 'contact_form'],
      colorSchemes: [
        { name: 'Classic Saffron', primary: '#FF6600', secondary: '#FFFFFF', accent: '#333333' },
        { name: 'Heritage Green', primary: '#006400', secondary: '#FFD700', accent: '#FFFFFF' },
      ],
      defaultSections: ['hero', 'history', 'ideology', 'leaders', 'manifesto', 'news', 'contact'],
      supportedLocales: ['en', 'hi', 'ta', 'te', 'bn', 'mr'],
      isActive: true,
      isPremium: false,
      sortOrder: 2,
    },
    {
      name: 'Youth Party',
      description: 'A vibrant, energetic website design targeting young voters with modern UI and social media integration',
      templateType: 'POLITICAL_PARTY',
      templateCode: 'party-youth-1',
      thumbnailUrl: '/templates/party-youth-1-thumb.jpg',
      features: ['hero_video', 'manifesto', 'leaders', 'news', 'events', 'social_feed', 'volunteer_signup', 'donation'],
      colorSchemes: [
        { name: 'Electric Blue', primary: '#0066FF', secondary: '#00CCFF', accent: '#FF6600' },
        { name: 'Vibrant Purple', primary: '#6600CC', secondary: '#FF00FF', accent: '#00FFFF' },
      ],
      defaultSections: ['hero_video', 'mission', 'leaders', 'social_wall', 'events', 'volunteer', 'contact'],
      supportedLocales: ['en', 'hi'],
      isActive: true,
      isPremium: true,
      sortOrder: 3,
    },
    // Candidate Templates
    {
      name: 'Candidate Pro',
      description: 'Professional candidate website showcasing achievements, vision, and campaign updates',
      templateType: 'CANDIDATE',
      templateCode: 'candidate-pro-1',
      thumbnailUrl: '/templates/candidate-pro-1-thumb.jpg',
      features: ['hero_banner', 'bio', 'vision', 'achievements', 'news', 'events', 'gallery', 'contact_form', 'donation'],
      colorSchemes: [
        { name: 'Professional Blue', primary: '#1E3A5F', secondary: '#4A90D9', accent: '#FFD700' },
        { name: 'Confident Red', primary: '#8B0000', secondary: '#FF6347', accent: '#FFFFFF' },
        { name: 'Trust Green', primary: '#2E8B57', secondary: '#90EE90', accent: '#FFFFFF' },
      ],
      defaultSections: ['hero', 'about', 'vision', 'achievements', 'endorsements', 'news', 'events', 'contact'],
      supportedLocales: ['en', 'hi', 'ta', 'te', 'bn', 'mr'],
      isActive: true,
      isPremium: false,
      sortOrder: 10,
    },
    {
      name: 'Candidate Local',
      description: 'Community-focused candidate website emphasizing local issues and grassroots engagement',
      templateType: 'CANDIDATE',
      templateCode: 'candidate-local-1',
      thumbnailUrl: '/templates/candidate-local-1-thumb.jpg',
      features: ['hero_banner', 'bio', 'local_issues', 'work_done', 'testimonials', 'events', 'contact_form'],
      colorSchemes: [
        { name: 'Earthy Brown', primary: '#8B4513', secondary: '#DEB887', accent: '#228B22' },
        { name: 'Sky Blue', primary: '#87CEEB', secondary: '#4682B4', accent: '#FFD700' },
      ],
      defaultSections: ['hero', 'about', 'issues', 'work', 'testimonials', 'events', 'contact'],
      supportedLocales: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml'],
      isActive: true,
      isPremium: false,
      sortOrder: 11,
    },
    {
      name: 'Candidate Premium',
      description: 'Premium candidate website with video backgrounds, animations, and advanced features',
      templateType: 'CANDIDATE',
      templateCode: 'candidate-premium-1',
      thumbnailUrl: '/templates/candidate-premium-1-thumb.jpg',
      features: ['hero_video', 'bio', 'vision', 'achievements', 'endorsements', 'news', 'events', 'gallery', 'donation', 'volunteer_signup'],
      colorSchemes: [
        { name: 'Elegant Black', primary: '#1a1a1a', secondary: '#333333', accent: '#FFD700' },
        { name: 'Royal Purple', primary: '#4B0082', secondary: '#9370DB', accent: '#FFD700' },
      ],
      defaultSections: ['hero_video', 'about', 'vision', 'achievements', 'endorsements', 'media', 'events', 'volunteer', 'contact'],
      supportedLocales: ['en', 'hi'],
      isActive: true,
      isPremium: true,
      sortOrder: 12,
    },
    // Election Management Company Templates
    {
      name: 'EMC Corporate',
      description: 'Professional election management company website showcasing services and past projects',
      templateType: 'ELECTION_MANAGEMENT',
      templateCode: 'emc-corporate-1',
      thumbnailUrl: '/templates/emc-corporate-1-thumb.jpg',
      features: ['hero_banner', 'services', 'portfolio', 'team', 'testimonials', 'contact_form', 'client_logos'],
      colorSchemes: [
        { name: 'Corporate Blue', primary: '#003366', secondary: '#0066CC', accent: '#FF6600' },
        { name: 'Professional Gray', primary: '#333333', secondary: '#666666', accent: '#0066CC' },
      ],
      defaultSections: ['hero', 'services', 'portfolio', 'stats', 'team', 'testimonials', 'clients', 'contact'],
      supportedLocales: ['en', 'hi'],
      isActive: true,
      isPremium: false,
      sortOrder: 20,
    },
    {
      name: 'EMC Tech',
      description: 'Technology-focused election management website highlighting digital solutions and innovation',
      templateType: 'ELECTION_MANAGEMENT',
      templateCode: 'emc-tech-1',
      thumbnailUrl: '/templates/emc-tech-1-thumb.jpg',
      features: ['hero_animated', 'services', 'technology', 'portfolio', 'team', 'blog', 'contact_form'],
      colorSchemes: [
        { name: 'Tech Blue', primary: '#0A192F', secondary: '#172A45', accent: '#64FFDA' },
        { name: 'Digital Purple', primary: '#1A1A2E', secondary: '#16213E', accent: '#E94560' },
      ],
      defaultSections: ['hero', 'services', 'technology', 'portfolio', 'team', 'blog', 'contact'],
      supportedLocales: ['en'],
      isActive: true,
      isPremium: true,
      sortOrder: 21,
    },
    // Corporate Party Templates
    {
      name: 'Corporate Modern',
      description: 'Modern corporate-style party website with clean design and professional appearance',
      templateType: 'CORPORATE_PARTY',
      templateCode: 'corporate-modern-1',
      thumbnailUrl: '/templates/corporate-modern-1-thumb.jpg',
      features: ['hero_banner', 'about', 'leadership', 'policies', 'news', 'media', 'contact_form'],
      colorSchemes: [
        { name: 'Executive Blue', primary: '#1E3A5F', secondary: '#2C5282', accent: '#ECC94B' },
        { name: 'Corporate Gray', primary: '#2D3748', secondary: '#4A5568', accent: '#48BB78' },
      ],
      defaultSections: ['hero', 'about', 'leadership', 'policies', 'news', 'media', 'contact'],
      supportedLocales: ['en', 'hi'],
      isActive: true,
      isPremium: true,
      sortOrder: 30,
    },
    // Grassroots Templates
    {
      name: 'Grassroots Community',
      description: 'Community-focused grassroots campaign website emphasizing local engagement and volunteer coordination',
      templateType: 'GRASSROOTS',
      templateCode: 'grassroots-community-1',
      thumbnailUrl: '/templates/grassroots-community-1-thumb.jpg',
      features: ['hero_banner', 'mission', 'issues', 'volunteer_signup', 'events', 'stories', 'donation', 'contact_form'],
      colorSchemes: [
        { name: 'Earth Tones', primary: '#5D4E37', secondary: '#8B7355', accent: '#228B22' },
        { name: 'Community Green', primary: '#2E7D32', secondary: '#66BB6A', accent: '#FFA000' },
      ],
      defaultSections: ['hero', 'mission', 'issues', 'volunteer', 'events', 'stories', 'donate', 'contact'],
      supportedLocales: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa'],
      isActive: true,
      isPremium: false,
      sortOrder: 40,
    },
  ];

  for (const template of WEBSITE_TEMPLATES) {
    await (prisma as any).websiteTemplate.upsert({
      where: { templateCode: template.templateCode },
      update: {},
      create: template,
    });
  }
  console.log(`  ✅ Created ${WEBSITE_TEMPLATES.length} website templates`);

  // ========== Create Sample Tenant ==========
  console.log('\n🏢 Creating sample tenant...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Political Party',
      slug: 'demo-tenant',
      tenantType: TenantType.POLITICAL_PARTY,
      organizationName: 'Demo Party Campaign Office',
      state: 'Tamil Nadu',
      primaryColor: '#FF9933',
      subscriptionPlan: 'premium',
      maxVoters: 500000,
      maxCadres: 1000,
      maxElections: 20,
      status: TenantStatus.ACTIVE,
      databaseType: DatabaseType.SHARED,
      databaseStatus: DatabaseStatus.READY,
      databaseManagedBy: 'super_admin',
      canTenantEditDb: false,
    },
  });
  console.log(`  ✅ Created tenant: ${tenant.name}`);

  // ========== Create Tenant Admin User ==========
  console.log('\n👤 Creating tenant admin user...');

  await prisma.user.upsert({
    where: { tenantId_mobile: { tenantId: tenant.id, mobile: '9876543210' } },
    update: {},
    create: {
      tenantId: tenant.id,
      firstName: 'Tenant',
      lastName: 'Admin',
      email: 'admin@demo-tenant.com',
      mobile: '9876543210',
      passwordHash: adminPasswordHash,
      role: 'TENANT_ADMIN',
      permissions: ['all'],
    },
  });
  console.log(`  ✅ Created tenant admin: 9876543210`);

  // ========== Enable features for tenant ==========
  console.log('\n🚩 Enabling features for tenant...');

  const allFeatures = await prisma.featureFlag.findMany();
  for (const feature of allFeatures) {
    await prisma.tenantFeature.upsert({
      where: { tenantId_featureId: { tenantId: tenant.id, featureId: feature.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        featureId: feature.id,
        isEnabled: feature.defaultEnabled,
      },
    });
  }
  console.log(`  ✅ Enabled ${allFeatures.length} features for tenant`);

  // ========== Summary ==========
  console.log('\n\n🎉 ============ Database Seed Completed Successfully! ============\n');
  console.log('🔐 Super Admin Credentials (for Super Admin Portal):');
  console.log('   📧 Email: superadmin@electioncaffe.com');
  console.log('   🔑 Password: SuperAdmin@123');
  console.log('   🌐 Portal: http://localhost:5174');
  console.log('\n🔐 Tenant Admin Credentials (for Main App):');
  console.log('   📱 Mobile: 9876543210');
  console.log('   🔑 Password: admin123');
  console.log('   🌐 Portal: http://localhost:5173');
  console.log('\n📊 Database Architecture:');
  console.log('   - Super Admin Database: ElectionCaffe (Platform DB)');
  console.log('   - Demo tenant created with SHARED database');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
