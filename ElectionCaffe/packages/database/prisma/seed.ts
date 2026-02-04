import { PrismaClient, UserRole, ElectionType, ElectionStatus, Gender, PartType, CadreRole, SchemeProvider, SchemeValueType, FeedbackStatus, FeedbackPriority, PoliticalLeaning, InfluenceLevel, VulnerabilityType, AssignmentType, RelationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  INDIAN_STATES,
  RELIGIONS,
  STATE_CASTE_CATEGORIES,
  STATE_CASTES,
  STATE_LANGUAGES,
  POLITICAL_PARTIES,
  GOVERNMENT_SCHEMES,
  VOTER_CATEGORIES,
  SAMPLE_CONSTITUENCIES,
  INDIAN_FIRST_NAMES,
  INDIAN_LAST_NAMES,
  FEEDBACK_CATEGORIES,
  CASTE_CATEGORIES,
} from './seed-data/india-master-data';

const prisma = new PrismaClient();

// Helper functions
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMobile(): string {
  const prefixes = ['98', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85', '84', '83', '82', '81', '80', '79', '78', '77', '76', '75', '74', '73', '72', '70'];
  return getRandomItem(prefixes) + getRandomNumber(10000000, 99999999).toString();
}

function generateEpicNumber(stateCode: string): string {
  return `${stateCode}/${getRandomNumber(100, 999)}/${getRandomNumber(100000, 999999)}`;
}

function generateDateOfBirth(minAge: number = 18, maxAge: number = 80): Date {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - getRandomNumber(minAge, maxAge);
  return new Date(birthYear, getRandomNumber(0, 11), getRandomNumber(1, 28));
}

// Default Feature Flags for the platform
const DEFAULT_FEATURE_FLAGS = [
  // Core Features
  { featureKey: 'voter_management', featureName: 'Voter Management', description: 'Manage voter data and profiles', category: 'core', isGlobal: true, defaultEnabled: true },
  { featureKey: 'election_management', featureName: 'Election Management', description: 'Create and manage elections', category: 'core', isGlobal: true, defaultEnabled: true },
  { featureKey: 'part_management', featureName: 'Part/Booth Management', description: 'Manage polling parts and booths', category: 'core', isGlobal: true, defaultEnabled: true },
  { featureKey: 'section_management', featureName: 'Section Management', description: 'Manage voting sections', category: 'core', isGlobal: true, defaultEnabled: true },
  { featureKey: 'family_management', featureName: 'Family Management', description: 'Group voters into families', category: 'core', isGlobal: true, defaultEnabled: true },

  // Cadre & Field Operations
  { featureKey: 'cadre_management', featureName: 'Cadre Management', description: 'Manage campaign cadres and volunteers', category: 'cadre', isGlobal: true, defaultEnabled: true },
  { featureKey: 'cadre_assignment', featureName: 'Cadre Assignment', description: 'Assign cadres to parts/booths', category: 'cadre', isGlobal: true, defaultEnabled: true },
  { featureKey: 'cadre_tracking', featureName: 'Cadre Live Tracking', description: 'Real-time GPS tracking of cadres', category: 'cadre', isGlobal: true, defaultEnabled: false },
  { featureKey: 'cadre_attendance', featureName: 'Cadre Attendance', description: 'Track cadre attendance and check-ins', category: 'cadre', isGlobal: true, defaultEnabled: true },

  // Poll Day Features
  { featureKey: 'poll_day_voting', featureName: 'Poll Day Voting', description: 'Mark votes on poll day', category: 'poll_day', isGlobal: true, defaultEnabled: true },
  { featureKey: 'poll_day_turnout', featureName: 'Real-time Turnout', description: 'Live turnout tracking', category: 'poll_day', isGlobal: true, defaultEnabled: true },
  { featureKey: 'poll_day_hourly', featureName: 'Hourly Turnout Reports', description: 'Hourly turnout snapshots', category: 'poll_day', isGlobal: true, defaultEnabled: true },
  { featureKey: 'poll_day_queue', featureName: 'Queue Management', description: 'Manage booth queues', category: 'poll_day', isGlobal: true, defaultEnabled: false },

  // Analytics & Reports
  { featureKey: 'analytics_dashboard', featureName: 'Analytics Dashboard', description: 'View election analytics', category: 'analytics', isGlobal: true, defaultEnabled: true },
  { featureKey: 'analytics_demographics', featureName: 'Demographics Analytics', description: 'Voter demographics analysis', category: 'analytics', isGlobal: true, defaultEnabled: true },
  { featureKey: 'analytics_caste', featureName: 'Caste Analytics', description: 'Caste-wise voter analysis', category: 'analytics', isGlobal: true, defaultEnabled: true },
  { featureKey: 'analytics_party', featureName: 'Party Analytics', description: 'Party affiliation analysis', category: 'analytics', isGlobal: true, defaultEnabled: true },
  { featureKey: 'reports_pdf', featureName: 'PDF Reports', description: 'Generate PDF reports', category: 'reports', isGlobal: true, defaultEnabled: true },
  { featureKey: 'reports_excel', featureName: 'Excel Reports', description: 'Generate Excel reports', category: 'reports', isGlobal: true, defaultEnabled: true },

  // AI Features
  { featureKey: 'ai_sentiment', featureName: 'AI Sentiment Analysis', description: 'AI-powered voter sentiment analysis', category: 'ai', isGlobal: true, defaultEnabled: false },
  { featureKey: 'ai_prediction', featureName: 'AI Turnout Prediction', description: 'AI-powered turnout predictions', category: 'ai', isGlobal: true, defaultEnabled: false },
  { featureKey: 'ai_swing_voters', featureName: 'AI Swing Voter Analysis', description: 'Identify swing voters using AI', category: 'ai', isGlobal: true, defaultEnabled: false },
  { featureKey: 'ai_chatbot', featureName: 'AI Chatbot', description: 'AI assistant for queries', category: 'ai', isGlobal: true, defaultEnabled: false },

  // Communication
  { featureKey: 'sms_campaign', featureName: 'SMS Campaigns', description: 'Send SMS to voters', category: 'communication', isGlobal: true, defaultEnabled: false },
  { featureKey: 'whatsapp_campaign', featureName: 'WhatsApp Campaigns', description: 'Send WhatsApp messages', category: 'communication', isGlobal: true, defaultEnabled: false },
  { featureKey: 'voter_slip_generation', featureName: 'Voter Slip Generation', description: 'Generate voter slips', category: 'communication', isGlobal: true, defaultEnabled: true },
  { featureKey: 'bulk_slip_printing', featureName: 'Bulk Slip Printing', description: 'Print voter slips in bulk', category: 'communication', isGlobal: true, defaultEnabled: true },

  // Survey & Feedback
  { featureKey: 'surveys', featureName: 'Surveys', description: 'Create and manage voter surveys', category: 'engagement', isGlobal: true, defaultEnabled: true },
  { featureKey: 'feedback_issues', featureName: 'Feedback Issues', description: 'Collect voter feedback and issues', category: 'engagement', isGlobal: true, defaultEnabled: true },
  { featureKey: 'grievance_tracking', featureName: 'Grievance Tracking', description: 'Track and resolve voter grievances', category: 'engagement', isGlobal: true, defaultEnabled: false },

  // Multi-Constituency (Political Party specific)
  { featureKey: 'multi_constituency', featureName: 'Multi-Constituency', description: 'Manage multiple constituencies', category: 'advanced', isGlobal: false, defaultEnabled: false },
  { featureKey: 'central_dashboard', featureName: 'Central Dashboard', description: 'Central party-level dashboard', category: 'advanced', isGlobal: false, defaultEnabled: false },
  { featureKey: 'constituency_comparison', featureName: 'Constituency Comparison', description: 'Compare constituency performance', category: 'advanced', isGlobal: false, defaultEnabled: false },

  // Data Import/Export
  { featureKey: 'bulk_import', featureName: 'Bulk Data Import', description: 'Import voters/parts from Excel/CSV', category: 'data', isGlobal: true, defaultEnabled: true },
  { featureKey: 'bulk_export', featureName: 'Bulk Data Export', description: 'Export data to Excel/CSV', category: 'data', isGlobal: true, defaultEnabled: true },
  { featureKey: 'api_access', featureName: 'API Access', description: 'External API access', category: 'data', isGlobal: true, defaultEnabled: false },

  // Integrations
  { featureKey: 'datacaffe_integration', featureName: 'DataCaffe Integration', description: 'Integrate with DataCaffe analytics', category: 'integration', isGlobal: true, defaultEnabled: false },
  { featureKey: 'maps_integration', featureName: 'Maps Integration', description: 'Google/OpenStreetMap integration', category: 'integration', isGlobal: true, defaultEnabled: true },
  { featureKey: 'sms_gateway', featureName: 'SMS Gateway', description: 'SMS gateway integration', category: 'integration', isGlobal: true, defaultEnabled: false },

  // Security
  { featureKey: 'two_factor_auth', featureName: 'Two-Factor Authentication', description: 'Enable 2FA for users', category: 'security', isGlobal: true, defaultEnabled: false },
  { featureKey: 'audit_logs', featureName: 'Audit Logs', description: 'Track all system changes', category: 'security', isGlobal: true, defaultEnabled: true },
  { featureKey: 'data_encryption', featureName: 'Data Encryption', description: 'Encrypt sensitive data', category: 'security', isGlobal: true, defaultEnabled: true },
];

async function main() {
  console.log('🌱 Starting comprehensive database seed...');
  console.log('📍 This will create sample data for multiple Indian states\n');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@123', 10);

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
  console.log(`  📧 Email: superadmin@electioncaffe.com`);
  console.log(`  🔑 Password: SuperAdmin@123`);

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
  console.log(`  ✅ Created additional Super Admin: admin@electioncaffe.com\n`);

  // ========== Create Feature Flags ==========
  console.log('🚩 Creating feature flags...');

  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { featureKey: flag.featureKey },
      update: {},
      create: flag,
    });
  }
  console.log(`  ✅ Created ${DEFAULT_FEATURE_FLAGS.length} feature flags`);

  // ========== Create Sample Tenants for Different States ==========
  console.log('🏢 Creating tenants...');

  const sampleTenants = [
    { name: 'Tamil Nadu BJP', slug: 'tn-bjp', state: 'Tamil Nadu', defaultConstituency: 'Karaikudi' },
    { name: 'Karnataka BJP', slug: 'ka-bjp', state: 'Karnataka', defaultConstituency: 'Bangalore South' },
    { name: 'Maharashtra BJP', slug: 'mh-bjp', state: 'Maharashtra', defaultConstituency: 'Mumbai South' },
    { name: 'Gujarat BJP', slug: 'gj-bjp', state: 'Gujarat', defaultConstituency: 'Ahmedabad East' },
    { name: 'Uttar Pradesh BJP', slug: 'up-bjp', state: 'Uttar Pradesh', defaultConstituency: 'Lucknow' },
    { name: 'Andhra Pradesh TDP', slug: 'ap-tdp', state: 'Andhra Pradesh', defaultConstituency: 'Vijayawada' },
    { name: 'West Bengal BJP', slug: 'wb-bjp', state: 'West Bengal', defaultConstituency: 'Kolkata North' },
    { name: 'Kerala BJP', slug: 'kl-bjp', state: 'Kerala', defaultConstituency: 'Thiruvananthapuram' },
  ];

  const tenants: Record<string, any> = {};
  const tenantConstituencies: Record<string, string> = {};

  for (const t of sampleTenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        name: t.name,
        slug: t.slug,
        tenantType: 'POLITICAL_PARTY',
        organizationName: `${t.name} Campaign Office`,
        state: t.state,
        primaryColor: '#FF9933',
        subscriptionPlan: 'premium',
        maxVoters: 500000,
        maxCadres: 1000,
        maxElections: 20,
        status: 'ACTIVE',
        databaseType: 'SHARED',
        databaseStatus: 'READY',
      },
    });
    tenants[t.state] = tenant;
    tenantConstituencies[t.state] = t.defaultConstituency;
    console.log(`  ✅ Created tenant: ${tenant.name}`);
  }

  // ========== Create Admin Users ==========
  console.log('\n👤 Creating users...');

  const users: Record<string, any> = {};
  let mobileCounter = 9876543210;

  for (const [state, tenant] of Object.entries(tenants)) {
    const adminUser = await prisma.user.upsert({
      where: { tenantId_mobile: { tenantId: tenant.id, mobile: mobileCounter.toString() } },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: 'Admin',
        lastName: state.split(' ')[0],
        email: `admin.${tenant.slug.replace(/-/g, '.')}@electioncaffe.com`,
        mobile: mobileCounter.toString(),
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        permissions: ['all'],
      },
    });
    users[state] = adminUser;
    mobileCounter++;
    console.log(`  ✅ Created admin: ${adminUser.email}`);

    // Create campaign managers
    for (let i = 1; i <= 3; i++) {
      await prisma.user.upsert({
        where: { tenantId_mobile: { tenantId: tenant.id, mobile: (mobileCounter + i).toString() } },
        update: {},
        create: {
          tenantId: tenant.id,
          firstName: getRandomItem(INDIAN_FIRST_NAMES.male),
          lastName: getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default),
          email: `campaign${i}.${tenant.slug.replace(/-/g, '.')}@electioncaffe.com`,
          mobile: (mobileCounter + i).toString(),
          passwordHash,
          role: i === 1 ? UserRole.CAMPAIGN_MANAGER : UserRole.COORDINATOR,
        },
      });
    }
    mobileCounter += 10;
  }

  // ========== Create Elections ==========
  console.log('\n🗳️ Creating elections...');

  const elections: Record<string, any> = {};
  const currentYear = new Date().getFullYear();

  for (const [state, tenant] of Object.entries(tenants)) {
    const stateInfo = INDIAN_STATES.find(s => s.name === state);
    if (!stateInfo) continue;

    const constituencyName = tenantConstituencies[state];

    // Assembly Election
    const assemblyElection = await prisma.election.upsert({
      where: { id: `election-${currentYear}-assembly-${stateInfo.code.toLowerCase()}` },
      update: {},
      create: {
        id: `election-${currentYear}-assembly-${stateInfo.code.toLowerCase()}`,
        tenantId: tenant.id,
        name: `${state} Assembly Election ${currentYear}`,
        nameLocal: `${state} विधानसभा चुनाव ${currentYear}`,
        electionType: ElectionType.ASSEMBLY,
        state: state,
        constituency: constituencyName,
        district: constituencyName,
        candidateName: `${getRandomItem(INDIAN_FIRST_NAMES.male)} ${getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default)}`,
        status: ElectionStatus.ACTIVE,
        pollDate: new Date(currentYear, getRandomNumber(3, 11), getRandomNumber(1, 28)),
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
      },
    });
    elections[state] = assemblyElection;
    console.log(`  ✅ Created election: ${assemblyElection.name}`);

    // Parliament Election
    await prisma.election.upsert({
      where: { id: `election-${currentYear}-parliament-${stateInfo.code.toLowerCase()}` },
      update: {},
      create: {
        id: `election-${currentYear}-parliament-${stateInfo.code.toLowerCase()}`,
        tenantId: tenant.id,
        name: `${state} Lok Sabha Election ${currentYear}`,
        nameLocal: `${state} लोकसभा चुनाव ${currentYear}`,
        electionType: ElectionType.PARLIAMENT,
        state: state,
        constituency: constituencyName,
        district: constituencyName,
        candidateName: `${getRandomItem(INDIAN_FIRST_NAMES.male)} ${getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default)}`,
        status: ElectionStatus.ACTIVE,
        pollDate: new Date(currentYear, 4, getRandomNumber(1, 28)),
        startDate: new Date(currentYear, 3, 1),
        endDate: new Date(currentYear, 5, 30),
      },
    });

    // Local Body Election
    await prisma.election.upsert({
      where: { id: `election-${currentYear}-localbody-${stateInfo.code.toLowerCase()}` },
      update: {},
      create: {
        id: `election-${currentYear}-localbody-${stateInfo.code.toLowerCase()}`,
        tenantId: tenant.id,
        name: `${state} Local Body Election ${currentYear}`,
        electionType: ElectionType.LOCAL_BODY,
        state: state,
        constituency: constituencyName,
        district: constituencyName,
        status: ElectionStatus.DRAFT,
        pollDate: new Date(currentYear, 9, getRandomNumber(1, 28)),
        startDate: new Date(currentYear, 8, 1),
        endDate: new Date(currentYear, 10, 30),
      },
    });
  }

  // ========== Create Master Data for Each Election ==========
  console.log('\n📊 Creating master data...');

  for (const [state, election] of Object.entries(elections)) {
    console.log(`\n  📍 ${state}:`);

    // Religions
    for (const [index, rel] of RELIGIONS.entries()) {
      await prisma.religion.upsert({
        where: { electionId_religionName: { electionId: election.id, religionName: rel.name } },
        update: {},
        create: {
          electionId: election.id,
          religionName: rel.name,
          religionNameLocal: rel.nameLocal,
          religionColor: rel.color,
          displayOrder: index + 1,
        },
      });
    }
    console.log(`    ✅ Created ${RELIGIONS.length} religions`);

    // Caste Categories - Use state-specific if available
    const stateCasteCategories = STATE_CASTE_CATEGORIES[state] || CASTE_CATEGORIES.map(c => ({ name: c.name, fullName: c.fullName, reservationPercent: c.reservationPercent }));
    const createdCategories: Record<string, any> = {};

    for (const [index, cat] of stateCasteCategories.entries()) {
      const created = await prisma.casteCategory.upsert({
        where: { electionId_categoryName: { electionId: election.id, categoryName: cat.name } },
        update: {},
        create: {
          electionId: election.id,
          categoryName: cat.name,
          categoryFullName: cat.fullName,
          reservationPercent: cat.reservationPercent || null,
          displayOrder: index + 1,
        },
      });
      createdCategories[cat.name] = created;
    }
    console.log(`    ✅ Created ${stateCasteCategories.length} caste categories`);

    // Get Hindu religion for caste association
    const hinduReligion = await prisma.religion.findFirst({
      where: { electionId: election.id, religionName: 'Hindu' }
    });

    // Castes - Use state-specific if available
    const stateCastes = STATE_CASTES[state] || [];
    const createdCastes: Record<string, any> = {};

    for (const [index, caste] of stateCastes.entries()) {
      const category = createdCategories[caste.category];
      if (category) {
        const created = await prisma.caste.upsert({
          where: { electionId_casteName: { electionId: election.id, casteName: caste.name } },
          update: {},
          create: {
            electionId: election.id,
            casteCategoryId: category.id,
            religionId: hinduReligion?.id,
            casteName: caste.name,
            casteNameLocal: caste.nameLocal,
            displayOrder: index + 1,
          },
        });
        createdCastes[caste.name] = created;

        // Create sub-castes if available
        if (caste.subCastes) {
          for (const [subIndex, subCasteName] of caste.subCastes.entries()) {
            await prisma.subCaste.upsert({
              where: { electionId_subCasteName: { electionId: election.id, subCasteName } },
              update: {},
              create: {
                electionId: election.id,
                casteId: created.id,
                subCasteName,
                subCasteNameLocal: subCasteName,
                displayOrder: subIndex + 1,
              },
            });
          }
        }
      }
    }
    console.log(`    ✅ Created ${stateCastes.length} castes with sub-castes`);

    // Languages - Use state-specific
    const stateLanguages = STATE_LANGUAGES[state] || [{ name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' }];

    for (const [index, lang] of stateLanguages.entries()) {
      await prisma.language.upsert({
        where: { electionId_languageName: { electionId: election.id, languageName: lang.name } },
        update: {},
        create: {
          electionId: election.id,
          languageName: lang.name,
          languageNameLocal: lang.nameLocal,
          languageCode: lang.code,
          script: lang.script,
          writingDirection: lang.direction || 'ltr',
          displayOrder: index + 1,
        },
      });
    }
    console.log(`    ✅ Created ${stateLanguages.length} languages`);

    // Political Parties
    const stateParties = POLITICAL_PARTIES.filter(p => p.isNational || p.state === state || !p.state);

    for (const [index, party] of stateParties.entries()) {
      await prisma.party.upsert({
        where: { id: `party-${party.shortName.toLowerCase()}-${election.id}` },
        update: {},
        create: {
          id: `party-${party.shortName.toLowerCase()}-${election.id}`,
          electionId: election.id,
          allianceName: party.alliance || null,
          partyName: party.name,
          partyShortName: party.shortName,
          partyFullName: party.name,
          partyColor: party.color,
          isDefault: party.shortName === 'BJP',
          isNeutral: party.isNeutral || false,
          displayOrder: index + 1,
        },
      });
    }
    console.log(`    ✅ Created ${stateParties.length} parties`);

    // Government Schemes
    const stateSchemes = GOVERNMENT_SCHEMES.filter(s => !s.state || s.state === state);

    for (const scheme of stateSchemes) {
      await prisma.scheme.upsert({
        where: { id: `scheme-${scheme.shortName.toLowerCase()}-${election.id}` },
        update: {},
        create: {
          id: `scheme-${scheme.shortName.toLowerCase()}-${election.id}`,
          electionId: election.id,
          schemeName: scheme.name,
          schemeShortName: scheme.shortName,
          schemeDescription: `${scheme.name} - ${scheme.category}`,
          schemeBy: scheme.provider === 'UNION_GOVT' ? SchemeProvider.UNION_GOVT : SchemeProvider.STATE_GOVT,
          schemeValue: scheme.value || 0,
          valueType: (scheme.valueType as SchemeValueType) || SchemeValueType.ONE_TIME,
          category: scheme.category,
        },
      });
    }
    console.log(`    ✅ Created ${stateSchemes.length} schemes`);

    // Voter Categories
    for (const [index, cat] of VOTER_CATEGORIES.entries()) {
      await prisma.voterCategory.upsert({
        where: { electionId_categoryName: { electionId: election.id, categoryName: cat.name } },
        update: {},
        create: {
          electionId: election.id,
          categoryName: cat.name,
          categoryNameLocal: cat.nameLocal,
          categoryDescription: cat.description,
          categoryColor: cat.color,
          iconType: cat.icon,
          isSystem: true,
          displayOrder: index + 1,
        },
      });
    }
    console.log(`    ✅ Created ${VOTER_CATEGORIES.length} voter categories`);

    // Voting History
    const historyYears = [currentYear - 5, currentYear - 4, currentYear - 3];
    const historyTypes = [
      { type: 'Assembly', badge: 'V', color: '#52C41A' },
      { type: 'Parliament', badge: 'L', color: '#1890FF' },
      { type: 'Local Body', badge: 'M', color: '#FAAD14' },
    ];

    for (const year of historyYears) {
      for (const ht of historyTypes) {
        await prisma.votingHistory.upsert({
          where: { id: `history-${ht.type.toLowerCase().replace(' ', '-')}-${year}-${election.id}` },
          update: {},
          create: {
            id: `history-${ht.type.toLowerCase().replace(' ', '-')}-${year}-${election.id}`,
            electionId: election.id,
            historyName: `${state} ${ht.type} ${year}`,
            electionType: ht.type,
            electionYear: year,
            badgeText: ht.badge,
            badgeColor: ht.color,
          },
        });
      }
    }
    console.log(`    ✅ Created ${historyYears.length * historyTypes.length} voting history records`);
  }

  // ========== Create Parts/Booths, Sections, and Voters ==========
  console.log('\n🏛️ Creating parts, sections, and voters...');

  for (const [state, election] of Object.entries(elections)) {
    const stateInfo = INDIAN_STATES.find(s => s.name === state);
    if (!stateInfo) continue;

    console.log(`\n  📍 ${state}:`);

    // Get all master data for this election
    const allReligions = await prisma.religion.findMany({ where: { electionId: election.id } });
    const allCastes = await prisma.caste.findMany({ where: { electionId: election.id }, include: { casteCategory: true } });
    const allLanguages = await prisma.language.findMany({ where: { electionId: election.id } });
    const allVoterCategories = await prisma.voterCategory.findMany({ where: { electionId: election.id } });
    const allParties = await prisma.party.findMany({ where: { electionId: election.id } });
    const allSchemes = await prisma.scheme.findMany({ where: { electionId: election.id } });

    // Create 20 parts per election
    const numParts = 20;
    const partsCreated: any[] = [];

    for (let partNum = 1; partNum <= numParts; partNum++) {
      const partType = partNum <= 10 ? PartType.URBAN : PartType.RURAL;
      const isVulnerable = partNum % 5 === 0;
      const vulnerabilityTypes = [VulnerabilityType.NOT_ASSIGNED, VulnerabilityType.CRITICAL, VulnerabilityType.COMMUNAL, VulnerabilityType.POLITICAL];

      const part = await prisma.part.upsert({
        where: { electionId_partNumber: { electionId: election.id, partNumber: partNum } },
        update: {},
        create: {
          electionId: election.id,
          partNumber: partNum,
          boothName: `${partType === PartType.URBAN ? 'Government School' : 'Village Panchayat'} Part ${partNum}, ${state}`,
          boothNameLocal: `${partType === PartType.URBAN ? 'सरकारी स्कूल' : 'गांव पंचायत'} भाग ${partNum}`,
          partType,
          address: `Ward ${partNum}, ${election.constituency}`,
          latitude: 10 + Math.random() * 20,
          longitude: 72 + Math.random() * 15,
          totalVoters: 0,
          isVulnerable,
          vulnerability: isVulnerable ? getRandomItem(vulnerabilityTypes) : VulnerabilityType.NOT_ASSIGNED,
          vulnerabilityNotes: isVulnerable ? 'Requires additional security measures' : null,
        },
      });
      partsCreated.push(part);

      // Create 4 sections per part
      for (let secNum = 1; secNum <= 4; secNum++) {
        await prisma.section.upsert({
          where: { partId_sectionNumber: { partId: part.id, sectionNumber: secNum } },
          update: {},
          create: {
            electionId: election.id,
            partId: part.id,
            sectionNumber: secNum,
            sectionName: `Section ${secNum} - ${part.boothName}`,
            sectionNameLocal: `खंड ${secNum}`,
            isOverseas: secNum === 4 && partNum === 1,
          },
        });
      }

      // Create 2 booths per part
      for (let boothNum = 1; boothNum <= 2; boothNum++) {
        const actualBoothNum = (partNum - 1) * 2 + boothNum;
        await prisma.booth.upsert({
          where: { electionId_boothNumber: { electionId: election.id, boothNumber: actualBoothNum } },
          update: {},
          create: {
            electionId: election.id,
            partId: part.id,
            boothNumber: actualBoothNum,
            boothName: `Booth ${actualBoothNum} - ${part.boothName}`,
            boothNameLocal: `बूथ ${actualBoothNum}`,
            latitude: part.latitude! + (Math.random() - 0.5) * 0.01,
            longitude: part.longitude! + (Math.random() - 0.5) * 0.01,
          },
        });
      }
    }
    console.log(`    ✅ Created ${numParts} parts with ${numParts * 4} sections and ${numParts * 2} booths`);

    // Create voters (50 per part = 1000 total per election)
    const votersPerPart = 50;
    let totalVotersCreated = 0;

    for (const part of partsCreated) {
      const sections = await prisma.section.findMany({ where: { partId: part.id } });
      const booths = await prisma.booth.findMany({ where: { partId: part.id } });

      // Create families first (10 per part)
      const families: any[] = [];
      for (let f = 1; f <= 10; f++) {
        const family = await prisma.family.create({
          data: {
            electionId: election.id,
            familyName: `${getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default)} Family`,
            houseNumber: `${part.partNumber}/${f}`,
            address: `House ${f}, ${part.boothName}`,
            latitude: part.latitude! + (Math.random() - 0.5) * 0.005,
            longitude: part.longitude! + (Math.random() - 0.5) * 0.005,
          },
        });
        families.push(family);
      }

      // Create voters
      for (let v = 1; v <= votersPerPart; v++) {
        const gender = v % 3 === 0 ? Gender.FEMALE : (v % 10 === 0 ? Gender.TRANSGENDER : Gender.MALE);
        const firstName = gender === Gender.MALE
          ? getRandomItem(INDIAN_FIRST_NAMES.male)
          : getRandomItem(INDIAN_FIRST_NAMES.female);
        const lastName = getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default);
        const age = getRandomNumber(18, 85);
        const family = getRandomItem(families);
        const section = getRandomItem(sections);
        const booth = getRandomItem(booths);
        const caste = allCastes.length > 0 ? getRandomItem(allCastes) : null;
        const religion = allReligions.length > 0 ? getRandomItem(allReligions) : null;
        const language = allLanguages.length > 0 ? getRandomItem(allLanguages) : null;
        const voterCategory = allVoterCategories.length > 0 ? getRandomItem(allVoterCategories) : null;
        const party = allParties.length > 0 ? getRandomItem(allParties) : null;

        const politicalLeanings = [PoliticalLeaning.LOYAL, PoliticalLeaning.SWING, PoliticalLeaning.OPPOSITION, PoliticalLeaning.UNKNOWN];
        const influenceLevels = [InfluenceLevel.HIGH, InfluenceLevel.MEDIUM, InfluenceLevel.LOW, InfluenceLevel.NONE];
        const relationTypes = [RelationType.FATHER, RelationType.MOTHER, RelationType.HUSBAND, RelationType.WIFE];

        const voter = await prisma.voter.create({
          data: {
            electionId: election.id,
            partId: part.id,
            sectionId: section.id,
            boothId: booth.id,
            familyId: v % 5 === 1 ? family.id : (v % 5 <= 4 ? family.id : null),
            epicNumber: generateEpicNumber(stateInfo.code),
            slNumber: v,
            name: `${firstName} ${lastName}`,
            gender,
            age,
            dateOfBirth: generateDateOfBirth(age, age),
            mobile: v % 3 === 0 ? generateMobile() : null,
            houseNumber: family.houseNumber,
            address: `${family.houseNumber}, ${part.boothName}`,
            religionId: religion?.id,
            casteCategoryId: caste?.casteCategoryId,
            casteId: caste?.id,
            languageId: language?.id,
            voterCategoryId: voterCategory?.id,
            partyId: party?.id,
            politicalLeaning: getRandomItem(politicalLeanings),
            influenceLevel: getRandomItem(influenceLevels),
            isFamilyCaptain: v % 5 === 1,
            relationType: gender === Gender.FEMALE ? (age > 40 ? RelationType.MOTHER : RelationType.WIFE) : (age > 40 ? RelationType.FATHER : null),
            profession: getRandomItem(['Farmer', 'Teacher', 'Business', 'Government Employee', 'Private Employee', 'Homemaker', 'Student', 'Retired', 'Daily Wage Worker', 'Self-employed']),
            education: getRandomItem(['Illiterate', 'Primary', 'Middle', 'High School', 'Higher Secondary', 'Graduate', 'Post Graduate', 'Professional']),
            isDead: v === votersPerPart && part.partNumber === 1,
            isShifted: v === votersPerPart - 1 && part.partNumber === 1,
            isDoubleEntry: v === votersPerPart - 2 && part.partNumber === 1,
          },
        });

        // Assign schemes to some voters
        if (v % 10 === 0 && allSchemes.length > 0) {
          const scheme = getRandomItem(allSchemes);
          await prisma.voterScheme.create({
            data: {
              voterId: voter.id,
              schemeId: scheme.id,
              isBeneficiary: true,
              enrollmentDate: new Date(currentYear - 1, getRandomNumber(0, 11), getRandomNumber(1, 28)),
            },
          });
        }

        totalVotersCreated++;
      }

      // Update part voter count
      await prisma.part.update({
        where: { id: part.id },
        data: {
          totalVoters: votersPerPart,
          maleVoters: Math.floor(votersPerPart * 0.52),
          femaleVoters: Math.floor(votersPerPart * 0.45),
          otherVoters: Math.floor(votersPerPart * 0.03),
          totalSections: 4,
        },
      });

      // Update family member counts
      for (const family of families) {
        const memberCount = await prisma.voter.count({ where: { familyId: family.id } });
        await prisma.family.update({
          where: { id: family.id },
          data: { totalMembers: memberCount },
        });
      }
    }
    console.log(`    ✅ Created ${totalVotersCreated} voters with families`);

    // Update election statistics
    const voterStats = await prisma.voter.groupBy({
      by: ['gender'],
      where: { electionId: election.id },
      _count: true,
    });

    const totalVoters = voterStats.reduce((sum, v) => sum + v._count, 0);
    const maleVoters = voterStats.find(v => v.gender === Gender.MALE)?._count || 0;
    const femaleVoters = voterStats.find(v => v.gender === Gender.FEMALE)?._count || 0;
    const otherVoters = voterStats.find(v => v.gender === Gender.TRANSGENDER)?._count || 0;

    await prisma.election.update({
      where: { id: election.id },
      data: {
        totalVoters,
        totalMaleVoters: maleVoters,
        totalFemaleVoters: femaleVoters,
        totalOtherVoters: otherVoters,
        totalParts: numParts,
        totalBooths: numParts * 2,
      },
    });
    console.log(`    ✅ Updated election statistics`);
  }

  // ========== Create Cadres ==========
  console.log('\n👷 Creating cadres...');

  for (const [state, election] of Object.entries(elections)) {
    const parts = await prisma.part.findMany({ where: { electionId: election.id }, take: 5 });
    const cadreRoles = [CadreRole.COORDINATOR, CadreRole.BOOTH_INCHARGE, CadreRole.VOLUNTEER, CadreRole.AGENT];

    for (let i = 1; i <= 20; i++) {
      const gender = i % 4 === 0 ? 'female' : 'male';
      const firstName = getRandomItem(gender === 'male' ? INDIAN_FIRST_NAMES.male : INDIAN_FIRST_NAMES.female);
      const lastName = getRandomItem(INDIAN_LAST_NAMES[state] || INDIAN_LAST_NAMES.default);
      const mobile = generateMobile();

      const cadre = await prisma.cadre.upsert({
        where: { electionId_mobile: { electionId: election.id, mobile } },
        update: {},
        create: {
          electionId: election.id,
          name: `${firstName} ${lastName}`,
          mobile,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          role: getRandomItem(cadreRoles),
          votersUpdated: getRandomNumber(50, 500),
          surveysCompleted: getRandomNumber(10, 100),
          votesMarked: getRandomNumber(20, 200),
        },
      });

      // Assign cadre to parts
      if (parts.length > 0) {
        const assignedPart = parts[i % parts.length];
        await prisma.cadreAssignment.upsert({
          where: { cadreId_partId: { cadreId: cadre.id, partId: assignedPart.id } },
          update: {},
          create: {
            cadreId: cadre.id,
            partId: assignedPart.id,
            assignmentType: i <= 5 ? AssignmentType.PRIMARY : AssignmentType.SECONDARY,
          },
        });
      }
    }
    console.log(`  ✅ Created 20 cadres for ${state}`);
  }

  // ========== Create Surveys ==========
  console.log('\n📝 Creating surveys...');

  for (const [state, election] of Object.entries(elections)) {
    const surveys = [
      {
        name: 'Voter Sentiment Survey',
        description: 'Survey to understand voter sentiments and preferences',
        questions: [
          { id: '1', question: 'How satisfied are you with the current government?', type: 'scale', options: ['1', '2', '3', '4', '5'] },
          { id: '2', question: 'Which issues are most important to you?', type: 'checkbox', options: ['Healthcare', 'Education', 'Employment', 'Roads', 'Water', 'Electricity'] },
          { id: '3', question: 'Will you vote in the upcoming election?', type: 'radio', options: ['Yes', 'No', 'Maybe'] },
          { id: '4', question: 'Any suggestions for improvement?', type: 'text' },
        ],
      },
      {
        name: 'Beneficiary Verification Survey',
        description: 'Survey to verify scheme beneficiaries',
        questions: [
          { id: '1', question: 'Have you received benefits from any government scheme?', type: 'radio', options: ['Yes', 'No'] },
          { id: '2', question: 'Which schemes have you benefited from?', type: 'checkbox', options: ['PM Kisan', 'PMAY', 'Ujjwala', 'Ayushman Bharat', 'State Schemes'] },
          { id: '3', question: 'Rate your satisfaction with the scheme delivery', type: 'scale', options: ['1', '2', '3', '4', '5'] },
        ],
      },
    ];

    for (const survey of surveys) {
      await prisma.survey.upsert({
        where: { id: `survey-${survey.name.toLowerCase().replace(/ /g, '-')}-${election.id}` },
        update: {},
        create: {
          id: `survey-${survey.name.toLowerCase().replace(/ /g, '-')}-${election.id}`,
          electionId: election.id,
          surveyName: survey.name,
          description: survey.description,
          questions: survey.questions,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(new Date().getFullYear(), 11, 31),
        },
      });
    }
    console.log(`  ✅ Created surveys for ${state}`);
  }

  // ========== Create Feedback Issues ==========
  console.log('\n📣 Creating feedback issues...');

  for (const [state, election] of Object.entries(elections)) {
    const parts = await prisma.part.findMany({ where: { electionId: election.id }, take: 10 });

    for (let i = 0; i < 15; i++) {
      const category = getRandomItem(FEEDBACK_CATEGORIES);
      const subCategory = getRandomItem(category.subCategories);
      const part = getRandomItem(parts);
      const statuses = [FeedbackStatus.OPEN, FeedbackStatus.IN_PROGRESS, FeedbackStatus.RESOLVED, FeedbackStatus.CLOSED];
      const priorities = [FeedbackPriority.LOW, FeedbackPriority.MEDIUM, FeedbackPriority.HIGH, FeedbackPriority.URGENT];

      await prisma.feedbackIssue.create({
        data: {
          electionId: election.id,
          partId: part.id,
          issueName: `${category.name} - ${subCategory}`,
          issueDescription: `${subCategory} issue reported in ${part.boothName}`,
          category: category.name,
          subCategory,
          status: getRandomItem(statuses),
          priority: getRandomItem(priorities),
          reportedCount: getRandomNumber(1, 50),
          latitude: part.latitude! + (Math.random() - 0.5) * 0.01,
          longitude: part.longitude! + (Math.random() - 0.5) * 0.01,
        },
      });
    }
    console.log(`  ✅ Created 15 feedback issues for ${state}`);
  }

  // ========== Create Voter Slip Templates ==========
  console.log('\n📄 Creating voter slip templates...');

  for (const [state, election] of Object.entries(elections)) {
    await prisma.voterSlipTemplate.upsert({
      where: { id: `slip-default-${election.id}` },
      update: {},
      create: {
        id: `slip-default-${election.id}`,
        electionId: election.id,
        slipName: 'Default Voter Slip',
        printStatus: true,
        showCandidateInfo: true,
        showCandidateImage: true,
        paperSize: 'A4',
        orientation: 'portrait',
        slipsPerPage: 4,
        isDefault: true,
      },
    });
    console.log(`  ✅ Created voter slip template for ${state}`);
  }

  // ========== Create App Banners ==========
  console.log('\n🖼️ Creating app banners...');

  for (const [state, election] of Object.entries(elections)) {
    const banners = [
      { name: 'Campaign Banner 1', url: '/banners/campaign-1.jpg' },
      { name: 'Vote Appeal Banner', url: '/banners/vote-appeal.jpg' },
      { name: 'Scheme Awareness', url: '/banners/schemes.jpg' },
    ];

    for (const [index, banner] of banners.entries()) {
      await prisma.appBanner.create({
        data: {
          electionId: election.id,
          fileName: banner.name,
          fileUrl: banner.url,
          whatsappForward: index === 0,
          isActive: true,
          displayOrder: index + 1,
        },
      });
    }
    console.log(`  ✅ Created app banners for ${state}`);
  }

  // ========== Create DataCaffe Embeds ==========
  console.log('\n📊 Creating DataCaffe embeds...');

  for (const [state, tenant] of Object.entries(tenants)) {
    const election = elections[state];
    if (!election) continue;

    await prisma.dataCaffeEmbed.upsert({
      where: { id: `datacaffe-${tenant.slug}-main` },
      update: {},
      create: {
        id: `datacaffe-${tenant.slug}-main`,
        tenantId: tenant.id,
        electionId: election.id,
        embedName: 'Main Analytics Dashboard',
        embedUrl: `https://app.datacaffe.ai/embed/dashboard/${tenant.slug}`,
        embedType: 'dashboard',
        description: `Comprehensive election analytics for ${state}`,
        isActive: true,
        displayOrder: 1,
      },
    });
    console.log(`  ✅ Created DataCaffe embed for ${state}`);
  }

  // ========== Create AI Analytics Results ==========
  console.log('\n🤖 Creating AI analytics results...');

  for (const [state, election] of Object.entries(elections)) {
    const analysisTypes = [
      { type: 'VOTER_SENTIMENT' as const, name: 'Voter Sentiment Analysis' },
      { type: 'TURNOUT_PREDICTION' as const, name: 'Turnout Prediction' },
      { type: 'SWING_VOTER_ANALYSIS' as const, name: 'Swing Voter Analysis' },
      { type: 'BOOTH_RISK_ASSESSMENT' as const, name: 'Booth Risk Assessment' },
    ];

    for (const analysis of analysisTypes) {
      await prisma.aIAnalyticsResult.create({
        data: {
          electionId: election.id,
          analysisType: analysis.type,
          analysisName: analysis.name,
          description: `AI-powered ${analysis.name.toLowerCase()} for ${state}`,
          parameters: { region: state, confidence: 0.85 },
          results: {
            summary: `Analysis completed for ${state}`,
            data: { total: getRandomNumber(1000, 10000), positive: getRandomNumber(500, 8000) }
          },
          insights: [
            { insight: `Key finding 1 for ${state}`, confidence: 0.9 },
            { insight: `Key finding 2 for ${state}`, confidence: 0.85 },
          ],
          confidence: 0.87,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    }
    console.log(`  ✅ Created AI analytics for ${state}`);
  }

  // ========== Summary ==========
  console.log('\n\n🎉 ============ Database Seed Completed Successfully! ============\n');

  const totalTenants = await prisma.tenant.count();
  const totalUsers = await prisma.user.count();
  const totalElections = await prisma.election.count();
  const totalVoters = await prisma.voter.count();
  const totalParts = await prisma.part.count();
  const totalCadres = await prisma.cadre.count();
  const totalFamilies = await prisma.family.count();

  console.log('📋 Summary:');
  console.log(`   Tenants: ${totalTenants}`);
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Elections: ${totalElections}`);
  console.log(`   Parts/Booths: ${totalParts}`);
  console.log(`   Voters: ${totalVoters}`);
  console.log(`   Families: ${totalFamilies}`);
  console.log(`   Cadres: ${totalCadres}`);
  console.log('\n🔐 Super Admin Credentials (for Super Admin Portal):');
  console.log('   📧 Email: superadmin@electioncaffe.com');
  console.log('   🔑 Password: SuperAdmin@123');
  console.log('   🌐 Portal: http://localhost:5174');

  console.log('\n🔐 Tenant Admin Credentials (for Main App):');
  console.log('   📱 Mobile: 9876543210 (and incrementing for each state)');
  console.log('   🔑 Password: admin123');
  console.log('   🌐 Portal: http://localhost:5173');

  console.log('\n📍 States with data:');
  Object.keys(tenants).forEach(state => {
    console.log(`   - ${state}`);
  });

  console.log('\n📊 Database Architecture:');
  console.log('   - Super Admin Database: ElectionCaffe (Platform DB)');
  console.log('   - Contains: SuperAdmins, Tenants, FeatureFlags, SystemConfig');
  console.log('   - Tenant data can be in SHARED or DEDICATED databases');
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
