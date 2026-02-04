/**
 * Core Database Seed - ElectionCaffeCore
 *
 * Seeds the core database with:
 * - System configuration
 * - License plans
 * - Feature flags
 * - Website templates
 * - AI configuration
 * - Super admin user
 */

import { PrismaClient } from '../node_modules/.prisma/core-client/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ElectionCaffeCore database...');

  // 1. System Configuration
  const systemConfigs = [
    {
      configKey: 'platform_name',
      configValue: { name: 'ElectionCaffe', tagline: 'Election Management Platform' },
      description: 'Platform branding configuration',
      isSystem: true,
    },
    {
      configKey: 'default_tenant_limits',
      configValue: {
        maxVoters: 10000,
        maxCadres: 100,
        maxElections: 5,
        maxUsers: 50,
        maxConstituencies: 1,
        storageQuotaMB: 5000,
      },
      description: 'Default limits for new tenants',
      isSystem: true,
    },
    {
      configKey: 'database_config',
      configValue: {
        defaultType: 'DEDICATED_MANAGED',
        autoProvision: true,
        dbNamePrefix: 'EC_',
      },
      description: 'Database provisioning configuration',
      isSystem: true,
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { configKey: config.configKey },
      update: config,
      create: config,
    });
  }
  console.log('  ✓ System configs seeded');

  // 2. License Plans
  const licensePlans = [
    {
      planCode: 'free',
      planName: 'Free Plan',
      description: 'Basic features for small campaigns',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: ['Basic voter management', 'Up to 5,000 voters', 'Email support'],
      limits: {
        maxVoters: 5000,
        maxCadres: 20,
        maxElections: 1,
        maxUsers: 10,
        maxConstituencies: 1,
        storageQuotaMB: 1000,
        aiCredits: 100,
      },
      sortOrder: 1,
    },
    {
      planCode: 'starter',
      planName: 'Starter Plan',
      description: 'For individual candidates',
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      features: ['All Free features', 'Up to 25,000 voters', 'Campaign analytics', 'Priority support'],
      limits: {
        maxVoters: 25000,
        maxCadres: 100,
        maxElections: 3,
        maxUsers: 30,
        maxConstituencies: 1,
        storageQuotaMB: 5000,
        aiCredits: 500,
      },
      sortOrder: 2,
    },
    {
      planCode: 'professional',
      planName: 'Professional Plan',
      description: 'For serious candidates and small parties',
      monthlyPrice: 9999,
      yearlyPrice: 99990,
      features: ['All Starter features', 'Up to 100,000 voters', 'AI analytics', 'Multi-constituency'],
      limits: {
        maxVoters: 100000,
        maxCadres: 500,
        maxElections: 10,
        maxUsers: 100,
        maxConstituencies: 5,
        storageQuotaMB: 20000,
        aiCredits: 2000,
      },
      sortOrder: 3,
    },
    {
      planCode: 'enterprise',
      planName: 'Enterprise Plan',
      description: 'For political parties and EMCs',
      monthlyPrice: 49999,
      yearlyPrice: 499990,
      features: ['Unlimited voters', 'Dedicated database', 'Custom integrations', '24/7 support'],
      limits: {
        maxVoters: -1,
        maxCadres: -1,
        maxElections: -1,
        maxUsers: -1,
        maxConstituencies: -1,
        storageQuotaMB: -1,
        aiCredits: 10000,
      },
      sortOrder: 4,
    },
  ];

  for (const plan of licensePlans) {
    await prisma.licensePlan.upsert({
      where: { planCode: plan.planCode },
      update: plan,
      create: plan,
    });
  }
  console.log('  ✓ License plans seeded');

  // 3. Feature Flags
  const featureFlags = [
    // Core Features
    { featureKey: 'voter_management', featureName: 'Voter Management', description: 'Manage voter database and demographics', category: 'core', isGlobal: true, defaultEnabled: true },
    { featureKey: 'election_management', featureName: 'Election Management', description: 'Manage elections and candidates', category: 'core', isGlobal: true, defaultEnabled: true },
    { featureKey: 'cadre_management', featureName: 'Cadre Management', description: 'Manage party workers and volunteers', category: 'core', isGlobal: true, defaultEnabled: true },

    // Modules (Optional - Require Database Tables)
    { featureKey: 'fund_management', featureName: 'Fund Management', description: 'Manage donations, expenses, and financial accounts. Creates dedicated tables in tenant database when enabled.', category: 'modules', isGlobal: true, defaultEnabled: false },
    { featureKey: 'inventory_management', featureName: 'Inventory Management', description: 'Track inventory items, stock movements, and allocations. Creates dedicated tables in tenant database when enabled.', category: 'modules', isGlobal: true, defaultEnabled: false },
    { featureKey: 'event_management', featureName: 'Event Management', description: 'Organize and track campaign events', category: 'modules', isGlobal: true, defaultEnabled: true },
    { featureKey: 'website_builder', featureName: 'Website Builder', description: 'Build and manage campaign websites', category: 'modules', isGlobal: true, defaultEnabled: true },
    { featureKey: 'news_broadcast', featureName: 'News & Broadcast', description: 'AI-powered news analysis and broadcast management', category: 'modules', isGlobal: true, defaultEnabled: true },

    // Communication
    { featureKey: 'internal_chat', featureName: 'Internal Chat', category: 'communication', isGlobal: true, defaultEnabled: true },
    { featureKey: 'internal_notifications', featureName: 'Internal Notifications', category: 'communication', isGlobal: true, defaultEnabled: true },
    { featureKey: 'sms_integration', featureName: 'SMS Integration', category: 'communication', isGlobal: true, defaultEnabled: false },
    { featureKey: 'whatsapp_integration', featureName: 'WhatsApp Integration', category: 'communication', isGlobal: true, defaultEnabled: false },

    // AI Features
    { featureKey: 'ai_analytics', featureName: 'AI Analytics', category: 'ai', isGlobal: true, defaultEnabled: true },
    { featureKey: 'ai_speech_generator', featureName: 'AI Speech Generator', category: 'ai', isGlobal: true, defaultEnabled: true },
    { featureKey: 'ai_voter_insights', featureName: 'AI Voter Insights', category: 'ai', isGlobal: true, defaultEnabled: true },

    // Integrations
    { featureKey: 'ec_integration', featureName: 'EC Data Integration', category: 'integrations', isGlobal: true, defaultEnabled: true },
    { featureKey: 'payment_gateway', featureName: 'Payment Gateway', category: 'integrations', isGlobal: true, defaultEnabled: false },
    { featureKey: 'social_media', featureName: 'Social Media Integration', category: 'integrations', isGlobal: true, defaultEnabled: false },

    // Advanced
    { featureKey: 'poll_day_tracking', featureName: 'Poll Day Tracking', category: 'advanced', isGlobal: true, defaultEnabled: true },
    { featureKey: 'data_export', featureName: 'Data Export', category: 'advanced', isGlobal: true, defaultEnabled: true },
    { featureKey: 'custom_reports', featureName: 'Custom Reports', category: 'advanced', isGlobal: true, defaultEnabled: true },
    { featureKey: 'api_access', featureName: 'API Access', category: 'advanced', isGlobal: true, defaultEnabled: false },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { featureKey: flag.featureKey },
      update: flag,
      create: flag,
    });
  }
  console.log('  ✓ Feature flags seeded');

  // 4. Website Templates
  const websiteTemplates = [
    {
      templateCode: 'candidate_modern',
      templateName: 'Modern Candidate',
      templateType: 'INDIVIDUAL_CANDIDATE' as const,
      description: 'Clean, modern template for individual candidates',
      colorSchemes: [
        { primary: '#1890FF', secondary: '#52C41A' },
        { primary: '#722ED1', secondary: '#EB2F96' },
        { primary: '#13C2C2', secondary: '#FA8C16' },
      ],
      defaultSections: ['hero', 'about', 'manifesto', 'gallery', 'contact'],
      defaultConfig: { layout: 'single-page', animations: true },
      isPremium: false,
      sortOrder: 1,
    },
    {
      templateCode: 'party_official',
      templateName: 'Party Official',
      templateType: 'POLITICAL_PARTY' as const,
      description: 'Professional template for political parties',
      colorSchemes: [
        { primary: '#FF6B00', secondary: '#1890FF' },
        { primary: '#52C41A', secondary: '#FAAD14' },
      ],
      defaultSections: ['hero', 'leadership', 'manifesto', 'news', 'events', 'join', 'contact'],
      defaultConfig: { layout: 'multi-page', animations: true },
      isPremium: false,
      sortOrder: 2,
    },
    {
      templateCode: 'campaign_bold',
      templateName: 'Bold Campaign',
      templateType: 'CAMPAIGN' as const,
      description: 'High-impact template for campaign websites',
      colorSchemes: [
        { primary: '#F5222D', secondary: '#FAAD14' },
        { primary: '#1890FF', secondary: '#52C41A' },
      ],
      defaultSections: ['hero', 'issues', 'support', 'donate', 'volunteer', 'contact'],
      defaultConfig: { layout: 'single-page', animations: true, fullscreen: true },
      isPremium: true,
      sortOrder: 3,
    },
  ];

  for (const template of websiteTemplates) {
    await prisma.websiteTemplate.upsert({
      where: { templateCode: template.templateCode },
      update: template,
      create: template,
    });
  }
  console.log('  ✓ Website templates seeded');

  // 5. AI Providers and Features
  const aiProvider = await prisma.aIProvider.upsert({
    where: { providerName: 'openai' },
    update: {},
    create: {
      providerName: 'openai',
      apiEndpoint: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
      isActive: true,
      rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 },
      costPerToken: 0.00003,
    },
  });

  const aiFeatures = [
    {
      featureKey: 'speech_generation',
      featureName: 'Campaign Speech Generation',
      description: 'Generate campaign speeches based on topics and audience',
      modelName: 'gpt-4',
      creditsPerUse: 10,
      category: 'content',
    },
    {
      featureKey: 'voter_sentiment',
      featureName: 'Voter Sentiment Analysis',
      description: 'Analyze voter feedback and social media sentiment',
      modelName: 'gpt-3.5-turbo',
      creditsPerUse: 5,
      category: 'analytics',
    },
    {
      featureKey: 'news_summary',
      featureName: 'News Summarization',
      description: 'Summarize news articles and extract key points',
      modelName: 'gpt-3.5-turbo',
      creditsPerUse: 3,
      category: 'content',
    },
    {
      featureKey: 'booth_prediction',
      featureName: 'Booth Performance Prediction',
      description: 'Predict voting patterns based on historical data',
      modelName: 'gpt-4',
      creditsPerUse: 15,
      category: 'analytics',
    },
  ];

  for (const feature of aiFeatures) {
    await prisma.aIFeature.upsert({
      where: { featureKey: feature.featureKey },
      update: { ...feature, providerId: aiProvider.id },
      create: { ...feature, providerId: aiProvider.id },
    });
  }
  console.log('  ✓ AI configuration seeded');

  // 6. AI Credit Packages
  const creditPackages = [
    { packageName: 'Starter Pack', credits: 500, price: 499, bonusCredits: 0, validityDays: 365, sortOrder: 1 },
    { packageName: 'Standard Pack', credits: 2000, price: 1499, bonusCredits: 200, validityDays: 365, sortOrder: 2 },
    { packageName: 'Premium Pack', credits: 5000, price: 2999, bonusCredits: 1000, validityDays: 365, sortOrder: 3 },
    { packageName: 'Enterprise Pack', credits: 20000, price: 9999, bonusCredits: 5000, validityDays: 365, sortOrder: 4 },
  ];

  for (const pkg of creditPackages) {
    await prisma.aICreditPackage.upsert({
      where: { id: pkg.packageName },
      update: pkg,
      create: pkg,
    });
  }
  console.log('  ✓ AI credit packages seeded');

  // 7. Super Admin User
  const hashedPassword = await bcrypt.hash('SuperAdmin@123', 12);

  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@electioncaffe.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@electioncaffe.com',
      mobile: '9999999999',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });
  console.log('  ✓ Super admin user seeded');

  console.log('\n✅ ElectionCaffeCore database seeding completed!');
  console.log('\n📋 Summary:');
  console.log('  - Super Admin: superadmin@electioncaffe.com / SuperAdmin@123');
  console.log('  - License Plans: free, starter, professional, enterprise');
  console.log('  - Feature Flags: 22 features across 6 categories');
  console.log('  - Website Templates: 3 templates');
  console.log('  - AI Features: 4 features configured');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
